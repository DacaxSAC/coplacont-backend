import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CostoVentaService } from '../service/costo-venta.service';
import {
  CostoVentaRequestDto,
  CostoVentaResponseDto,
  CostoVentaPorInventarioRequestDto,
  CostoVentaPorInventarioResponseDto,
} from '../dto/costo-venta';

/**
 * Controlador para la gestión de reportes de Estado de Costo de Venta
 */
@ApiTags('Costo de Venta')
@Controller('api/costo-venta')
export class CostoVentaController {
  constructor(private readonly costoVentaService: CostoVentaService) {}

  /**
   * Genera el reporte anual de Estado de Costo de Venta
   */
  @Get('reporte')
  @ApiOperation({
    summary: 'Generar reporte de Estado de Costo de Venta',
    description:
      'Genera un reporte anual con desglose mensual de compras totales, salidas totales e inventario final, incluyendo sumatorias anuales',
  })
  @ApiQuery({
    name: 'año',
    description: 'Año para el cual generar el reporte',
    example: 2024,
    type: Number,
  })
  @ApiQuery({
    name: 'idAlmacen',
    description:
      'ID del almacén (opcional, si no se especifica incluye todos los almacenes)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'idProducto',
    description:
      'ID del producto (opcional, si no se especifica incluye todos los productos)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de costo de venta generado exitosamente',
    type: CostoVentaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Almacén o producto no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async generateCostoVentaReport(
    @Query(new ValidationPipe({ transform: true })) query: CostoVentaRequestDto,
  ): Promise<CostoVentaResponseDto> {
    try {
      return await this.costoVentaService.generateCostoVentaReport(query);
    } catch (error) {
      throw new BadRequestException(
        `Error al generar el reporte: ${error.message}`,
      );
    }
  }

  /**
   * Exporta el reporte de Estado de Costo de Venta en formato JSON
   */
  @Get('exportar')
  @ApiOperation({
    summary: 'Exportar reporte de Estado de Costo de Venta',
    description:
      'Exporta el reporte anual de costo de venta en formato JSON (extensible a otros formatos)',
  })
  @ApiQuery({
    name: 'año',
    description: 'Año para el cual exportar el reporte',
    example: 2024,
    type: Number,
  })
  @ApiQuery({
    name: 'idAlmacen',
    description: 'ID del almacén (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'idProducto',
    description: 'ID del producto (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'formato',
    description: 'Formato de exportación',
    example: 'json',
    enum: ['json'],
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte exportado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos o formato no soportado',
  })
  @ApiResponse({
    status: 404,
    description: 'Almacén o producto no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async exportCostoVentaReport(
    @Query(new ValidationPipe({ transform: true }))
    query: CostoVentaRequestDto & { formato?: string },
  ): Promise<any> {
    try {
      const formato = query.formato || 'json';

      // Validar formato
      if (!['json'].includes(formato)) {
        throw new BadRequestException(
          `Formato '${formato}' no soportado. Formatos disponibles: json`,
        );
      }

      const { formato: _, ...requestData } = query;
      return await this.costoVentaService.exportCostoVentaReport(
        requestData as CostoVentaRequestDto,
        formato as 'json',
      );
    } catch (error) {
      throw new BadRequestException(
        `Error al exportar el reporte: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene un resumen rápido del estado de costo de venta para un año
   */
  @Get('resumen')
  @ApiOperation({
    summary: 'Obtener resumen de costo de venta',
    description:
      'Obtiene un resumen rápido con las sumatorias anuales de compras, salidas e inventario final',
  })
  @ApiQuery({
    name: 'año',
    description: 'Año para el resumen',
    example: 2024,
    type: Number,
  })
  @ApiQuery({
    name: 'idAlmacen',
    description: 'ID del almacén (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'idProducto',
    description: 'ID del producto (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen obtenido exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  async getCostoVentaResumen(
    @Query(new ValidationPipe({ transform: true })) query: CostoVentaRequestDto,
  ): Promise<{
    sumatorias: any;
    año: number;
    almacen?: string;
    producto?: string;
  }> {
    try {
      const reporte =
        await this.costoVentaService.generateCostoVentaReport(query);
      return {
        año: reporte.año,
        almacen: reporte.almacen,
        producto: reporte.producto,
        sumatorias: reporte.sumatorias,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error al obtener el resumen: ${error.message}`,
      );
    }
  }

  /**
   * Genera el reporte anual de Estado de Costo de Venta por inventario individual
   */
  @Get('reporte-por-inventario')
  @ApiOperation({
    summary: 'Generar reporte de Estado de Costo de Venta por inventario',
    description:
      'Genera un reporte anual que muestra entradas, salidas e inventario final para cada inventario individual, con sumatorias totales',
  })
  @ApiQuery({
    name: 'año',
    description: 'Año para el cual generar el reporte',
    example: 2024,
    type: Number,
  })
  @ApiQuery({
    name: 'idAlmacen',
    description:
      'ID del almacén (opcional, si no se especifica incluye todos los almacenes)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'idProducto',
    description:
      'ID del producto (opcional, si no se especifica incluye todos los productos)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description:
      'Reporte de costo de venta por inventario generado exitosamente',
    type: CostoVentaPorInventarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron datos para los filtros especificados',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async generateCostoVentaPorInventarioReport(
    @Query(new ValidationPipe({ transform: true }))
    query: CostoVentaPorInventarioRequestDto,
  ): Promise<CostoVentaPorInventarioResponseDto> {
    try {
      return await this.costoVentaService.generateCostoVentaPorInventarioReport(
        query,
      );
    } catch (error) {
      throw new BadRequestException(
        `Error al generar el reporte por inventario: ${error.message}`,
      );
    }
  }

  /**
   * Exporta el reporte de Estado de Costo de Venta por inventario
   */
  @Get('exportar-por-inventario')
  @ApiOperation({
    summary: 'Exportar reporte de Estado de Costo de Venta por inventario',
    description:
      'Exporta el reporte anual de costo de venta por inventario en formato JSON (extensible a otros formatos)',
  })
  @ApiQuery({
    name: 'año',
    description: 'Año para el cual exportar el reporte',
    example: 2024,
    type: Number,
  })
  @ApiQuery({
    name: 'idAlmacen',
    description: 'ID del almacén (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'idProducto',
    description: 'ID del producto (opcional)',
    example: 1,
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'formato',
    description: 'Formato de exportación',
    example: 'json',
    enum: ['json'],
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte por inventario exportado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos o formato no soportado',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron datos para los filtros especificados',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async exportCostoVentaPorInventarioReport(
    @Query(new ValidationPipe({ transform: true }))
    query: CostoVentaPorInventarioRequestDto & { formato?: string },
  ): Promise<any> {
    try {
      const formato = query.formato || 'json';
      const { formato: _, ...requestData } = query;

      return await this.costoVentaService.exportCostoVentaPorInventarioReport(
        requestData as CostoVentaPorInventarioRequestDto,
        formato as 'json' | 'excel',
      );
    } catch (error) {
      throw new BadRequestException(
        `Error al exportar el reporte por inventario: ${error.message}`,
      );
    }
  }
}
