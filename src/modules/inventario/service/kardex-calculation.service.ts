import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { MovimientoDetalle } from '../../movimientos/entities/movimiento-detalle.entity';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { TipoMovimiento } from '../../movimientos/enum/tipo-movimiento.enum';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';
import { StockCalculationService } from './stock-calculation.service';

/**
 * Interfaz para un movimiento de Kardex calculado dinámicamente
 */
export interface KardexMovement {
  fecha: Date;
  tipoOperacion: TipoOperacion;
  tipoMovimiento: TipoMovimiento;
  tipoComprobante?: string;
  numeroComprobante?: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  cantidadSaldo: number;
  costoUnitarioSaldo: number;
  valorTotalSaldo: number;
  idInventario: number;
  idMovimiento: number;
  idMovimientoDetalle: number;
  detallesSalida?: DetalleSalidaCalculado[];
}

/**
 * Interfaz para detalles de salida calculados dinámicamente
 */
export interface DetalleSalidaCalculado {
  idLote: number;
  cantidad: number;
  costoUnitarioDeLote: number;
  costoTotal: number;
}

/**
 * Interfaz para el resultado completo del Kardex
 */
export interface KardexResult {
  idInventario: number;
  producto: {
    id: number;
    codigo: string;
    nombre: string;
    unidadMedida: string;
  };
  almacen: {
    id: number;
    nombre: string;
  };
  movimientos: KardexMovement[];
  stockFinal: number;
  costoUnitarioFinal: number;
  valorTotalFinal: number;
}

/**
 * Servicio para cálculo dinámico completo del Kardex
 * Genera reportes de Kardex sin depender de datos precalculados
 */
@Injectable()
export class KardexCalculationService {
  // Estado temporal para el cálculo FIFO durante el procesamiento del Kardex
  private lotesDisponiblesTemporales: Map<
    number,
    { cantidadDisponible: number; costoUnitario: number; fechaIngreso: Date }
  > = new Map();

  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    @InjectRepository(InventarioLote)
    private readonly loteRepository: Repository<InventarioLote>,
    @InjectRepository(Movimiento)
    private readonly movimientoRepository: Repository<Movimiento>,
    @InjectRepository(MovimientoDetalle)
    private readonly movimientoDetalleRepository: Repository<MovimientoDetalle>,
    private readonly stockCalculationService: StockCalculationService,
  ) {}

  /**
   * Genera el Kardex completo para un inventario específico
   * @param idInventario ID del inventario
   * @param fechaDesde Fecha de inicio del período
   * @param fechaHasta Fecha de fin del período
   * @param metodoValoracion Método de valoración (PROMEDIO o FIFO)
   * @returns Kardex calculado dinámicamente
   */
  async generarKardex(
    idInventario: number,
    fechaDesde: Date,
    fechaHasta: Date,
    metodoValoracion: MetodoValoracion,
  ): Promise<KardexResult | null> {
    // Verificar que el inventario existe y obtener información del producto y almacén
    const inventario = await this.inventarioRepository.findOne({
      where: { id: idInventario },
      relations: ['producto', 'almacen'],
    });

    if (!inventario) {
      return null;
    }

    // Obtener todos los movimientos del inventario en el período
    const movimientos = await this.obtenerMovimientosInventario(
      idInventario,
      fechaDesde,
      fechaHasta,
    );

    // Calcular saldo inicial (movimientos anteriores a fechaDesde)
    const saldoInicial = await this.calcularSaldoInicial(
      idInventario,
      fechaDesde,
      metodoValoracion,
    );

    // Procesar movimientos según el método de valoración
    const movimientosKardex = await this.procesarMovimientos(
      movimientos,
      saldoInicial,
      metodoValoracion,
      idInventario,
    );

    // Calcular valores finales
    const ultimoMovimiento = movimientosKardex[movimientosKardex.length - 1];
    const stockFinal = ultimoMovimiento?.cantidadSaldo || saldoInicial.cantidad;
    const costoUnitarioFinal =
      ultimoMovimiento?.costoUnitarioSaldo || saldoInicial.costoUnitario;
    const valorTotalFinal = stockFinal * costoUnitarioFinal;

    return {
      idInventario,
      producto: {
        id: inventario.producto.id,
        codigo: inventario.producto.codigo,
        nombre: inventario.producto.nombre,
        unidadMedida: inventario.producto.unidadMedida,
      },
      almacen: {
        id: inventario.almacen.id,
        nombre: inventario.almacen.nombre,
      },
      movimientos: movimientosKardex,
      stockFinal,
      costoUnitarioFinal,
      valorTotalFinal,
    };
  }

  /**
   * Obtiene todos los movimientos de un inventario en un período específico
   */
  private async obtenerMovimientosInventario(
    idInventario: number,
    fechaDesde: Date,
    fechaHasta: Date,
  ): Promise<any[]> {
    const movimientos = await this.movimientoDetalleRepository
      .createQueryBuilder('md')
      .innerJoin('md.movimiento', 'm')
      .leftJoin('m.comprobante', 'c')
      .where('md.idInventario = :idInventario', { idInventario })
      .andWhere('m.fecha >= :fechaDesde', { fechaDesde })
      .andWhere('m.fecha <= :fechaHasta', { fechaHasta })
      .andWhere('m.estado = :estado', { estado: 'PROCESADO' })
      .select([
        'md.id as idMovimientoDetalle',
        'md.cantidad',
        'md.idLote',
        'md.idInventario',
        'm.id as idMovimiento',
        'm.tipo as tipoMovimiento',
        'm.fecha',
        'm.numeroDocumento',
        'c.tipoOperacion',
        'c.tipoComprobante',
        'c.correlativo',
      ])
      .orderBy('m.fecha', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .getRawMany();

    console.log(
      '🔍 DEBUG obtenerMovimientosInventario - Total movimientos encontrados:',
      movimientos.length,
    );
    console.log(
      '🔍 DEBUG obtenerMovimientosInventario - Primeros 5 movimientos:',
      movimientos.slice(0, 5).map((m) => ({
        idMovimientoDetalle: m.idmovimientodetalle,
        idMovimiento: m.idmovimiento,
        fecha: m.m_fecha,
        tipo: m.tipomovimiento,
        cantidad: m.md_cantidad,
      })),
    );

    return movimientos;
  }

  /**
   * Calcula el saldo inicial antes del período de consulta
   */
  private async calcularSaldoInicial(
    idInventario: number,
    fechaDesde: Date,
    metodoValoracion: MetodoValoracion,
  ): Promise<{ cantidad: number; costoUnitario: number; valorTotal: number }> {
    // Obtener stock hasta la fecha de inicio (un día antes)
    const fechaAnterior = new Date(fechaDesde);
    fechaAnterior.setDate(fechaAnterior.getDate() - 1);
    fechaAnterior.setHours(23, 59, 59, 999); // Final del día anterior

    const stockInventario =
      await this.stockCalculationService.calcularStockInventario(
        idInventario,
        fechaAnterior,
      );

    if (!stockInventario || stockInventario.stockActual <= 0) {
      return { cantidad: 0, costoUnitario: 0, valorTotal: 0 };
    }

    const cantidad = stockInventario.stockActual;
    const costoUnitario = stockInventario.costoPromedioActual;
    const valorTotal = cantidad * costoUnitario;

    return { cantidad, costoUnitario, valorTotal };
  }

  /**
   * Procesa los movimientos aplicando el método de valoración correspondiente
   */
  private async procesarMovimientos(
    movimientos: any[],
    saldoInicial: {
      cantidad: number;
      costoUnitario: number;
      valorTotal: number;
    },
    metodoValoracion: MetodoValoracion,
    idInventario: number,
  ): Promise<KardexMovement[]> {
    console.log(
      '🔍 DEBUG procesarMovimientos - Iniciando procesamiento con',
      movimientos.length,
      'movimientos',
    );
    console.log(
      '🔍 DEBUG procesarMovimientos - Método de valoración:',
      metodoValoracion,
    );

    const movimientosKardex: KardexMovement[] = [];
    let saldoActual = { ...saldoInicial };

    // Inicializar estado temporal de lotes para FIFO
    if (metodoValoracion === MetodoValoracion.fifo) {
      await this.inicializarLotesTemporales(
        idInventario,
        movimientos[0]?.fecha || new Date(),
      );
    }

    for (let i = 0; i < movimientos.length; i++) {
      const mov = movimientos[i];
      console.log(
        `🔍 DEBUG procesarMovimientos - Procesando movimiento ${i + 1}/${movimientos.length}:`,
        {
          idMovimientoDetalle: mov.idmovimientodetalle,
          idMovimiento: mov.idmovimiento,
          fecha: mov.m_fecha,
          tipo: mov.tipomovimiento,
          cantidad: mov.md_cantidad,
        },
      );

      const esEntrada = this.esMovimientoEntrada(
        mov.tipomovimiento,
        mov.c_tipoOperacion,
      );

      let movimientoKardex: KardexMovement;

      if (esEntrada) {
        console.log('🔍 DEBUG procesarMovimientos - Procesando como ENTRADA');
        movimientoKardex = await this.procesarEntrada(
          mov,
          saldoActual,
          metodoValoracion,
        );

        // Actualizar lotes temporales para FIFO en entradas
        if (metodoValoracion === MetodoValoracion.fifo && mov.idLote) {
          this.actualizarLoteTemporalEntrada(
            mov.idLote,
            mov.cantidad,
            mov.costoUnitario,
            mov.fecha,
          );
        }
      } else {
        console.log('🔍 DEBUG procesarMovimientos - Procesando como SALIDA');
        const resultado = await this.procesarSalida(
          mov,
          saldoActual,
          metodoValoracion,
          idInventario,
        );

        // Manejar el caso en que procesarSalida devuelve un array (FIFO con múltiples lotes)
        if (Array.isArray(resultado)) {
          console.log(
            '🔍 DEBUG procesarMovimientos - Salida FIFO con múltiples lotes:',
            resultado.length,
          );
          // Agregar todos los movimientos al kardex
          movimientosKardex.push(...resultado);
          // Actualizar saldo con el último movimiento del array
          const ultimoMovimiento = resultado[resultado.length - 1];
          saldoActual = {
            cantidad: ultimoMovimiento.cantidadSaldo,
            costoUnitario: ultimoMovimiento.costoUnitarioSaldo,
            valorTotal: ultimoMovimiento.valorTotalSaldo,
          };
          // Continuar con el siguiente movimiento
          continue;
        } else {
          // Caso normal (un solo movimiento)
          movimientoKardex = resultado;
        }
      }

      movimientosKardex.push(movimientoKardex);

      // Actualizar saldo para el siguiente movimiento
      saldoActual = {
        cantidad: movimientoKardex.cantidadSaldo,
        costoUnitario: movimientoKardex.costoUnitarioSaldo,
        valorTotal: movimientoKardex.valorTotalSaldo,
      };

      console.log(
        `🔍 DEBUG procesarMovimientos - Saldo actualizado después del movimiento ${i + 1}:`,
        saldoActual,
      );
    }

    // Limpiar estado temporal
    this.lotesDisponiblesTemporales.clear();

    console.log(
      '🔍 DEBUG procesarMovimientos - Procesamiento completado. Total movimientos kardex:',
      movimientosKardex.length,
    );

    return movimientosKardex;
  }

  /**
   * Procesa un movimiento de entrada (compra)
   */
  private async procesarEntrada(
    mov: any,
    saldoAnterior: {
      cantidad: number;
      costoUnitario: number;
      valorTotal: number;
    },
    metodoValoracion: MetodoValoracion,
  ): Promise<KardexMovement> {
    const cantidad = Number(mov.md_cantidad);

    // Para entradas, obtener el costo del lote
    const costoUnitario = await this.obtenerCostoUnitarioEntrada(
      mov.md_id_lote,
    );

    const costoTotal = cantidad * costoUnitario;

    // Calcular nuevo saldo
    const nuevaCantidad = saldoAnterior.cantidad + cantidad;
    const nuevoValorTotal = saldoAnterior.valorTotal + costoTotal;
    const nuevoCostoUnitario =
      nuevaCantidad > 0 ? nuevoValorTotal / nuevaCantidad : 0;

    return {
      fecha: new Date(mov.m_fecha),
      tipoOperacion: mov.c_tipoOperacion,
      tipoMovimiento: mov.tipomovimiento,
      tipoComprobante: mov.c_tipoComprobante,
      numeroComprobante: mov.m_numeroDocumento,
      cantidad,
      costoUnitario,
      costoTotal,
      cantidadSaldo: nuevaCantidad,
      costoUnitarioSaldo: nuevoCostoUnitario,
      valorTotalSaldo: nuevoValorTotal,
      idInventario: Number(mov.md_id_inventario),
      idMovimiento: Number(mov.idmovimiento),
      idMovimientoDetalle: Number(mov.idmovimientodetalle),
    };
  }

  /**
   * Procesa un movimiento de salida (venta)
   */
  private async procesarSalida(
    mov: any,
    saldoAnterior: {
      cantidad: number;
      costoUnitario: number;
      valorTotal: number;
    },
    metodoValoracion: MetodoValoracion,
    idInventario: number,
  ): Promise<KardexMovement | KardexMovement[]> {
    const cantidad = Number(mov.md_cantidad);

    // Para método PROMEDIO, mantener el comportamiento original
    if (metodoValoracion === MetodoValoracion.promedio) {
      const costoUnitario = saldoAnterior.costoUnitario;
      const costoTotal = cantidad * costoUnitario;

      // Calcular nuevo saldo
      const nuevaCantidad = Math.max(0, saldoAnterior.cantidad - cantidad);
      const nuevoValorTotal = Math.max(
        0,
        saldoAnterior.valorTotal - costoTotal,
      );
      const nuevoCostoUnitario =
        nuevaCantidad > 0 ? nuevoValorTotal / nuevaCantidad : 0;

      return {
        fecha: new Date(mov.m_fecha),
        tipoOperacion: mov.c_tipoOperacion,
        tipoMovimiento: mov.tipomovimiento,
        tipoComprobante: mov.c_tipoComprobante,
        numeroComprobante: mov.m_numeroDocumento,
        cantidad,
        costoUnitario,
        costoTotal,
        cantidadSaldo: nuevaCantidad,
        costoUnitarioSaldo: nuevoCostoUnitario,
        valorTotalSaldo: nuevoValorTotal,
        idInventario: Number(mov.md_id_inventario),
        idMovimiento: Number(mov.idmovimiento),
        idMovimientoDetalle: Number(mov.idmovimientodetalle),
      };
    }

    // Para método FIFO, crear un movimiento por cada lote consumido
    else {
      // Calcular los lotes a consumir usando FIFO
      const resultadoFIFO = await this.calcularCostoFIFO(
        idInventario,
        cantidad,
        new Date(mov.m_fecha),
      );

      const movimientosPorLote: KardexMovement[] = [];
      let saldoActualizado = { ...saldoAnterior };

      // Crear un movimiento por cada lote consumido
      for (const detalle of resultadoFIFO.detallesSalida) {
        const cantidadLote = detalle.cantidad;
        const costoUnitarioLote = detalle.costoUnitarioDeLote;
        const costoTotalLote = detalle.costoTotal;

        // Calcular nuevo saldo después de este lote
        const nuevaCantidad = Math.max(
          0,
          saldoActualizado.cantidad - cantidadLote,
        );
        const nuevoValorTotal = Math.max(
          0,
          saldoActualizado.valorTotal - costoTotalLote,
        );
        const nuevoCostoUnitario =
          nuevaCantidad > 0 ? nuevoValorTotal / nuevaCantidad : 0;

        // Crear movimiento para este lote
        const movimientoLote: KardexMovement = {
          fecha: new Date(mov.m_fecha),
          tipoOperacion: mov.c_tipoOperacion,
          tipoMovimiento: mov.tipomovimiento,
          tipoComprobante: mov.c_tipoComprobante,
          numeroComprobante: mov.m_numeroDocumento,
          cantidad: cantidadLote,
          costoUnitario: costoUnitarioLote,
          costoTotal: costoTotalLote,
          cantidadSaldo: nuevaCantidad,
          costoUnitarioSaldo: nuevoCostoUnitario,
          valorTotalSaldo: nuevoValorTotal,
          idInventario: Number(mov.md_id_inventario),
          idMovimiento: Number(mov.idmovimiento),
          idMovimientoDetalle: Number(mov.idmovimientodetalle),
          detallesSalida: [
            {
              idLote: detalle.idLote,
              cantidad: cantidadLote,
              costoUnitarioDeLote: costoUnitarioLote,
              costoTotal: costoTotalLote,
            },
          ],
        };

        movimientosPorLote.push(movimientoLote);

        // Actualizar saldo para el siguiente lote
        saldoActualizado = {
          cantidad: nuevaCantidad,
          costoUnitario: nuevoCostoUnitario,
          valorTotal: nuevoValorTotal,
        };
      }

      return movimientosPorLote;
    }
  }

  /**
   * Obtiene el costo unitario de una entrada desde el lote
   */
  private async obtenerCostoUnitarioEntrada(idLote: number): Promise<number> {
    console.log(
      '🔍 DEBUG obtenerCostoUnitarioEntrada - idLote recibido:',
      idLote,
    );

    if (!idLote) {
      return 0;
    }

    const lote = await this.loteRepository.findOne({
      where: { id: idLote },
      select: ['costoUnitario'],
    });

    return lote ? Number(lote.costoUnitario) : 0;
  }

  /**
   * Inicializa el estado temporal de lotes para el cálculo FIFO
   */
  private async inicializarLotesTemporales(
    idInventario: number,
    fechaInicio: Date,
  ): Promise<void> {
    this.lotesDisponiblesTemporales.clear();

    // Obtener lotes disponibles al inicio del período
    const lotesDisponibles =
      await this.stockCalculationService.obtenerLotesDisponiblesFIFO(
        idInventario,
        fechaInicio,
      );

    // Cargar en el estado temporal
    for (const lote of lotesDisponibles) {
      this.lotesDisponiblesTemporales.set(lote.idLote, {
        cantidadDisponible: lote.cantidadDisponible,
        costoUnitario: lote.costoUnitario,
        fechaIngreso: lote.fechaIngreso,
      });
    }

    console.log(
      '🔍 DEBUG inicializarLotesTemporales - Lotes inicializados:',
      Array.from(this.lotesDisponiblesTemporales.entries()).map(
        ([id, lote]) => ({
          idLote: id,
          cantidadDisponible: lote.cantidadDisponible,
          costoUnitario: lote.costoUnitario,
        }),
      ),
    );
  }

  /**
   * Actualiza el estado temporal cuando hay una entrada (nuevo lote)
   */
  private actualizarLoteTemporalEntrada(
    idLote: number,
    cantidad: number,
    costoUnitario: number,
    fechaIngreso: Date,
  ): void {
    const loteExistente = this.lotesDisponiblesTemporales.get(idLote);

    if (loteExistente) {
      // Actualizar cantidad del lote existente
      loteExistente.cantidadDisponible += cantidad;
    } else {
      // Agregar nuevo lote
      this.lotesDisponiblesTemporales.set(idLote, {
        cantidadDisponible: cantidad,
        costoUnitario: costoUnitario,
        fechaIngreso: fechaIngreso,
      });
    }

    console.log('🔍 DEBUG actualizarLoteTemporalEntrada - Lote actualizado:', {
      idLote,
      cantidad,
      costoUnitario,
      cantidadDisponibleTotal:
        this.lotesDisponiblesTemporales.get(idLote)?.cantidadDisponible,
    });
  }

  /**
   * Calcula el costo FIFO para una salida específica usando el estado temporal
   */
  private async calcularCostoFIFO(
    idInventario: number,
    cantidadSalida: number,
    fechaMovimiento: Date,
  ): Promise<{
    costoUnitarioPromedio: number;
    detallesSalida: DetalleSalidaCalculado[];
  }> {
    console.log('🔍 DEBUG calcularCostoFIFO - Parámetros:', {
      idInventario,
      cantidadSalida,
      fechaMovimiento: fechaMovimiento.toISOString(),
    });

    // Usar lotes temporales en lugar de consultar la base de datos
    const lotesDisponibles = Array.from(
      this.lotesDisponiblesTemporales.entries(),
    )
      .filter(([_, lote]) => lote.cantidadDisponible > 0)
      .map(([idLote, lote]) => ({
        idLote,
        cantidadDisponible: lote.cantidadDisponible,
        costoUnitario: lote.costoUnitario,
        fechaIngreso: lote.fechaIngreso,
      }))
      .sort((a, b) => {
        // Primero ordenar por fecha de ingreso
        const fechaDiff = a.fechaIngreso.getTime() - b.fechaIngreso.getTime();
        if (fechaDiff !== 0) return fechaDiff;
        // Si las fechas son iguales, ordenar por ID del lote (FIFO estricto)
        return a.idLote - b.idLote;
      });

    console.log(
      '🔍 DEBUG calcularCostoFIFO - Lotes disponibles (temporal):',
      lotesDisponibles.map((l) => ({
        idLote: l.idLote,
        cantidadDisponible: l.cantidadDisponible,
        costoUnitario: l.costoUnitario,
        fechaIngreso: l.fechaIngreso,
      })),
    );

    const detallesSalida: DetalleSalidaCalculado[] = [];
    let cantidadRestante = cantidadSalida;
    let costoTotalSalida = 0;

    for (const lote of lotesDisponibles) {
      if (cantidadRestante <= 0) break;

      const cantidadDelLote = Math.min(
        cantidadRestante,
        lote.cantidadDisponible,
      );
      const costoDelLote = cantidadDelLote * lote.costoUnitario;

      console.log('🔍 DEBUG calcularCostoFIFO - Procesando lote:', {
        idLote: lote.idLote,
        cantidadDelLote,
        costoUnitario: lote.costoUnitario,
        costoDelLote,
      });

      detallesSalida.push({
        idLote: lote.idLote,
        cantidad: cantidadDelLote,
        costoUnitarioDeLote: lote.costoUnitario,
        costoTotal: costoDelLote,
      });

      // Acumular costo total para el cálculo del promedio
      costoTotalSalida += costoDelLote;

      // Actualizar el estado temporal del lote
      const loteTemp = this.lotesDisponiblesTemporales.get(lote.idLote);
      if (loteTemp) {
        loteTemp.cantidadDisponible -= cantidadDelLote;
        console.log(
          '🔍 DEBUG calcularCostoFIFO - Lote actualizado después de salida:',
          {
            idLote: lote.idLote,
            cantidadConsumida: cantidadDelLote,
            cantidadRestanteEnLote: loteTemp.cantidadDisponible,
          },
        );
      }

      cantidadRestante -= cantidadDelLote;
    }

    const costoUnitarioPromedio =
      cantidadSalida > 0 ? costoTotalSalida / cantidadSalida : 0;

    console.log('🔍 DEBUG calcularCostoFIFO - Resultado:', {
      costoTotalSalida,
      cantidadSalida,
      costoUnitarioPromedio,
      detallesSalida: detallesSalida.length,
    });

    return {
      costoUnitarioPromedio,
      detallesSalida,
    };
  }

  /**
   * Determina si un movimiento es de entrada
   */
  private esMovimientoEntrada(
    tipoMovimiento: TipoMovimiento,
    tipoOperacion?: TipoOperacion,
  ): boolean {
    if (tipoOperacion === TipoOperacion.COMPRA) {
      return true;
    }

    if (tipoMovimiento === TipoMovimiento.ENTRADA) {
      return true;
    }

    return false;
  }

  /**
   * Calcula el Kardex para múltiples inventarios
   * @param idsInventario Array de IDs de inventarios
   * @param fechaDesde Fecha de inicio del período
   * @param fechaHasta Fecha de fin del período
   * @param metodoValoracion Método de valoración
   * @returns Array de Kardex calculados
   */
  async generarKardexMultiple(
    idsInventario: number[],
    fechaDesde: Date,
    fechaHasta: Date,
    metodoValoracion: MetodoValoracion,
  ): Promise<KardexResult[]> {
    const resultados: KardexResult[] = [];

    for (const idInventario of idsInventario) {
      const kardex = await this.generarKardex(
        idInventario,
        fechaDesde,
        fechaHasta,
        metodoValoracion,
      );

      if (kardex) {
        resultados.push(kardex);
      }
    }

    return resultados;
  }

  /**
   * Obtiene un resumen de stock actual para múltiples inventarios
   * @param idsInventario Array de IDs de inventarios
   * @param fechaHasta Fecha límite para el cálculo
   * @returns Resumen de stocks
   */
  async obtenerResumenStock(
    idsInventario: number[],
    fechaHasta?: Date,
  ): Promise<
    {
      idInventario: number;
      stockActual: number;
      costoUnitario: number;
      valorTotal: number;
    }[]
  > {
    const resumen: {
      idInventario: number;
      stockActual: number;
      costoUnitario: number;
      valorTotal: number;
    }[] = [];

    for (const idInventario of idsInventario) {
      const stock = await this.stockCalculationService.calcularStockInventario(
        idInventario,
        fechaHasta,
      );

      if (stock) {
        resumen.push({
          idInventario,
          stockActual: stock.stockActual,
          costoUnitario: stock.costoPromedioActual,
          valorTotal: stock.stockActual * stock.costoPromedioActual,
        });
      }
    }

    return resumen;
  }
}
