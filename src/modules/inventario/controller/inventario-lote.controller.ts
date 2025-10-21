import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { InventarioLoteService } from '../service/inventario-lote.service';
import { CreateInventarioLoteDto } from '../dto/inventario-lote/create-inventario-lote.dto';
import { UpdateInventarioLoteDto } from '../dto/inventario-lote/update-inventario-lote.dto';
import { ResponseInventarioLoteDto } from '../dto/inventario-lote/response-inventario-lote.dto';
import { plainToClass } from 'class-transformer';

/**
 * Controlador para la gestión de lotes de inventario
 * Maneja las operaciones CRUD y consultas específicas de lotes para el Kardex
 */
@ApiTags('Inventario Lotes')
@Controller('/api/inventario-lote')
@UseInterceptors(ClassSerializerInterceptor)
export class InventarioLoteController {
  constructor(private readonly inventarioLoteService: InventarioLoteService) {}

  /**
   * Crear un nuevo lote de inventario
   */
  @Post()
  @ApiOperation({
    summary: 'Crear lote de inventario',
    description:
      'Crea un nuevo lote de inventario para el control de costos y Kardex',
  })
  @ApiBody({ type: CreateInventarioLoteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lote creado exitosamente',
    type: ResponseInventarioLoteDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventario no encontrado',
  })
  async create(
    @Body() createInventarioLoteDto: CreateInventarioLoteDto,
  ): Promise<ResponseInventarioLoteDto> {
    const lote = await this.inventarioLoteService.create(
      createInventarioLoteDto,
    );
    return plainToClass(ResponseInventarioLoteDto, lote);
  }

  /**
   * Obtener todos los lotes
   */
  @Get()
  @ApiOperation({
    summary: 'Listar lotes',
    description: 'Obtiene todos los lotes de inventario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de lotes obtenida exitosamente',
    type: [ResponseInventarioLoteDto],
  })
  async findAll(): Promise<ResponseInventarioLoteDto[]> {
    const lotes = await this.inventarioLoteService.findAll();
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Obtener un lote por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener lote por ID',
    description: 'Obtiene un lote específico por su ID',
  })
  @ApiParam({ name: 'id', description: 'ID del lote', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lote encontrado',
    type: ResponseInventarioLoteDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lote no encontrado',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseInventarioLoteDto> {
    const lote = await this.inventarioLoteService.findOne(id);
    return plainToClass(ResponseInventarioLoteDto, lote);
  }

  /**
   * Obtener lotes por inventario
   */
  @Get('inventario/:idInventario')
  @ApiOperation({
    summary: 'Obtener lotes por inventario',
    description: 'Obtiene todos los lotes de un inventario específico',
  })
  @ApiParam({
    name: 'idInventario',
    description: 'ID del inventario',
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lotes del inventario obtenidos exitosamente',
    type: [ResponseInventarioLoteDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Inventario no encontrado',
  })
  async findByInventario(
    @Param('idInventario', ParseIntPipe) idInventario: number,
  ): Promise<ResponseInventarioLoteDto[]> {
    const lotes =
      await this.inventarioLoteService.findByInventario(idInventario);
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Obtener lotes activos (con cantidad > 0)
   */
  @Get('reportes/activos')
  @ApiOperation({
    summary: 'Obtener lotes activos',
    description: 'Obtiene todos los lotes que tienen cantidad disponible',
  })
  @ApiQuery({
    name: 'idInventario',
    description: 'ID del inventario (opcional)',
    type: 'number',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lotes activos obtenidos exitosamente',
    type: [ResponseInventarioLoteDto],
  })
  async findActiveLotes(
    @Query('idInventario') idInventario?: number,
  ): Promise<ResponseInventarioLoteDto[]> {
    const lotes =
      await this.inventarioLoteService.findActiveLotes(idInventario);
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Obtener lotes próximos a vencer
   */
  @Get('reportes/proximos-vencer')
  @ApiOperation({
    summary: 'Obtener lotes próximos a vencer',
    description:
      'Obtiene los lotes que están próximos a vencer en los días especificados',
  })
  @ApiQuery({
    name: 'dias',
    description: 'Días de anticipación (por defecto 30)',
    type: 'number',
    required: false,
  })
  @ApiQuery({
    name: 'idInventario',
    description: 'ID del inventario (opcional)',
    type: 'number',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lotes próximos a vencer obtenidos exitosamente',
    type: [ResponseInventarioLoteDto],
  })
  async findLotesProximosVencer(
    @Query('dias') dias?: number,
    @Query('idInventario') idInventario?: number,
  ): Promise<ResponseInventarioLoteDto[]> {
    const lotes = await this.inventarioLoteService.findLotesProximosVencer(
      dias,
      idInventario,
    );
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Obtener lotes vencidos
   */
  @Get('reportes/vencidos')
  @ApiOperation({
    summary: 'Obtener lotes vencidos',
    description: 'Obtiene todos los lotes que ya han vencido',
  })
  @ApiQuery({
    name: 'idInventario',
    description: 'ID del inventario (opcional)',
    type: 'number',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lotes vencidos obtenidos exitosamente',
    type: [ResponseInventarioLoteDto],
  })
  async findLotesVencidos(
    @Query('idInventario') idInventario?: number,
  ): Promise<ResponseInventarioLoteDto[]> {
    const lotes =
      await this.inventarioLoteService.findLotesVencidos(idInventario);
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Buscar lotes por número de lote
   */
  @Get('buscar/numero-lote/:numeroLote')
  @ApiOperation({
    summary: 'Buscar por número de lote',
    description: 'Busca lotes por su número de lote',
  })
  @ApiParam({
    name: 'numeroLote',
    description: 'Número de lote a buscar',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lotes encontrados',
    type: [ResponseInventarioLoteDto],
  })
  async findByNumeroLote(
    @Param('numeroLote') numeroLote: string,
  ): Promise<ResponseInventarioLoteDto[]> {
    const lotes = await this.inventarioLoteService.findByNumeroLote(numeroLote);
    return lotes.map((lote) => plainToClass(ResponseInventarioLoteDto, lote));
  }

  /**
   * Obtener costo promedio ponderado
   */
  @Get('reportes/costo-promedio/:idInventario')
  @ApiOperation({
    summary: 'Obtener costo promedio ponderado',
    description:
      'Calcula el costo promedio ponderado de un inventario basado en sus lotes activos',
  })
  @ApiParam({
    name: 'idInventario',
    description: 'ID del inventario',
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Costo promedio calculado exitosamente',
    schema: {
      type: 'object',
      properties: {
        idInventario: { type: 'number', example: 1 },
        costoPromedioPonderado: { type: 'number', example: 15.75 },
      },
    },
  })
  async getCostoPromedioPonderado(
    @Param('idInventario', ParseIntPipe) idInventario: number,
  ): Promise<any> {
    const costoPromedio =
      await this.inventarioLoteService.getCostoPromedioPonderado(idInventario);
    return {
      idInventario,
      costoPromedioPonderado: costoPromedio,
    };
  }

  /**
   * Actualizar un lote
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar lote',
    description: 'Actualiza un lote de inventario existente',
  })
  @ApiParam({ name: 'id', description: 'ID del lote', type: 'number' })
  @ApiBody({ type: UpdateInventarioLoteDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lote actualizado exitosamente',
    type: ResponseInventarioLoteDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lote no encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInventarioLoteDto: UpdateInventarioLoteDto,
  ): Promise<ResponseInventarioLoteDto> {
    const lote = await this.inventarioLoteService.update(
      id,
      updateInventarioLoteDto,
    );
    return plainToClass(ResponseInventarioLoteDto, lote);
  }

  /**
   * Consumir stock de lotes (método FIFO)
   */
  @Post('consumir/:idInventario')
  @ApiOperation({
    summary: 'Consumir stock (FIFO)',
    description:
      'Consume stock de los lotes usando el método FIFO (primero en entrar, primero en salir)',
  })
  @ApiParam({
    name: 'idInventario',
    description: 'ID del inventario',
    type: 'number',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cantidad: {
          type: 'number',
          description: 'Cantidad a consumir',
          example: 25.5,
        },
      },
      required: ['cantidad'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock consumido exitosamente',
    schema: {
      type: 'object',
      properties: {
        lotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              numeroLote: { type: 'string' },
              cantidadConsumida: { type: 'number' },
              costoTotal: { type: 'number' },
              // costoUnitario se calcula dinámicamente
            },
          },
        },
        cantidadConsumida: { type: 'number' },
        costoPromedio: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cantidad inválida o stock insuficiente',
  })
  async consumirStock(
    @Param('idInventario', ParseIntPipe) idInventario: number,
    @Body('cantidad') cantidad: number,
  ): Promise<any> {
    return await this.inventarioLoteService.consumirStock(
      idInventario,
      cantidad,
    );
  }

  /**
   * Eliminar un lote (soft delete)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar lote',
    description:
      'Elimina un lote de inventario (soft delete - marca como inactivo)',
  })
  @ApiParam({ name: 'id', description: 'ID del lote', type: 'number' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lote eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Lote no encontrado',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return await this.inventarioLoteService.remove(id);
  }
}
