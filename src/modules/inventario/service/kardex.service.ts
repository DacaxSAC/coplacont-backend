import { Injectable } from '@nestjs/common';
import { KardexRepository, KardexMovementData } from '../repository/kardex.repository';
import { KardexRequestDto, KardexResponseDto, KardexReportMovementDto } from '../dto';
import { TipoOperacion } from 'src/modules/comprobantes/enum/tipo-operacion.enum';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';
import { plainToInstance } from 'class-transformer';
import { InventarioRepository } from '../repository';

@Injectable()
export class KardexService {
  constructor(
    private readonly kardexRepository: KardexRepository,
    private readonly inventarioRepository: InventarioRepository
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

    if (movimientosData.length === 0) {
      throw new Error('No se encontraron movimientos para el inventario especificado');
    }

    // Obtener stock inicial si hay fecha de inicio
    let stockInicial = { cantidad: 0, costoTotal: 0 };
    if (fechaInicioDate) {
      stockInicial = await this.kardexRepository.getStockInicial(idInventario, fechaInicioDate);
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

      return {
        fecha: this.formatDate(movimiento.fecha),
        tipo: isEntrada ? 'Entrada' : 'Salida',
        tComprob: movimiento.tipoComprobante,
        nComprobante: movimiento.numeroComprobante,
        cantidad: Number(cantidad.toFixed(4)),
        saldo: Number(saldoAcumulado.toFixed(4)),
        costoUnitario: Number(costoUnitario.toFixed(4)),
        costoTotal: Number(costoTotal.toFixed(8))
      };
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
}