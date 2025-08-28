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

      // NUEVO: Ejecutar recálculo en cascada completo
      this.logger.log(`🔄 [RECALCULO-CORE] ===== INICIANDO RECÁLCULO EN CASCADA =====`);
      
      // Obtener todos los productos y almacenes únicos afectados
      const productosAlmacenesAfectados = new Set<string>();
      for (const detalle of movimiento.detalles) {
        const key = `${detalle.inventario.producto.id}-${detalle.inventario.almacen.id}`;
        productosAlmacenesAfectados.add(key);
      }

      this.logger.log(`📦 [RECALCULO-CORE] Productos/Almacenes únicos afectados: ${productosAlmacenesAfectados.size}`);

      // Recalcular lotes y movimientos posteriores para cada producto/almacén afectado
      for (const key of productosAlmacenesAfectados) {
        const [productoId, almacenId] = key.split('-').map(Number);
        
        this.logger.log(`🔄 [RECALCULO-CORE] Recalculando cascada para Producto ${productoId}, Almacén ${almacenId}`);
        
        // Crear savepoint para rollback parcial en caso de error
        const savepointName = `recalculo_${productoId}_${almacenId}_${Date.now()}`;
        await queryRunner.query(`SAVEPOINT ${savepointName}`);
        this.logger.log(`💾 [RECALCULO-CORE] Savepoint creado: ${savepointName}`);
        
        try {
          // 1. Recalcular todos los lotes desde la fecha del movimiento retroactivo
          await this.recalcularLotesDesde(
            productoId,
            almacenId,
            movimiento.fecha,
            metodoValoracion,
            resultado,
            queryRunner
          );
          
          // 2. Recalcular todos los movimientos posteriores
          await this.recalcularMovimientosPosteriores(
            productoId,
            almacenId,
            movimiento.fecha,
            metodoValoracion,
            resultado,
            queryRunner
          );
          
          // 3. Actualizar costos en comprobantes afectados
          await this.actualizarCostosComprobantes(
            productoId,
            almacenId,
            movimiento.fecha,
            resultado,
            queryRunner
          );
          
          // Liberar savepoint si todo fue exitoso
          await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
          this.logger.log(`✅ [RECALCULO-CORE] Cascada completada para Producto ${productoId}, Almacén ${almacenId}`);
        } catch (error) {
          // Rollback al savepoint en caso de error
          this.logger.error(`❌ [RECALCULO-CORE] Error en cascada para Producto ${productoId}, Almacén ${almacenId}: ${error.message}`);
          await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          this.logger.log(`↩️ [RECALCULO-CORE] Rollback al savepoint ${savepointName} completado`);
          
          resultado.errores.push(`Error en recálculo de Producto ${productoId}, Almacén ${almacenId}: ${error.message}`);
          
          // Decidir si continuar con otros productos o fallar completamente
          if (productosAlmacenesAfectados.size === 1) {
            // Si solo hay un producto/almacén, fallar completamente
            throw error;
          } else {
            // Si hay múltiples, continuar con los demás pero registrar el error
            this.logger.warn(`⚠️ [RECALCULO-CORE] Continuando con otros productos después del error en Producto ${productoId}, Almacén ${almacenId}`);
          }
        }
       }
      
      this.logger.log(`🎉 [RECALCULO-CORE] ===== RECÁLCULO EN CASCADA COMPLETADO =====`);

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
   * Recalcular movimientos posteriores a una fecha de manera robusta
   * Este método recalcula todos los movimientos de salida posteriores con los nuevos costos
   */
  async recalcularMovimientosPosteriores(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Validaciones de entrada
    if (!productoId || productoId <= 0) {
      const error = `ProductoId inválido para recálculo de movimientos: ${productoId}`;
      this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (!almacenId || almacenId <= 0) {
      const error = `AlmacenId inválido para recálculo de movimientos: ${almacenId}`;
      this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (!fechaDesde || isNaN(fechaDesde.getTime())) {
      const error = `Fecha inválida para recálculo de movimientos: ${fechaDesde}`;
      this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    this.logger.log(`🔄 [RECALCULO-MOVIMIENTOS] Iniciando recálculo de movimientos posteriores desde ${fechaDesde.toISOString().split('T')[0]} para producto ${productoId} en almacén ${almacenId}`);

    try {
      // Obtener todos los movimientos posteriores (entradas y salidas)
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

      this.logger.log(`📦 [RECALCULO-MOVIMIENTOS] Encontrados ${movimientosPosteriores.length} movimientos posteriores para recalcular`);

      if (metodoValoracion === MetodoValoracion.PROMEDIO) {
        await this.recalcularMovimientosPromedioPosteriores(
          productoId,
          almacenId,
          movimientosPosteriores,
          resultado,
          queryRunner
        );
      } else if (metodoValoracion === MetodoValoracion.FIFO) {
        await this.recalcularMovimientosFIFOPosteriores(
          productoId,
          almacenId,
          movimientosPosteriores,
          resultado,
          queryRunner
        );
      } else {
        const error = `Método de valoración no soportado para recálculo de movimientos: ${metodoValoracion}`;
        this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] ${error}`);
        resultado.errores.push(error);
        throw new BadRequestException(error);
      }

      this.logger.log(`✅ [RECALCULO-MOVIMIENTOS] Recálculo de movimientos posteriores completado`);
    } catch (error) {
      this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] Error en recálculo de movimientos posteriores: ${error.message}`);
      resultado.errores.push(`Error en recálculo de movimientos posteriores: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recalcular movimientos posteriores con método PROMEDIO
   */
  private async recalcularMovimientosPromedioPosteriores(
    productoId: number,
    almacenId: number,
    movimientos: MovimientoDetalle[],
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`📊 [RECALCULO-MOVIMIENTOS] Recalculando ${movimientos.length} movimientos con método PROMEDIO`);

    // Obtener inventario actual
    const inventario = await queryRunner.manager.findOne(Inventario, {
      where: { producto: { id: productoId }, almacen: { id: almacenId } },
      relations: ['producto', 'almacen']
    });

    if (!inventario) {
      this.logger.error(`❌ [RECALCULO-MOVIMIENTOS] No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
      resultado.errores.push(`No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
      return;
    }

    let stockAcumulado = inventario.stockActual;
    let valorAcumulado = stockAcumulado * inventario.costoPromedioActual;
    let costoPromedioActual = inventario.costoPromedioActual;

    for (const movimiento of movimientos) {
      const esEntrada = movimiento.cantidad > 0;
      const cantidad = Math.abs(movimiento.cantidad);
      const costoOriginal = movimiento.costoUnitario;

      if (esEntrada) {
        // Para entradas, recalcular el costo promedio
        const nuevoValor = cantidad * costoOriginal;
        stockAcumulado += cantidad;
        valorAcumulado += nuevoValor;
        costoPromedioActual = stockAcumulado > 0 ? valorAcumulado / stockAcumulado : 0;

        this.logger.log(`📈 [RECALCULO-MOVIMIENTOS] Entrada: +${cantidad} a ${costoOriginal} | Nuevo promedio: ${costoPromedioActual}`);

        // Actualizar inventario con nuevo costo promedio
        await queryRunner.manager.update(
          Inventario,
          { id: inventario.id },
          { costoPromedioActual }
        );
      } else {
        // Para salidas, actualizar con el costo promedio actual
        const nuevoCostoUnitario = costoPromedioActual;
        stockAcumulado -= cantidad;
        valorAcumulado -= cantidad * nuevoCostoUnitario;

        this.logger.log(`📤 [RECALCULO-MOVIMIENTOS] Salida: -${cantidad} a ${nuevoCostoUnitario} (era ${costoOriginal}) | Stock restante: ${stockAcumulado}`);

        // Actualizar el costo unitario del movimiento
        await queryRunner.manager.update(
          MovimientoDetalle,
          { id: movimiento.id },
          { costoUnitario: nuevoCostoUnitario }
        );
      }

      resultado.movimientosAfectados++;
    }

    this.logger.log(`✅ [RECALCULO-MOVIMIENTOS] Costo promedio final: ${costoPromedioActual}, Stock final: ${stockAcumulado}`);
  }

  /**
   * Recalcular movimientos posteriores con método FIFO
   */
  private async recalcularMovimientosFIFOPosteriores(
    productoId: number,
    almacenId: number,
    movimientos: MovimientoDetalle[],
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`📦 [RECALCULO-MOVIMIENTOS] Recalculando ${movimientos.length} movimientos con método FIFO`);

    for (const movimiento of movimientos) {
      const esEntrada = movimiento.cantidad > 0;
      const cantidad = Math.abs(movimiento.cantidad);

      if (esEntrada) {
        // Para entradas FIFO, crear o actualizar lote
        await this.procesarEntradaFIFO(
          productoId,
          almacenId,
          movimiento,
          resultado,
          queryRunner
        );
      } else {
        // Para salidas FIFO, recalcular consumo de lotes
        await this.procesarSalidaFIFO(
          productoId,
          almacenId,
          movimiento,
          cantidad,
          resultado,
          queryRunner
        );
      }

      resultado.movimientosAfectados++;
    }
  }

  /**
   * Procesar entrada FIFO para movimientos posteriores
   */
  private async procesarEntradaFIFO(
    productoId: number,
    almacenId: number,
    movimiento: MovimientoDetalle,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Verificar si ya existe un lote para este movimiento
    const loteExistente = await queryRunner.manager.findOne(InventarioLote, {
      where: {
        inventario: { producto: { id: productoId }, almacen: { id: almacenId } },
        fechaIngreso: movimiento.movimiento.fecha,
        costoUnitario: movimiento.costoUnitario
      }
    });

    if (!loteExistente) {
      // Crear nuevo lote
      const inventario = await queryRunner.manager.findOne(Inventario, {
        where: { producto: { id: productoId }, almacen: { id: almacenId } }
      });

      if (inventario) {
        const nuevoLote = queryRunner.manager.create(InventarioLote, {
          inventario,
          fechaIngreso: movimiento.movimiento.fecha,
          cantidadInicial: movimiento.cantidad,
          cantidadActual: movimiento.cantidad,
          costoUnitario: movimiento.costoUnitario
        });

        await queryRunner.manager.save(InventarioLote, nuevoLote);
        resultado.lotesActualizados++;

        this.logger.log(`📦 [RECALCULO-MOVIMIENTOS] Nuevo lote FIFO creado: ${movimiento.cantidad} unidades a ${movimiento.costoUnitario}`);
      }
    }
  }

  /**
   * Procesar salida FIFO para movimientos posteriores
   */
  private async procesarSalidaFIFO(
    productoId: number,
    almacenId: number,
    movimiento: MovimientoDetalle,
    cantidad: number,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Obtener lotes disponibles en orden FIFO
    const lotes = await queryRunner.manager
      .createQueryBuilder(InventarioLote, 'il')
      .innerJoin('il.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId })
      .andWhere('a.id = :almacenId', { almacenId })
      .andWhere('il.fechaIngreso <= :fechaMovimiento', { fechaMovimiento: movimiento.movimiento.fecha })
      .andWhere('il.cantidadActual > 0')
      .orderBy('il.fechaIngreso', 'ASC')
      .addOrderBy('il.id', 'ASC')
      .getMany();

    let cantidadPendiente = cantidad;
    let costoTotalSalida = 0;

    // Consumir lotes en orden FIFO
    for (const lote of lotes) {
      if (cantidadPendiente <= 0) break;

      const cantidadAConsumir = Math.min(cantidadPendiente, lote.cantidadActual);
      costoTotalSalida += cantidadAConsumir * lote.costoUnitario;
      
      lote.cantidadActual -= cantidadAConsumir;
      cantidadPendiente -= cantidadAConsumir;

      await queryRunner.manager.save(InventarioLote, lote);
      resultado.lotesActualizados++;

      this.logger.log(`📤 [RECALCULO-MOVIMIENTOS] Consumido del lote: ${cantidadAConsumir} unidades a ${lote.costoUnitario}`);
    }

    // Actualizar costo unitario del movimiento con el costo promedio ponderado de los lotes consumidos
    const nuevoCostoUnitario = cantidad > 0 ? costoTotalSalida / cantidad : 0;
    
    await queryRunner.manager.update(
      MovimientoDetalle,
      { id: movimiento.id },
      { costoUnitario: nuevoCostoUnitario }
    );

    this.logger.log(`📤 [RECALCULO-MOVIMIENTOS] Salida FIFO actualizada: ${cantidad} unidades a costo promedio ${nuevoCostoUnitario}`);
  }

  /**
   * Actualizar costos en comprobantes afectados por el recálculo
   * Este método actualiza los totales de los comprobantes cuando los costos de inventario cambian
   */
  async actualizarCostosComprobantes(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`💰 [ACTUALIZAR-COMPROBANTES] Iniciando actualización de costos en comprobantes desde ${fechaDesde.toISOString().split('T')[0]}`);

    try {
      // Obtener movimientos afectados con sus comprobantes
      const movimientosAfectados = await queryRunner.manager
        .createQueryBuilder(MovimientoDetalle, 'md')
        .innerJoin('md.movimiento', 'm')
        .innerJoin('md.inventario', 'inv')
        .innerJoin('inv.producto', 'p')
        .innerJoin('inv.almacen', 'a')
        .leftJoin('m.comprobante', 'comp')
        .select([
          'md.id',
          'md.cantidad',
          'md.costoUnitario',
          'm.id',
          'm.fecha',
          'comp.id',
          'comp.total',
          'comp.subtotal'
        ])
        .where('p.id = :productoId', { productoId })
        .andWhere('a.id = :almacenId', { almacenId })
        .andWhere('m.fecha >= :fechaDesde', { fechaDesde })
        .andWhere('comp.id IS NOT NULL') // Solo movimientos con comprobante
        .orderBy('m.fecha', 'ASC')
        .getMany();

      this.logger.log(`📋 [ACTUALIZAR-COMPROBANTES] Encontrados ${movimientosAfectados.length} movimientos con comprobantes para actualizar`);

      // Agrupar por comprobante para recalcular totales
      const comprobantesPorActualizar = new Map<number, {
        comprobante: any;
        detalles: any[];
      }>();

      for (const movimiento of movimientosAfectados) {
        const comprobanteId = movimiento.movimiento.comprobante?.id;
        if (comprobanteId) {
          if (!comprobantesPorActualizar.has(comprobanteId)) {
            comprobantesPorActualizar.set(comprobanteId, {
              comprobante: movimiento.movimiento.comprobante,
              detalles: []
            });
          }
          comprobantesPorActualizar.get(comprobanteId)!.detalles.push(movimiento);
        }
      }

      this.logger.log(`📊 [ACTUALIZAR-COMPROBANTES] Comprobantes únicos a actualizar: ${comprobantesPorActualizar.size}`);

      // Actualizar cada comprobante
      for (const [comprobanteId, { comprobante, detalles }] of comprobantesPorActualizar) {
        await this.recalcularTotalesComprobante(
          comprobanteId,
          detalles,
          resultado,
          queryRunner
        );
      }

      this.logger.log(`✅ [ACTUALIZAR-COMPROBANTES] Actualización de comprobantes completada`);
    } catch (error) {
      this.logger.error(`❌ [ACTUALIZAR-COMPROBANTES] Error actualizando comprobantes: ${error.message}`);
      resultado.errores.push(`Error actualizando comprobantes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recalcular totales de un comprobante específico
   */
  private async recalcularTotalesComprobante(
    comprobanteId: number,
    detallesAfectados: any[],
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`💰 [RECALCULAR-COMPROBANTE] Recalculando totales del comprobante ${comprobanteId}`);

    try {
      // Obtener todos los detalles del comprobante (no solo los afectados)
      const todosLosDetalles = await queryRunner.manager
        .createQueryBuilder(MovimientoDetalle, 'md')
        .innerJoin('md.movimiento', 'm')
        .innerJoin('m.comprobante', 'comp')
        .where('comp.id = :comprobanteId', { comprobanteId })
        .getMany();

      // Calcular nuevo subtotal basado en costos actualizados
      let nuevoSubtotal = 0;
      for (const detalle of todosLosDetalles) {
        const valorLinea = Math.abs(detalle.cantidad) * detalle.costoUnitario;
        nuevoSubtotal += valorLinea;
      }

      // Obtener el comprobante actual para calcular impuestos
      const comprobante = await queryRunner.manager.findOne('Comprobante', {
        where: { id: comprobanteId }
      });

      if (comprobante) {
        // Calcular impuestos (asumiendo que el porcentaje de impuesto se mantiene)
        const porcentajeImpuesto = comprobante.total > 0 && comprobante.subtotal > 0 
          ? ((comprobante.total - comprobante.subtotal) / comprobante.subtotal) 
          : 0;
        
        const nuevoImpuesto = nuevoSubtotal * porcentajeImpuesto;
        const nuevoTotal = nuevoSubtotal + nuevoImpuesto;

        this.logger.log(`💰 [RECALCULAR-COMPROBANTE] Comprobante ${comprobanteId}: Subtotal ${comprobante.subtotal} → ${nuevoSubtotal}, Total ${comprobante.total} → ${nuevoTotal}`);

        // Actualizar el comprobante
        await queryRunner.manager.update(
          'Comprobante',
          { id: comprobanteId },
          {
            subtotal: nuevoSubtotal,
            total: nuevoTotal,
            fechaActualizacion: new Date()
          }
        );

        resultado.movimientosAfectados++;
        this.logger.log(`✅ [RECALCULAR-COMPROBANTE] Comprobante ${comprobanteId} actualizado exitosamente`);
      } else {
        this.logger.warn(`⚠️ [RECALCULAR-COMPROBANTE] Comprobante ${comprobanteId} no encontrado`);
      }
    } catch (error) {
      this.logger.error(`❌ [RECALCULAR-COMPROBANTE] Error recalculando comprobante ${comprobanteId}: ${error.message}`);
      throw error;
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
   * Recalcular todos los lotes desde una fecha específica
   * Este método es fundamental para el recálculo en cascada
   */
  async recalcularLotesDesde(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    metodoValoracion: MetodoValoracion,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    // Validaciones de entrada
    if (!productoId || productoId <= 0) {
      const error = `ProductoId inválido: ${productoId}`;
      this.logger.error(`❌ [RECALCULO-LOTES] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (!almacenId || almacenId <= 0) {
      const error = `AlmacenId inválido: ${almacenId}`;
      this.logger.error(`❌ [RECALCULO-LOTES] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (!fechaDesde || isNaN(fechaDesde.getTime())) {
      const error = `Fecha inválida: ${fechaDesde}`;
      this.logger.error(`❌ [RECALCULO-LOTES] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    if (!Object.values(MetodoValoracion).includes(metodoValoracion)) {
      const error = `Método de valoración inválido: ${metodoValoracion}`;
      this.logger.error(`❌ [RECALCULO-LOTES] ${error}`);
      resultado.errores.push(error);
      throw new BadRequestException(error);
    }

    this.logger.log(`🔄 [RECALCULO-LOTES] Iniciando recálculo de lotes desde ${fechaDesde.toISOString().split('T')[0]} para producto ${productoId} en almacén ${almacenId}`);

    try {
      // Verificar que el inventario existe
      const inventario = await queryRunner.manager.findOne(Inventario, {
        where: { producto: { id: productoId }, almacen: { id: almacenId } },
        relations: ['producto', 'almacen']
      });

      if (!inventario) {
        const error = `No se encontró inventario para producto ${productoId} en almacén ${almacenId}`;
        this.logger.error(`❌ [RECALCULO-LOTES] ${error}`);
        resultado.errores.push(error);
        throw new BadRequestException(error);
      }

      if (metodoValoracion === MetodoValoracion.PROMEDIO) {
        await this.recalcularLotesPromedioDesde(productoId, almacenId, fechaDesde, resultado, queryRunner);
      } else if (metodoValoracion === MetodoValoracion.FIFO) {
        await this.recalcularLotesFIFODesde(productoId, almacenId, fechaDesde, resultado, queryRunner);
      }

      this.logger.log(`✅ [RECALCULO-LOTES] Recálculo de lotes completado`);
    } catch (error) {
      this.logger.error(`❌ [RECALCULO-LOTES] Error en recálculo de lotes: ${error.message}`);
      resultado.errores.push(`Error en recálculo de lotes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recalcular lotes con método PROMEDIO desde una fecha específica
   */
  private async recalcularLotesPromedioDesde(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`📊 [RECALCULO-LOTES] Recalculando costo promedio desde ${fechaDesde.toISOString().split('T')[0]}`);

    // Obtener inventario
    const inventario = await queryRunner.manager.findOne(Inventario, {
      where: { producto: { id: productoId }, almacen: { id: almacenId } },
      relations: ['producto', 'almacen']
    });

    if (!inventario) {
      this.logger.error(`❌ [RECALCULO-LOTES] No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
      resultado.errores.push(`No se encontró inventario para producto ${productoId} en almacén ${almacenId}`);
      return;
    }

    // Obtener todos los movimientos de entrada desde la fecha retroactiva
    const movimientosEntrada = await queryRunner.manager
      .createQueryBuilder(MovimientoDetalle, 'md')
      .innerJoin('md.movimiento', 'm')
      .innerJoin('md.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId })
      .andWhere('a.id = :almacenId', { almacenId })
      .andWhere('md.cantidad > 0') // Solo entradas
      .andWhere('m.fecha >= :fechaDesde', { fechaDesde })
      .orderBy('m.fecha', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .getMany();

    this.logger.log(`📦 [RECALCULO-LOTES] Encontrados ${movimientosEntrada.length} movimientos de entrada para recalcular`);

    // Recalcular costo promedio acumulativo
    let stockAcumulado = 0;
    let valorAcumulado = 0;

    // Obtener stock y valor inicial hasta la fecha retroactiva
    const stockInicial = await this.obtenerStockHastaFecha(productoId, almacenId, fechaDesde, queryRunner);
    const costoInicialPromedio = inventario.costoPromedioActual;
    
    stockAcumulado = stockInicial;
    valorAcumulado = stockInicial * costoInicialPromedio;

    this.logger.log(`📊 [RECALCULO-LOTES] Stock inicial: ${stockInicial}, Valor inicial: ${valorAcumulado}, Costo promedio inicial: ${costoInicialPromedio}`);

    // Procesar cada entrada y recalcular promedio
    for (const entrada of movimientosEntrada) {
      const nuevaCantidad = entrada.cantidad;
      const nuevoCosto = entrada.costoUnitario;
      const nuevoValor = nuevaCantidad * nuevoCosto;

      stockAcumulado += nuevaCantidad;
      valorAcumulado += nuevoValor;

      const nuevoCostoPromedio = stockAcumulado > 0 ? valorAcumulado / stockAcumulado : 0;

      this.logger.log(`📈 [RECALCULO-LOTES] Entrada: +${nuevaCantidad} a ${nuevoCosto} | Stock: ${stockAcumulado}, Valor: ${valorAcumulado}, Nuevo promedio: ${nuevoCostoPromedio}`);

      // Actualizar inventario con nuevo costo promedio
      await queryRunner.manager.update(
        Inventario,
        { id: inventario.id },
        { costoPromedioActual: nuevoCostoPromedio }
      );

      resultado.inventariosActualizados++;
    }

    this.logger.log(`✅ [RECALCULO-LOTES] Costo promedio final: ${stockAcumulado > 0 ? valorAcumulado / stockAcumulado : 0}`);
  }

  /**
   * Recalcular lotes con método FIFO desde una fecha específica
   */
  private async recalcularLotesFIFODesde(
    productoId: number,
    almacenId: number,
    fechaDesde: Date,
    resultado: ResultadoRecalculo,
    queryRunner: any
  ): Promise<void> {
    this.logger.log(`📦 [RECALCULO-LOTES] Recalculando lotes FIFO desde ${fechaDesde.toISOString().split('T')[0]}`);

    // Obtener todos los lotes desde la fecha retroactiva
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

    this.logger.log(`📦 [RECALCULO-LOTES] Encontrados ${lotes.length} lotes para recalcular`);

    // Resetear y recalcular cada lote
    for (const lote of lotes) {
      await this.recalcularConsumoLote(lote, queryRunner);
      resultado.lotesActualizados++;
      this.logger.log(`✅ [RECALCULO-LOTES] Lote recalculado: Fecha=${lote.fechaIngreso.toISOString().split('T')[0]}, Inicial=${lote.cantidadInicial}, Actual=${lote.cantidadActual}`);
    }
  }

  /**
   * Obtener stock acumulado hasta una fecha específica
   */
  private async obtenerStockHastaFecha(
    productoId: number,
    almacenId: number,
    fecha: Date,
    queryRunner: any
  ): Promise<number> {
    const result = await queryRunner.manager
      .createQueryBuilder(MovimientoDetalle, 'md')
      .select('SUM(md.cantidad)', 'stock')
      .innerJoin('md.movimiento', 'm')
      .innerJoin('md.inventario', 'inv')
      .innerJoin('inv.producto', 'p')
      .innerJoin('inv.almacen', 'a')
      .where('p.id = :productoId', { productoId })
      .andWhere('a.id = :almacenId', { almacenId })
      .andWhere('m.fecha < :fecha', { fecha })
      .getRawOne();

    return parseFloat(result.stock) || 0;
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