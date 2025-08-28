import { Injectable } from '@nestjs/common';
import { KardexRepository, KardexMovementData } from '../repository/kardex.repository';
import { KardexRequestDto, KardexResponseDto, KardexReportMovementDto } from '../dto';
import { TipoOperacion } from 'src/modules/comprobantes/enum/tipo-operacion.enum';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';
import { plainToInstance } from 'class-transformer';
import { InventarioRepository } from '../repository';
import { RecalculoKardexService, ResultadoRecalculo } from './recalculo-kardex.service';
import { PeriodoContableService } from 'src/modules/periodos/service';
import { MetodoValoracion } from 'src/modules/comprobantes/enum/metodo-valoracion.enum';

@Injectable()
export class KardexService {
  constructor(
    private readonly kardexRepository: KardexRepository,
    private readonly inventarioRepository: InventarioRepository,
    private readonly recalculoKardexService: RecalculoKardexService,
    private readonly periodoContableService: PeriodoContableService
  ) {}

  /**
   * Genera el reporte Kardex para un inventario específico
   */
  async generateKardexReport(request: KardexRequestDto): Promise<KardexResponseDto> {
    const { idInventario, fechaInicio, fechaFin } = request;
    
    // Convertir fechas string a Date si están presentes
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : undefined;
    const fechaFinDate = fechaFin ? new Date(fechaFin) : undefined;

    // Obtener movimientos del repositorio
    const movimientosData = await this.kardexRepository.getKardexMovements(
      idInventario,
      fechaInicioDate,
      fechaFinDate
    );



    // Obtener stock inicial si hay fecha de inicio
    let stockInicial = { cantidad: 0, costoTotal: 0 };
    if (fechaInicioDate) {
      stockInicial = await this.kardexRepository.getStockInicial(idInventario, fechaInicioDate);
    }

    // Si no hay movimientos, obtener información del inventario directamente
    if (movimientosData.length === 0) {
      const inventario = await this.inventarioRepository.findById(idInventario);

      if (!inventario) {
        throw new Error('Inventario no encontrado');
      }

      return {
        producto: inventario.producto?.nombre || 'Producto no encontrado',
        almacen: inventario.almacen?.nombre || 'Almacén no encontrado',
        inventarioInicialCantidad: Number(stockInicial.cantidad || 0).toFixed(4),
        inventarioInicialCostoTotal: Number(stockInicial.costoTotal || 0).toFixed(8),
        movimientos: [],
        cantidadActual: Number(stockInicial.cantidad || 0).toFixed(4),
        saldoActual: Number(stockInicial.costoTotal || 0).toFixed(8),
        costoFinal: Number(stockInicial.costoTotal || 0).toFixed(8)
      };
    }

    // Calcular saldos acumulados
    const resultado = this.calculateRunningBalances(movimientosData, stockInicial);
    const movimientosConSaldo = resultado.movimientos;
    const costoTotalFinal = resultado.costoTotalFinal;

    // Obtener información del primer movimiento para producto y almacén
    const primerMovimiento = movimientosData[0];
    
    // Calcular totales finales
    const ultimoMovimiento = movimientosConSaldo[movimientosConSaldo.length - 1];
    const saldoFinal = ultimoMovimiento?.saldo || 0;
    
    const response: KardexResponseDto = {
      producto: primerMovimiento.nombreProducto,
      almacen: primerMovimiento.nombreAlmacen,
      inventarioInicialCantidad: Number(stockInicial.cantidad || 0).toFixed(4),
      inventarioInicialCostoTotal: Number(stockInicial.costoTotal || 0).toFixed(8),
      movimientos: movimientosConSaldo,
      cantidadActual: saldoFinal.toFixed(4),
      saldoActual: saldoFinal.toFixed(4),
      costoFinal: costoTotalFinal.toFixed(8)
    };

    return plainToInstance(KardexResponseDto, response, {
      excludeExtraneousValues: true
    });
  }

  /**
   * Calcula los saldos acumulados para cada movimiento
   */
  private calculateRunningBalances(
    movimientos: KardexMovementData[],
    stockInicial: { cantidad: number; costoTotal: number }
  ): { movimientos: KardexReportMovementDto[]; costoTotalFinal: number } {
    let saldoAcumulado = Number(stockInicial.cantidad) || 0;
    let costoTotalAcumulado = Number(stockInicial.costoTotal) || 0;
    console.log('COSTO TOTAL ACUMULADO', costoTotalAcumulado);

    const movimientosCalculados = movimientos.map(movimiento => {
      const isEntrada = this.isMovimientoEntrada(movimiento.tipoOperacion, movimiento.tipoMovimiento);
      
      // Convertir valores a números para evitar concatenación de strings
      const cantidad = Number(movimiento.cantidad) || 0;
      const costoTotal = Number(movimiento.costoTotal) || 0;
      const costoUnitario = Number(movimiento.costoUnitario) || 0;
      
      // Calcular nuevo saldo
      if (isEntrada) {
        saldoAcumulado += cantidad;
        costoTotalAcumulado += costoTotal;
      } else {
        saldoAcumulado -= cantidad;
        costoTotalAcumulado -= costoTotal;
      }

      // Calcular costo unitario promedio
      const costoUnitarioPromedio = saldoAcumulado > 0 ? costoTotalAcumulado / saldoAcumulado : 0;

      const movimientoCalculado = {
        fecha: this.formatDate(movimiento.fecha),
        tipo: isEntrada ? 'Entrada' : 'Salida',
        tComprob: movimiento.tipoComprobante,
        nComprobante: movimiento.numeroComprobante,
        cantidad: Number(cantidad.toFixed(4)),
        saldo: Number(saldoAcumulado.toFixed(4)),
        costoUnitario: Number(costoUnitario.toFixed(4)),
        costoTotal: Number(costoTotal.toFixed(8))
      };

      // Agregar detalles de salida si es un movimiento de salida y tiene detalles
      if (!isEntrada && movimiento.detallesSalida && movimiento.detallesSalida.length > 0) {
        movimientoCalculado['detallesSalida'] = movimiento.detallesSalida.map(detalle => ({
          id: detalle.id,
          idLote: detalle.idLote,
          costoUnitarioDeLote: Number(Number(detalle.costoUnitarioDeLote).toFixed(4)),
          cantidad: Number(Number(detalle.cantidad).toFixed(4))
        }));
      }

      return movimientoCalculado;
    });

    return {
      movimientos: movimientosCalculados,
      costoTotalFinal: costoTotalAcumulado
    };
  }

  /**
   * Determina si un movimiento es de entrada basado en los enums
   */
  private isMovimientoEntrada(tipoOperacion: TipoOperacion, tipoMovimiento: TipoMovimiento): boolean {
    // Si viene de comprobante con TipoOperacion.COMPRA, es entrada
    if (tipoOperacion === TipoOperacion.COMPRA) {
      return true;
    }
    
    // Si viene de movimiento directo con TipoMovimiento.ENTRADA, es entrada
    if (tipoMovimiento === TipoMovimiento.ENTRADA) {
      return true;
    }
    
    // Cualquier otro caso es salida
    return false;
  }

  /**
   * Formatea la fecha para mostrar en el reporte
   */
  private formatDate(fecha: Date): string {
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  }

  /**
   * Calcula el costo total basado en cantidad y costo unitario
   */
  private calculateTotalCost(cantidad: number, costoUnitario: number): number {
    return cantidad * costoUnitario;
  }

  /**
   * Procesa un movimiento retroactivo y ejecuta el recálculo automático
   * @param idPersona ID de la persona para validar período activo
   * @param fechaMovimiento Fecha del movimiento a procesar
   * @param movimientoId ID del movimiento a recalcular
   * @param metodoValoracion Método de valoración a utilizar (PROMEDIO o FIFO)
   */
  async procesarMovimientoRetroactivo(
    idPersona: number,
    fechaMovimiento: Date,
    movimientoId: number,
    metodoValoracion: MetodoValoracion
  ): Promise<ResultadoRecalculo | { mensaje: string }> {
    // Validar que la fecha esté dentro del período activo
    const validacion = await this.periodoContableService.validarFechaEnPeriodoActivo(
      idPersona,
      fechaMovimiento
    );

    if (!validacion.valida) {
      throw new Error(validacion.mensaje || 'La fecha del movimiento no está dentro del período contable activo');
    }

    // Validar límite de movimientos retroactivos
    const puedeHacerMovimientoRetroactivo = await this.periodoContableService.validarMovimientoRetroactivo(
      idPersona,
      fechaMovimiento
    );

    if (!puedeHacerMovimientoRetroactivo) {
      throw new Error('No se pueden realizar movimientos retroactivos más allá del límite configurado');
    }

    // Verificar si la fecha es retroactiva
    if (!this.esFechaRetroactiva(fechaMovimiento)) {
      // Si no es retroactiva, no necesita recálculo especial
      return { mensaje: 'Movimiento no requiere recálculo retroactivo' };
    }

    // Ejecutar recálculo del movimiento
    return await this.recalculoKardexService.recalcularMovimientoRetroactivo(
      movimientoId,
      metodoValoracion
    );
  }

  /**
   * Verifica si una fecha es retroactiva comparándola con la fecha actual
   * @param fechaMovimiento Fecha del movimiento a verificar
   * @returns true si la fecha es retroactiva (anterior a hoy)
   */
  private esFechaRetroactiva(fechaMovimiento: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    
    const fechaComparar = new Date(fechaMovimiento);
    fechaComparar.setHours(0, 0, 0, 0);
    
    return fechaComparar < hoy;
  }

  /**
   * Recalcula múltiples movimientos retroactivos
   * @param movimientosIds Array de IDs de movimientos a recalcular
   * @param metodoValoracion Método de valoración a utilizar
   * @returns Resultado consolidado del recálculo
   */
  async recalcularMovimientosRetroactivos(
    movimientosIds: number[],
    metodoValoracion: MetodoValoracion
  ): Promise<Array<{ movimientoId: number; exito: boolean; resultado?: ResultadoRecalculo; error?: string }>> {
    const resultados: Array<{ movimientoId: number; exito: boolean; resultado?: ResultadoRecalculo; error?: string }> = [];
    
    for (const movimientoId of movimientosIds) {
      try {
        const resultado = await this.recalculoKardexService.recalcularMovimientoRetroactivo(
          movimientoId,
          metodoValoracion
        );
        resultados.push({
          movimientoId,
          exito: true,
          resultado
        });
      } catch (error) {
        resultados.push({
          movimientoId,
          exito: false,
          error: error.message
        });
      }
    }
    
    return resultados;
  }

  /**
   * Obtiene estadísticas de recálculo para un período
   * @param fechaInicio Fecha de inicio del período
   * @param fechaFin Fecha de fin del período
   * @returns Estadísticas del recálculo
   */
  async obtenerEstadisticasRecalculo(
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<{
    periodo: { inicio: Date; fin: Date };
    movimientosRetroactivos: number;
    recalculosEjecutados: number;
    erroresEncontrados: number;
  }> {
    // Implementar lógica para obtener estadísticas de recálculo
    // Por ahora retornamos un objeto básico
    return {
      periodo: {
        inicio: fechaInicio,
        fin: fechaFin
      },
      movimientosRetroactivos: 0,
      recalculosEjecutados: 0,
      erroresEncontrados: 0
    };
  }
}