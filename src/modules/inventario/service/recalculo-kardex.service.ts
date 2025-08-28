import {
  Injectable,
  Logger,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { MovimientoDetalle } from '../../movimientos/entities/movimiento-detalle.entity';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { TipoMovimiento } from '../../movimientos/enum/tipo-movimiento.enum';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';
import { InventarioLoteService } from './inventario-lote.service';
import { InventarioService } from './inventario.service';

/**
 * Interfaz para el resultado del recálculo
 */
export interface ResultadoRecalculo {
  movimientosAfectados: number;
  lotesActualizados: number;
  inventariosActualizados: number;
  errores: string[];
  tiempoEjecucion: number;
}

/**
 * Servicio para recálculo de Kardex en movimientos retroactivos
 * Maneja la recalculación de costos y balances cuando se registran movimientos con fechas anteriores
 */
@Injectable()
export class RecalculoKardexService {
  private readonly logger = new Logger(RecalculoKardexService.name);

  constructor(
    @InjectRepository(Movimiento)
    private readonly movimientoRepository: Repository<Movimiento>,
    @InjectRepository(MovimientoDetalle)
    private readonly movimientoDetalleRepository: Repository<MovimientoDetalle>,
    @InjectRepository(InventarioLote)
    private readonly inventarioLoteRepository: Repository<InventarioLote>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    private readonly inventarioLoteService: InventarioLoteService,
    private readonly inventarioService: InventarioService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Recalcular Kardex para un movimiento retroactivo
   */
  async recalcularMovimientoRetroactivo(
    movimientoId: number,
    metodoValoracion: MetodoValoracion
  ): Promise<ResultadoRecalculo> {
    const tiempoInicio = Date.now();
    const resultado: ResultadoRecalculo = {
      movimientosAfectados: 0,
      lotesActualizados: 0,
      inventariosActualizados: 0,
      errores: [],
      tiempoEjecucion: 0
    };

    this.logger.log(`🔄 [RECALCULO-CORE] ===== INICIANDO RECÁLCULO KARDEX =====`);
    this.logger.log(`🔄 [RECALCULO-CORE] MovimientoId: ${movimientoId}, Método: ${metodoValoracion}`);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    this.logger.log(`🔗 [RECALCULO-CORE] Conexión de base de datos establecida`);
    
    await queryRunner.startTransaction();
    this.logger.log(`📝 [RECALCULO-CORE] Transacción iniciada`);

    try {
      this.logger.log(`🔍 [RECALCULO-CORE] Buscando movimiento ${movimientoId} con relaciones completas`);

      // Obtener el movimiento retroactivo
      const movimiento = await this.movimientoRepository.findOne({
        where: { id: movimientoId },
        relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen']
      });

      if (!movimiento) {
        this.logger.error(`❌ [RECALCULO-CORE] Movimiento ${movimientoId} NO ENCONTRADO`);
        throw new BadRequestException('Movimiento no encontrado');
      }
      
      this.logger.log(`✅ [RECALCULO-CORE] Movimiento encontrado: Fecha=${movimiento.fecha}, Detalles=${movimiento.detalles?.length || 0}`);
      
      if (!movimiento.detalles || movimiento.detalles.length === 0) {
        this.logger.warn(`⚠️ [RECALCULO-CORE] Movimiento ${movimientoId} no tiene detalles para procesar`);
        resultado.tiempoEjecucion = Date.now() - tiempoInicio;
        await queryRunner.commitTransaction();
        return resultado;
      }

      // Procesar cada detalle del movimiento
      this.logger.log(`🔄 [RECALCULO-CORE] Procesando ${movimiento.detalles.length} detalles del movimiento`);
      
      for (let i = 0; i < movimiento.detalles.length; i++) {
        const detalle = movimiento.detalles[i];
        this.logger.log(`📦 [RECALCULO-CORE] Procesando detalle ${i + 1}/${movimiento.detalles.length}: ProductoId=${detalle.inventario?.producto?.id}, AlmacenId=${detalle.inventario?.almacen?.id}, Cantidad=${detalle.cantidad}`);
        
        await this.recalcularDetalleMovimiento(
          detalle,
          movimiento.fecha,
          metodoValoracion,
          resultado,
          queryRunner
        );
        
        this.logger.log(`✅ [RECALCULO-CORE] Detalle ${i + 1} procesado exitosamente`);
      }

      this.logger.log(`💾 [RECALCULO-CORE] Confirmando transacción...`);
      await queryRunner.commitTransaction();
      this.logger.log(`✅ [RECALCULO-CORE] Transacción confirmada exitosamente`);
      
      resultado.tiempoEjecucion = Date.now() - tiempoInicio;
      
      this.logger.log(`🎉 [RECALCULO-CORE] ===== RECÁLCULO COMPLETADO =====`);
      this.logger.log(
        `📊 [RECALCULO-CORE] MÉTRICAS FINALES: ` +
        `Tiempo=${resultado.tiempoEjecucion}ms, ` +
        `Movimientos=${resultado.movimientosAfectados}, ` +
        `Lotes=${resultado.lotesActualizados}, ` +
        `Inventarios=${resultado.inventariosActualizados}, ` +
        `Errores=${resultado.errores.length}`
      );

      return resultado;
    } catch (error) {
      this.logger.error(`❌ [RECALCULO-CORE] ERROR CRÍTICO en recálculo: ${error.message}`);
      this.logger.error(`🔄 [RECALCULO-CORE] Ejecutando ROLLBACK de transacción...`);
      
      await queryRunner.rollbackTransaction();
      this.logger.error(`↩️ [RECALCULO-CORE] ROLLBACK completado`);
      
      resultado.errores.push(error.message);
      resultado.tiempoEjecucion = Date.now() - tiempoInicio;
      
      this.logger.error(`📊 [RECALCULO-CORE] MÉTRICAS DE ERROR: Tiempo=${resultado.tiempoEjecucion}ms, Errores=${resultado.errores.length}`);
      
      throw error;
    } finally {
      this.logger.log(`🔌 [RECALCULO-CORE] Liberando conexión de base de datos`);
      await queryRunner.release();
      this.logger.log(`✅ [RECALCULO-CORE] Conexión liberada`);
    }
  }

  /**
   * Recalcular un detalle específico del movimiento
   */
  private async recalcularDetalleMovimiento(
    detalle: MovimientoDetalle,
    fechaMovimiento: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    const { inventario } = detalle;
    const { producto, almacen } = inventario;

    // Determinar tipo de movimiento basado en la cantidad (positiva = entrada, negativa = salida)
    const esEntrada = detalle.cantidad > 0;
    const tipoMovimiento = esEntrada ? 'ENTRADA' : 'SALIDA';
    
    this.logger.log(`🔄 [RECALCULO-DETALLE] Procesando ${tipoMovimiento}: Producto='${producto.nombre}', Almacén='${almacen.nombre}', Cantidad=${detalle.cantidad}, Costo=${detalle.costoUnitario}`);

    try {
      if (esEntrada) {
        this.logger.log(`📥 [RECALCULO-DETALLE] Ejecutando recálculo de ENTRADA retroactiva`);
        await this.recalcularEntradaRetroactiva(
          detalle,
          fechaMovimiento,
          metodoValoracion,
          resultado,
          queryRunner
        );
        this.logger.log(`✅ [RECALCULO-DETALLE] Recálculo de ENTRADA completado`);
      } else {
        this.logger.log(`📤 [RECALCULO-DETALLE] Ejecutando recálculo de SALIDA retroactiva`);
        await this.recalcularSalidaRetroactiva(
          detalle,
          fechaMovimiento,
          metodoValoracion,
          resultado,
          queryRunner
        );
        this.logger.log(`✅ [RECALCULO-DETALLE] Recálculo de SALIDA completado`);
      }
    } catch (error) {
      this.logger.error(`❌ [RECALCULO-DETALLE] Error procesando ${tipoMovimiento} para producto '${producto.nombre}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Recalcular entrada retroactiva
   */
  private async recalcularEntradaRetroactiva(
    detalle: MovimientoDetalle,
    fechaMovimiento: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    const { inventario, cantidad, costoUnitario } = detalle;
    const { producto, almacen } = inventario;

    if (metodoValoracion === MetodoValoracion.PROMEDIO) {
      await this.recalcularEntradaPromedio(
        producto.id,
        almacen.id,
        fechaMovimiento,
        cantidad,
        costoUnitario,
        resultado,
        queryRunner
      );
    } else if (metodoValoracion === MetodoValoracion.FIFO) {
      await this.recalcularEntradaFIFO(
        producto.id,
        almacen.id,
        fechaMovimiento,
        cantidad,
        costoUnitario,
        detalle,
        resultado,
        queryRunner
      );
    }
  }

  /**
   * Recalcular salida retroactiva
   */
  private async recalcularSalidaRetroactiva(
    detalle: MovimientoDetalle,
    fechaMovimiento: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    const { inventario, cantidad } = detalle;
    const { producto, almacen } = inventario;
    const cantidadPositiva = Math.abs(cantidad); // Convertir a positivo para cálculos

    // Verificar disponibilidad de stock en la fecha retroactiva
    const stockDisponible = await this.verificarStockEnFecha(
      producto.id,
      almacen.id,
      fechaMovimiento,
      queryRunner
    );

    if (stockDisponible < cantidadPositiva) {
      const error = `Stock insuficiente en fecha ${fechaMovimiento.toISOString().split('T')[0]} ` +
                   `para producto ${producto.nombre}. Disponible: ${stockDisponible}, Requerido: ${cantidadPositiva}`;
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (metodoValoracion === MetodoValoracion.PROMEDIO) {
      await this.recalcularSalidaPromedio(
        producto.id,
        almacen.id,
        fechaMovimiento,
        cantidadPositiva,
        resultado,
        queryRunner
      );
    } else if (metodoValoracion === MetodoValoracion.FIFO) {
      await this.recalcularSalidaFIFO(
        producto.id,
        almacen.id,
        fechaMovimiento,
        cantidadPositiva,
        resultado,
        queryRunner
      );
    }
  }

  /**
   * Recalcular entrada con método PROMEDIO
   */
  private async recalcularEntradaPromedio(
    productoId: number,
    almacenId: number,
    fechaMovimiento: Date,
    cantidad: number,
    costoUnitario: number,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Obtener inventario actual
    const inventario = await this.inventarioRepository.findOne({
      where: { producto: { id: productoId }, almacen: { id: almacenId } }
    });

    if (!inventario) {
      resultado.errores.push(`No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
      return;
    }

    // Recalcular costo promedio ponderado
    const stockAnterior = inventario.stockActual - cantidad;
    const costoAnterior = inventario.costoPromedioActual;
    const valorAnterior = stockAnterior * costoAnterior;
    const valorNuevo = cantidad * costoUnitario;
    const stockTotal = stockAnterior + cantidad;
    
    const nuevoCostoPromedio = stockTotal > 0 ? (valorAnterior + valorNuevo) / stockTotal : 0;

    // Actualizar inventario
    await queryRunner.manager.update(
      Inventario,
      { id: inventario.id },
      { costoPromedioActual: nuevoCostoPromedio }
    );

    // Recalcular movimientos posteriores
    await this.recalcularMovimientosPosteriores(
      productoId,
      almacenId,
      fechaMovimiento,
      MetodoValoracion.PROMEDIO,
      resultado,
      queryRunner
    );

    resultado.inventariosActualizados++;
  }

  /**
   * Recalcular entrada con método FIFO
   */
  private async recalcularEntradaFIFO(
    productoId: number,
    almacenId: number,
    fechaMovimiento: Date,
    cantidad: number,
    costoUnitario: number,
    detalle: MovimientoDetalle,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Obtener el inventario para crear el lote
    const inventarioEntity = await queryRunner.manager.findOne(Inventario, {
      where: { producto: { id: productoId }, almacen: { id: almacenId } }
    });

    if (!inventarioEntity) {
      throw new BadRequestException(`No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
    }

    // Crear lote
    const lote = this.inventarioLoteRepository.create({
      inventario: inventarioEntity,
      fechaIngreso: fechaMovimiento,
      cantidadInicial: cantidad,
      cantidadActual: cantidad,
      costoUnitario: costoUnitario
    });

    await queryRunner.manager.save(InventarioLote, lote);

    // Reordenar lotes por fecha y recalcular consumos posteriores
    await this.reordenarLotesFIFO(
      productoId,
      almacenId,
      fechaMovimiento,
      resultado,
      queryRunner
    );

    resultado.lotesActualizados++;
  }

  /**
   * Recalcular salida con método PROMEDIO
   */
  private async recalcularSalidaPromedio(
    productoId: number,
    almacenId: number,
    fechaMovimiento: Date,
    cantidad: number,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Para PROMEDIO, solo necesitamos recalcular movimientos posteriores
    // ya que el costo se mantiene igual
    await this.recalcularMovimientosPosteriores(
      productoId,
      almacenId,
      fechaMovimiento,
      MetodoValoracion.PROMEDIO,
      resultado,
      queryRunner
    );
  }

  /**
   * Recalcular salida con método FIFO
   */
  private async recalcularSalidaFIFO(
    productoId: number,
    almacenId: number,
    fechaMovimiento: Date,
    cantidad: number,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Recalcular consumo de lotes desde la fecha retroactiva
    await this.recalcularConsumoLotesFIFO(
      productoId,
      almacenId,
      fechaMovimiento,
      cantidad,
      resultado,
      queryRunner
    );
  }

  /**
   * Verificar stock disponible en una fecha específica
   */
  private async verificarStockEnFecha(
    productoId: number,
    almacenId: number,
    fecha: Date,
    queryRunner: any
  ): Promise<number> {
    const result = await queryRunner.manager
      .createQueryBuilder(MovimientoDetalle, 'md')
      .select('SUM(CASE WHEN md.tipoMovimiento = :entrada THEN md.cantidad ELSE -md.cantidad END)', 'stock')
      .innerJoin('md.movimiento', 'm')
      .where('md.producto.id = :productoId', { productoId })
      .andWhere('md.almacen.id = :almacenId', { almacenId })
      .andWhere('m.fechaMovimiento <= :fecha', { fecha })
      .setParameter('entrada', TipoMovimiento.ENTRADA)
      .getRawOne();

    return parseFloat(result.stock) || 0;
  }

  /**
   * Recalcular movimientos posteriores a una fecha
   */
  private async recalcularMovimientosPosteriores(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    const movimientosPosteriores = await queryRunner.manager
      .createQueryBuilder(MovimientoDetalle, 'md')
      .innerJoin('md.movimiento', 'm')
      .innerJoin('md.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId })
      .andWhere('a.id = :almacenId', { almacenId })
      .andWhere('m.fecha > :fechaDesde', { fechaDesde })
      .orderBy('m.fecha', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .getMany();

    for (const detalle of movimientosPosteriores) {
      // Recalcular costo según el método
      if (metodoValoracion === MetodoValoracion.PROMEDIO && detalle.cantidad < 0) {
        await this.actualizarCostoPromedio(detalle, queryRunner);
      }
      resultado.movimientosAfectados++;
    }
  }

  /**
   * Reordenar lotes FIFO después de inserción retroactiva
   */
  private async reordenarLotesFIFO(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Obtener todos los lotes desde la fecha
    const lotes = await queryRunner.manager
      .createQueryBuilder(InventarioLote, 'il')
      .innerJoin('il.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId })
      .andWhere('a.id = :almacenId', { almacenId })
      .andWhere('il.fechaIngreso >= :fechaDesde', { fechaDesde })
      .orderBy('il.fechaIngreso', 'ASC')
      .addOrderBy('il.id', 'ASC')
      .getMany();

    // Recalcular consumos para todos los lotes afectados
    for (const lote of lotes) {
      await this.recalcularConsumoLote(lote, queryRunner);
      resultado.lotesActualizados++;
    }
  }

  /**
   * Recalcular consumo de lotes FIFO
   */
  private async recalcularConsumoLotesFIFO(
    productoId: number,
    almacenId: number,
    fechaMovimiento: Date,
    cantidad: number,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Implementar lógica de consumo FIFO retroactivo
    // Esto requiere recalcular todos los consumos desde la fecha retroactiva
    const lotes = await queryRunner.manager
      .createQueryBuilder(InventarioLote, 'il')
      .where('il.producto.id = :productoId', { productoId })
      .andWhere('il.almacen.id = :almacenId', { almacenId })
      .andWhere('il.fechaIngreso <= :fechaMovimiento', { fechaMovimiento })
      .andWhere('il.cantidadActual > 0')
      .orderBy('il.fechaIngreso', 'ASC')
      .getMany();

    let cantidadPendiente = cantidad;
    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;
      
      const cantidadAConsumir = Math.min(cantidadPendiente, lote.cantidadActual);
      lote.cantidadActual -= cantidadAConsumir;
      cantidadPendiente -= cantidadAConsumir;
      
      await queryRunner.manager.save(InventarioLote, lote);
      resultado.lotesActualizados++;
    }
  }

  /**
   * Actualizar costo promedio para un detalle
   */
  private async actualizarCostoPromedio(
    detalle: MovimientoDetalle,
    queryRunner: any
  ): Promise<void> {
    // Obtener costo promedio actual del inventario
    if (detalle.cantidad < 0) { // Es una salida
      // Actualizar costo unitario del detalle con el costo promedio actual
      await queryRunner.manager.update(
        MovimientoDetalle,
        { id: detalle.id },
        { costoUnitario: detalle.inventario.costoPromedioActual }
      );
    }
  }

  /**
   * Recalcular consumo de un lote específico
   */
  private async recalcularConsumoLote(
    lote: InventarioLote,
    queryRunner: any
  ): Promise<void> {
    // Resetear cantidad actual al inicial
    lote.cantidadActual = lote.cantidadInicial;

    // Recalcular consumos posteriores a la fecha del lote
    const consumos = await queryRunner.manager
      .createQueryBuilder(MovimientoDetalle, 'md')
      .innerJoin('md.movimiento', 'm')
      .innerJoin('md.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId: lote.inventario.producto.id })
      .andWhere('a.id = :almacenId', { almacenId: lote.inventario.almacen.id })
      .andWhere('md.cantidad < 0') // Salidas tienen cantidad negativa
      .andWhere('m.fecha >= :fechaLote', { fechaLote: lote.fechaIngreso })
      .orderBy('m.fecha', 'ASC')
      .getMany();

    // Aplicar consumos en orden FIFO
    for (const consumo of consumos) {
      if (lote.cantidadActual <= 0) break;
      
      const cantidadAConsumir = Math.min(Math.abs(consumo.cantidad), lote.cantidadActual);
      lote.cantidadActual -= cantidadAConsumir;
    }

    await queryRunner.manager.save(InventarioLote, lote);
  }
}