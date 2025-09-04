import { Injectable, Logger } from '@nestjs/common';
import { KardexRepository, KardexMovementData } from '../repository/kardex.repository';
import { KardexRequestDto, KardexResponseDto, KardexReportMovementDto } from '../dto';
import { TipoOperacion } from 'src/modules/comprobantes/enum/tipo-operacion.enum';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';
import { plainToInstance } from 'class-transformer';
import { InventarioRepository } from '../repository';
import { StockCalculationService } from './stock-calculation.service';
import { KardexCalculationService } from './kardex-calculation.service';
import { PeriodoContableService } from 'src/modules/periodos/service';
import { MetodoValoracion } from 'src/modules/comprobantes/enum/metodo-valoracion.enum';

@Injectable()
export class KardexService {
  private readonly logger = new Logger(KardexService.name);

  constructor(
    private readonly kardexRepository: KardexRepository,
    private readonly inventarioRepository: InventarioRepository,
    private readonly kardexCalculationService: KardexCalculationService,
    private readonly periodoContableService: PeriodoContableService
  ) {}

  /**
   * Genera el reporte Kardex para un inventario específico usando cálculo dinámico
   */
  async generateKardexReport(request: KardexRequestDto): Promise<KardexResponseDto> {
    const { idInventario, fechaInicio, fechaFin } = request;
    
    // Convertir fechas string a Date si están presentes
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : undefined;
    const fechaFinDate = fechaFin ? new Date(fechaFin) : undefined;

    // Obtener información del inventario para determinar el método de valoración
    const inventario = await this.inventarioRepository.findById(idInventario);
    if (!inventario) {
      throw new Error('Inventario no encontrado');
    }

    // Determinar método de valoración (por defecto PROMEDIO)
    // TODO: Agregar campo metodoValoracion a la entidad Inventario si es necesario
    const metodoValoracion = MetodoValoracion.PROMEDIO;

    // Usar KardexCalculationService para cálculo dinámico
    const kardexResult = await this.kardexCalculationService.generarKardex(
      idInventario,
      fechaInicioDate || new Date('1900-01-01'), // Si no hay fecha inicio, usar fecha muy antigua
      fechaFinDate || new Date(), // Si no hay fecha fin, usar fecha actual
      metodoValoracion
    );

    if (!kardexResult) {
      return {
        producto: inventario.producto?.nombre || 'Producto no encontrado',
        almacen: inventario.almacen?.nombre || 'Almacén no encontrado',
        inventarioInicialCantidad: '0.0000',
        inventarioInicialCostoTotal: '0.00000000',
        movimientos: [],
        cantidadActual: '0.0000',
        saldoActual: '0.0000',
        costoFinal: '0.00000000'
      };
    }

    // Convertir movimientos de KardexCalculationService al formato esperado por el DTO
    const movimientosFormateados = kardexResult.movimientos.map(mov => {
      const movimientoDto: any = {
        fecha: this.formatDate(mov.fecha),
        tipo: mov.tipoMovimiento === TipoMovimiento.ENTRADA ? 'Entrada' : 'Salida',
        tComprob: mov.tipoComprobante || '',
        nComprobante: mov.numeroComprobante || '',
        cantidad: mov.cantidad ? Number(mov.cantidad.toFixed(4)) : 0,
        saldo: mov.cantidadSaldo ? Number(mov.cantidadSaldo.toFixed(4)) : 0,
        costoUnitario: mov.costoUnitario ? Number(mov.costoUnitario.toFixed(4)) : 0,
        costoTotal: mov.costoTotal ? Number(mov.costoTotal.toFixed(8)) : 0
      };

      // Agregar detalles de salida si existen
      if (mov.detallesSalida && mov.detallesSalida.length > 0) {
        movimientoDto.detallesSalida = mov.detallesSalida.map(detalle => ({
          id: detalle.idLote, // Usar idLote como id para compatibilidad
          idLote: detalle.idLote,
          costoUnitarioDeLote: detalle.costoUnitarioDeLote ? Number(detalle.costoUnitarioDeLote.toFixed(4)) : 0,
          cantidad: detalle.cantidad ? Number(detalle.cantidad.toFixed(4)) : 0
        }));
      }

      return movimientoDto;
    });
    
    // Calcular saldo inicial basado en el primer movimiento o valores por defecto
    const primerMovimiento = kardexResult.movimientos[0];
    const ultimoMovimiento = kardexResult.movimientos[kardexResult.movimientos.length - 1];
    
    // Calcular saldo inicial restando el primer movimiento del saldo después del primer movimiento
    let saldoInicialCantidad = 0;
    let saldoInicialValor = 0;
    
    if (primerMovimiento) {
      if (primerMovimiento.tipoMovimiento === TipoMovimiento.ENTRADA) {
        saldoInicialCantidad = primerMovimiento.cantidadSaldo - primerMovimiento.cantidad;
        saldoInicialValor = primerMovimiento.valorTotalSaldo - primerMovimiento.costoTotal;
      } else {
        saldoInicialCantidad = primerMovimiento.cantidadSaldo + primerMovimiento.cantidad;
        saldoInicialValor = primerMovimiento.valorTotalSaldo + primerMovimiento.costoTotal;
      }
    }
    
    const response: KardexResponseDto = {
      producto: kardexResult.producto.nombre,
      almacen: kardexResult.almacen.nombre,
      inventarioInicialCantidad: Number(saldoInicialCantidad).toFixed(4),
      inventarioInicialCostoTotal: Number(saldoInicialValor).toFixed(8),
      movimientos: movimientosFormateados,
      cantidadActual: Number(kardexResult.stockFinal).toFixed(4),
      saldoActual: Number(kardexResult.stockFinal).toFixed(4),
      costoFinal: Number(kardexResult.valorTotalFinal).toFixed(8)
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
      let costoTotal = Number(movimiento.costoTotal) || 0;
      let costoUnitario = Number(movimiento.costoUnitario) || 0;
      
      // Para movimientos de salida con detallesSalida, calcular costo basado en los detalles
      if (!isEntrada && movimiento.detallesSalida && movimiento.detallesSalida.length > 0) {
        costoTotal = movimiento.detallesSalida.reduce((total, detalle) => {
          return total + (Number(detalle.cantidad) * Number(detalle.costoUnitarioDeLote));
        }, 0);
        costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
      }
      
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
    if (!fecha || isNaN(new Date(fecha).getTime())) {
      return '-- - -- - ----';
    }
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
   * Procesa un movimiento retroactivo - Con cálculo dinámico ya no se requiere recálculo
   * @param idPersona ID de la persona para validar período activo
   * @param fechaMovimiento Fecha del movimiento a procesar
   * @param movimientoId ID del movimiento a procesar
   * @param metodoValoracion Método de valoración a utilizar (PROMEDIO o FIFO)
   */
  async procesarMovimientoRetroactivo(
    idPersona: number,
    fechaMovimiento: Date,
    movimientoId: number,
    metodoValoracion: MetodoValoracion
  ): Promise<{ mensaje: string }> {
    this.logger.log(`🔄 [CALCULO-DINAMICO] Iniciando procesamiento de movimiento: MovimientoId=${movimientoId}, PersonaId=${idPersona}, Fecha=${fechaMovimiento}, Método=${metodoValoracion}`);
    
    // Validar que la fecha esté dentro del período activo
    this.logger.log(`🔍 [CALCULO-DINAMICO] Validando fecha en período activo`);
    const validacion = await this.periodoContableService.validarFechaEnPeriodoActivo(
      idPersona,
      fechaMovimiento
    );
    
    this.logger.log(`📊 [CALCULO-DINAMICO] Resultado validación período activo: ${JSON.stringify(validacion)}`);

    if (!validacion.valida) {
      this.logger.error(`❌ [CALCULO-DINAMICO] Validación período activo FALLÓ: ${validacion.mensaje}`);
      throw new Error(validacion.mensaje || 'La fecha del movimiento no está dentro del período contable activo');
    }
    
    this.logger.log(`✅ [CALCULO-DINAMICO] Validación período activo EXITOSA`);

    // Validar límite de movimientos retroactivos
    this.logger.log(`🔍 [CALCULO-DINAMICO] Validando límites de movimientos retroactivos`);
    const validacionRetroactivo = await this.periodoContableService.validarMovimientoRetroactivo(
      idPersona,
      fechaMovimiento
    );
    
    this.logger.log(`📊 [CALCULO-DINAMICO] Resultado validación retroactivo: ${JSON.stringify(validacionRetroactivo)}`);

    if (!validacionRetroactivo.permitido) {
      this.logger.error(`❌ [CALCULO-DINAMICO] Validación movimiento retroactivo FALLÓ: ${validacionRetroactivo.mensaje}`);
      throw new Error('No se pueden realizar movimientos retroactivos más allá del límite configurado');
    }
    
    this.logger.log(`✅ [CALCULO-DINAMICO] Validación movimiento retroactivo EXITOSA`);

    // Verificar si la fecha es retroactiva
    const esRetroactiva = this.esFechaRetroactiva(fechaMovimiento);
    this.logger.log(`🔍 [CALCULO-DINAMICO] Verificación fecha retroactiva: ${esRetroactiva ? 'SÍ' : 'NO'}`);
    
    this.logger.log(`✅ [CALCULO-DINAMICO] Movimiento procesado correctamente - Los cálculos se realizan dinámicamente`);
    
    return { mensaje: 'Movimiento procesado correctamente. Los cálculos de stock y costos se realizan dinámicamente.' };
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
   * Procesa múltiples movimientos - Con cálculo dinámico ya no se requiere recálculo
   * @param movimientosIds Array de IDs de movimientos a procesar
   * @param metodoValoracion Método de valoración a utilizar
   * @returns Resultado consolidado del procesamiento
   */
  async recalcularMovimientosRetroactivos(
    movimientosIds: number[],
    metodoValoracion: MetodoValoracion
  ): Promise<Array<{ movimientoId: number; exito: boolean; mensaje: string }>> {
    const resultados: Array<{ movimientoId: number; exito: boolean; mensaje: string }> = [];
    
    for (const movimientoId of movimientosIds) {
      resultados.push({
        movimientoId,
        exito: true,
        mensaje: 'Movimiento procesado correctamente. Los cálculos se realizan dinámicamente.'
      });
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