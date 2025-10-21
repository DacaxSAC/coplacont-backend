import { Injectable, Logger } from '@nestjs/common';
import {
  KardexRepository,
  KardexMovementData,
} from '../repository/kardex.repository';
import {
  KardexRequestDto,
  KardexResponseDto,
  KardexReportMovementDto,
} from '../dto';
import { TipoOperacion } from 'src/modules/comprobantes/enum/tipo-operacion.enum';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';
import { plainToInstance } from 'class-transformer';
import { InventarioRepository } from '../repository';
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
    private readonly periodoContableService: PeriodoContableService,
  ) {}

  /**
   * Genera el reporte Kardex para un inventario específico usando cálculo dinámico
   */
  /**
   * Genera el reporte Kardex para un inventario específico usando cálculo dinámico
   * @param request - Datos de la solicitud incluyendo personaId
   */
  async generateKardexReport(
    request: KardexRequestDto,
  ): Promise<KardexResponseDto> {
    const { personaId, idInventario, fechaInicio, fechaFin } = request;

    // Convertir fechas string a Date si están presentes
    const fechaInicioDate = fechaInicio ? new Date(fechaInicio) : undefined;
    const fechaFinDate = fechaFin ? new Date(fechaFin) : undefined;

    // Obtener información del inventario
    const inventario = await this.inventarioRepository.findById(idInventario);

    if (!inventario) {
      throw new Error('Inventario no encontrado');
    }

    // Verificar que tanto el almacén como el producto pertenecen a la empresa del usuario
    // Necesitamos cargar las relaciones con persona para validar el acceso
    const almacenConPersona = await this.inventarioRepository.findAlmacenById(
      inventario.almacen.id,
    );
    const productoConPersona = await this.inventarioRepository.findProductoById(
      inventario.producto.id,
    );

    if (!almacenConPersona || !productoConPersona) {
      throw new Error('Error al validar permisos de acceso');
    }

    if (!personaId) {
      throw new Error('ID de persona no proporcionado');
    }

    // Determinar método de valoración
    const configuracionPeriodo =
      await this.periodoContableService.obtenerConfiguracion(personaId);
    const metodoValoracion = configuracionPeriodo.metodoCalculoCosto;
    console.log('Metodo de costeo:', metodoValoracion);

    // Usar KardexCalculationService para cálculo dinámico
    const kardexResult = await this.kardexCalculationService.generarKardex(
      idInventario,
      fechaInicioDate || new Date('1900-01-01'), // Si no hay fecha inicio, usar fecha muy antigua
      fechaFinDate || new Date(), // Si no hay fecha fin, usar fecha actual
      metodoValoracion,
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
        costoFinal: '0.00000000',
      };
    }

    // Convertir movimientos de KardexCalculationService al formato esperado por el DTO
    const movimientosFormateados = kardexResult.movimientos.map((mov) => {
      const movimientoDto: any = {
        fecha: this.formatDate(mov.fecha),
        tipo:
          mov.tipoMovimiento === TipoMovimiento.ENTRADA ? 'Entrada' : 'Salida',
        tComprob: mov.tipoComprobante || '',
        nComprobante: mov.numeroComprobante || '',
        cantidad: mov.cantidad ? Number(mov.cantidad.toFixed(4)) : 0,
        saldo: mov.cantidadSaldo ? Number(mov.cantidadSaldo.toFixed(4)) : 0,
        costoUnitario: mov.costoUnitario
          ? Number(mov.costoUnitario.toFixed(4))
          : 0,
        costoTotal: mov.costoTotal ? Number(mov.costoTotal.toFixed(8)) : 0,
      };

      // Agregar detalles de salida si existen
      if (mov.detallesSalida && mov.detallesSalida.length > 0) {
        movimientoDto.detallesSalida = mov.detallesSalida.map((detalle) => ({
          id: detalle.idLote, // Usar idLote como id para compatibilidad
          idLote: detalle.idLote,
          costoUnitarioDeLote: detalle.costoUnitarioDeLote
            ? Number(detalle.costoUnitarioDeLote.toFixed(4))
            : 0,
          cantidad: detalle.cantidad ? Number(detalle.cantidad.toFixed(4)) : 0,
        }));
      }

      return movimientoDto;
    });

    // Calcular saldo inicial basado en el primer movimiento o valores por defecto
    const primerMovimiento = kardexResult.movimientos[0];
    const ultimoMovimiento =
      kardexResult.movimientos[kardexResult.movimientos.length - 1];

    // Calcular saldo inicial restando el primer movimiento del saldo después del primer movimiento
    let saldoInicialCantidad = 0;
    let saldoInicialValor = 0;

    if (primerMovimiento) {
      if (primerMovimiento.tipoMovimiento === TipoMovimiento.ENTRADA) {
        saldoInicialCantidad =
          primerMovimiento.cantidadSaldo - primerMovimiento.cantidad;
        saldoInicialValor =
          primerMovimiento.valorTotalSaldo - primerMovimiento.costoTotal;
      } else {
        saldoInicialCantidad =
          primerMovimiento.cantidadSaldo + primerMovimiento.cantidad;
        saldoInicialValor =
          primerMovimiento.valorTotalSaldo + primerMovimiento.costoTotal;
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
      costoFinal: Number(kardexResult.valorTotalFinal).toFixed(8),
    };

    return plainToInstance(KardexResponseDto, response, {
      excludeExtraneousValues: true,
    });
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
}
