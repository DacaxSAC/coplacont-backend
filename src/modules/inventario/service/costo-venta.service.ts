import { Injectable, NotFoundException } from '@nestjs/common';
import { CostoVentaRepository, CostoVentaFiltros } from '../repository/costo-venta.repository';
import {
  CostoVentaRequestDto,
  CostoVentaResponseDto,
  CostoVentaMensualDto,
  CostoVentaSumatoriaDto
} from '../dto/costo-venta';

/**
 * Servicio para la generación de reportes de Estado de Costo de Venta
 */
@Injectable()
export class CostoVentaService {
  constructor(
    private readonly costoVentaRepository: CostoVentaRepository
  ) {}

  /**
   * Nombres de los meses en español
   */
  private readonly nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  /**
   * Genera el reporte anual de Estado de Costo de Venta
   */
  async generateCostoVentaReport(request: CostoVentaRequestDto): Promise<CostoVentaResponseDto> {
    try {
      // Preparar filtros para el repositorio
      const filtros: CostoVentaFiltros = {
        año: request.año,
        idAlmacen: request.idAlmacen,
        idProducto: request.idProducto
      };

      // Obtener datos mensuales del repositorio
      const datosMensualesRaw = await this.costoVentaRepository.getCostoVentaAnual(filtros);

      // Transformar datos mensuales al formato del DTO
      const datosMensuales: CostoVentaMensualDto[] = datosMensualesRaw.map(dato => ({
        mes: dato.mes,
        nombreMes: this.nombresMeses[dato.mes - 1],
        comprasTotales: Number(dato.comprasTotales).toFixed(2),
        salidasTotales: Number(dato.salidasTotales).toFixed(2),
        inventarioFinal: Number(dato.inventarioFinal).toFixed(2)
      }));

      // Calcular sumatorias anuales
      const sumatorias: CostoVentaSumatoriaDto = this.calcularSumatorias(datosMensualesRaw);

      // Obtener información adicional si se especificaron filtros
      let nombreAlmacen: string | undefined;
      let nombreProducto: string | undefined;

      if (request.idAlmacen) {
        const almacenInfo = await this.costoVentaRepository.getAlmacenInfo(request.idAlmacen);
        if (!almacenInfo) {
          throw new NotFoundException(`Almacén con ID ${request.idAlmacen} no encontrado`);
        }
        nombreAlmacen = almacenInfo.nombre;
      }

      if (request.idProducto) {
        const productoInfo = await this.costoVentaRepository.getProductoInfo(request.idProducto);
        if (!productoInfo) {
          throw new NotFoundException(`Producto con ID ${request.idProducto} no encontrado`);
        }
        nombreProducto = productoInfo.nombre;
      }

      // Construir respuesta
      const response: CostoVentaResponseDto = {
        año: request.año,
        almacen: nombreAlmacen,
        producto: nombreProducto,
        datosMensuales,
        sumatorias,
        fechaGeneracion: new Date()
      };

      return response;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error al generar el reporte de costo de venta: ${error.message}`);
    }
  }

  /**
   * Calcula las sumatorias anuales a partir de los datos mensuales
   */
  private calcularSumatorias(datosMensuales: any[]): CostoVentaSumatoriaDto {
    const totalComprasAnual = datosMensuales.reduce(
      (sum, dato) => sum + Number(dato.comprasTotales),
      0
    );

    const totalSalidasAnual = datosMensuales.reduce(
      (sum, dato) => sum + Number(dato.salidasTotales),
      0
    );

    // El inventario final anual es el inventario final del último mes (diciembre)
    const inventarioFinalAnual = datosMensuales.length > 0 
      ? Number(datosMensuales[datosMensuales.length - 1]?.inventarioFinal || 0)
      : 0;

    return {
      totalComprasAnual: totalComprasAnual.toFixed(2),
      totalSalidasAnual: totalSalidasAnual.toFixed(2),
      inventarioFinalAnual: inventarioFinalAnual.toFixed(2)
    };
  }

  /**
   * Valida que el año especificado sea válido
   */
  private validarAño(año: number): void {
    const añoActual = new Date().getFullYear();
    if (año < 2000 || año > añoActual + 1) {
      throw new Error(`El año ${año} no es válido. Debe estar entre 2000 y ${añoActual + 1}`);
    }
  }

  /**
   * Exporta el reporte en formato JSON (puede extenderse para otros formatos)
   */
  async exportCostoVentaReport(
    request: CostoVentaRequestDto,
    formato: 'json' | 'excel' = 'json'
  ): Promise<any> {
    const reporte = await this.generateCostoVentaReport(request);

    switch (formato) {
      case 'json':
        return reporte;
      case 'excel':
        // TODO: Implementar exportación a Excel
        throw new Error('Exportación a Excel no implementada aún');
      default:
        throw new Error(`Formato de exportación '${formato}' no soportado`);
    }
  }
}