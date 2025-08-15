import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { KardexService } from '../services/kardex.service';
import {
  KardexFilterDto,
  KardexMovementDto,
  StockBalanceResponseDto,
  ValuationReportDto,
} from '../dto';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

/**
 * Controlador para gestionar las operaciones del Kardex
 * Proporciona endpoints para consultas de movimientos de inventario
 */
@ApiTags('Kardex')
@Controller('kardex')
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  /**
   * Obtener historial de movimientos de inventario
   */
  @Get('movements')
  @ApiOperation({
    summary: 'Obtener historial de movimientos',
    description: 'Obtiene el historial de movimientos de inventario con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de movimientos obtenido exitosamente',
    type: [KardexMovementDto],
  })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
  @ApiQuery({ name: 'idProducto', required: false, type: Number, description: 'ID del producto' })
  @ApiQuery({ name: 'idAlmacen', required: false, type: Number, description: 'ID del almacén' })
  @ApiQuery({ name: 'idInventario', required: false, type: Number, description: 'ID del inventario' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String, description: 'Fecha de inicio (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fechaFin', required: false, type: String, description: 'Fecha de fin (YYYY-MM-DD)' })
  @ApiQuery({ name: 'tipoOperacion', required: false, enum: ['ENTRADA', 'SALIDA'], description: 'Tipo de operación' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página', example: 10 })
  async getMovementHistory(
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ) {
    return await this.kardexService.getMovementHistory(filter);
  }

  /**
   * Obtener balance actual de stock
   */
  @Get('stock-balance')
  @ApiOperation({
    summary: 'Obtener balance actual de stock',
    description: 'Obtiene el balance actual de stock por producto y almacén',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance de stock obtenido exitosamente',
    type: StockBalanceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
  @ApiQuery({ name: 'idProducto', required: false, type: Number, description: 'ID del producto' })
  @ApiQuery({ name: 'idAlmacen', required: false, type: Number, description: 'ID del almacén' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página', example: 10 })
  async getCurrentStockBalance(
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ): Promise<StockBalanceResponseDto> {
    return await this.kardexService.getCurrentStockBalance(filter);
  }

  /**
   * Obtener reporte de valoración de inventario
   */
  @Get('valuation-report')
  @ApiOperation({
    summary: 'Obtener reporte de valoración',
    description: 'Obtiene un reporte de valoración de inventario comparando métodos FIFO, LIFO y promedio ponderado',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de valoración obtenido exitosamente',
    type: ValuationReportDto,
  })
  @ApiBadRequestResponse({ description: 'Parámetros de consulta inválidos' })
  @ApiQuery({ name: 'idProducto', required: false, type: Number, description: 'ID del producto' })
  @ApiQuery({ name: 'idAlmacen', required: false, type: Number, description: 'ID del almacén' })
  @ApiQuery({ name: 'metodoValoracion', required: false, enum: MetodoValoracion, description: 'Método de valoración principal' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página', example: 10 })
  async getValuationReport(
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
    @Query('metodoValoracion') metodoValoracion: MetodoValoracion = MetodoValoracion.FIFO,
  ): Promise<ValuationReportDto> {
    return await this.kardexService.getValuationReport(filter, metodoValoracion);
  }

  /**
   * Obtener movimientos por producto específico
   */
  @Get('product/:id/movements')
  @ApiOperation({
    summary: 'Obtener movimientos por producto',
    description: 'Obtiene todos los movimientos de un producto específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimientos del producto obtenidos exitosamente',
    type: [KardexMovementDto],
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  async getMovementsByProduct(
    @Query('id', ParseIntPipe) idProducto: number,
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ) {
    const productFilter = { ...filter, idProducto };
    return await this.kardexService.getMovementHistory(productFilter);
  }

  /**
   * Obtener movimientos por almacén específico
   */
  @Get('warehouse/:id/movements')
  @ApiOperation({
    summary: 'Obtener movimientos por almacén',
    description: 'Obtiene todos los movimientos de un almacén específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Movimientos del almacén obtenidos exitosamente',
    type: [KardexMovementDto],
  })
  @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
  async getMovementsByWarehouse(
    @Query('id', ParseIntPipe) idAlmacen: number,
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ) {
    const warehouseFilter = { ...filter, idAlmacen };
    return await this.kardexService.getMovementHistory(warehouseFilter);
  }

  /**
   * Obtener balance de stock por almacén
   */
  @Get('warehouse/:id/stock-balance')
  @ApiOperation({
    summary: 'Obtener balance de stock por almacén',
    description: 'Obtiene el balance de stock de todos los productos en un almacén específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance de stock del almacén obtenido exitosamente',
    type: StockBalanceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
  async getStockBalanceByWarehouse(
    @Query('id', ParseIntPipe) idAlmacen: number,
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ): Promise<StockBalanceResponseDto> {
    const warehouseFilter = { ...filter, idAlmacen };
    return await this.kardexService.getCurrentStockBalance(warehouseFilter);
  }

  /**
   * Obtener balance de stock por producto
   */
  @Get('product/:id/stock-balance')
  @ApiOperation({
    summary: 'Obtener balance de stock por producto',
    description: 'Obtiene el balance de stock de un producto en todos los almacenes',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance de stock del producto obtenido exitosamente',
    type: StockBalanceResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  async getStockBalanceByProduct(
    @Query('id', ParseIntPipe) idProducto: number,
    @Query(new ValidationPipe({ transform: true })) filter: KardexFilterDto,
  ): Promise<StockBalanceResponseDto> {
    const productFilter = { ...filter, idProducto };
    return await this.kardexService.getCurrentStockBalance(productFilter);
  }
}