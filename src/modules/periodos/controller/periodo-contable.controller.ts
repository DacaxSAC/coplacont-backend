import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  Query
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { PeriodoContableService } from '../service/periodo-contable.service';
import {
  CreatePeriodoContableDto,
  UpdatePeriodoContableDto,
  ResponsePeriodoContableDto,
  CerrarPeriodoDto
} from '../dto';

/**
 * Controlador para gestionar períodos contables
 * Proporciona endpoints para CRUD y operaciones especiales de períodos
 */
@ApiTags('Períodos Contables')
@Controller('periodos-contables')
export class PeriodoContableController {
  constructor(
    private readonly periodoContableService: PeriodoContableService
  ) {}

  /**
   * Crear un nuevo período contable
   */
  @Post()
  @ApiOperation({
    summary: 'Crear período contable',
    description: 'Crea un nuevo período contable para una persona/empresa'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Período contable creado exitosamente',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe un período para ese año'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos'
  })
  async crear(
    @Body() createDto: CreatePeriodoContableDto
  ): Promise<ResponsePeriodoContableDto> {
    return this.periodoContableService.crear(createDto);
  }

  /**
   * Obtener todos los períodos de una persona
   */
  @Get('persona/:idPersona')
  @ApiOperation({
    summary: 'Obtener períodos por persona',
    description: 'Obtiene todos los períodos contables de una persona/empresa'
  })
  @ApiParam({
    name: 'idPersona',
    description: 'ID de la persona/empresa',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de períodos contables',
    type: [ResponsePeriodoContableDto]
  })
  async obtenerPorPersona(
    @Param('idPersona', ParseIntPipe) idPersona: number
  ): Promise<ResponsePeriodoContableDto[]> {
    return this.periodoContableService.obtenerPorPersona(idPersona);
  }

  /**
   * Obtener período activo de una persona
   */
  @Get('persona/:idPersona/activo')
  @ApiOperation({
    summary: 'Obtener período activo',
    description: 'Obtiene el período contable activo de una persona/empresa'
  })
  @ApiParam({
    name: 'idPersona',
    description: 'ID de la persona/empresa',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período contable activo',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No se encontró período activo'
  })
  async obtenerPeriodoActivo(
    @Param('idPersona', ParseIntPipe) idPersona: number
  ): Promise<ResponsePeriodoContableDto> {
    return this.periodoContableService.obtenerPeriodoActivo(idPersona);
  }

  /**
   * Obtener período por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener período por ID',
    description: 'Obtiene un período contable específico por su ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período contable',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período contable encontrado',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período contable no encontrado'
  })
  async obtenerPorId(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ResponsePeriodoContableDto> {
    const periodo = await this.periodoContableService.obtenerPorId(id);
    return this.periodoContableService['mapearAResponse'](periodo);
  }

  /**
   * Actualizar un período contable
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar período contable',
    description: 'Actualiza un período contable existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período contable',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período contable actualizado exitosamente',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período contable no encontrado'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede modificar un período cerrado'
  })
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePeriodoContableDto
  ): Promise<ResponsePeriodoContableDto> {
    return this.periodoContableService.actualizar(id, updateDto);
  }

  /**
   * Cerrar un período contable
   */
  @Put(':id/cerrar')
  @ApiOperation({
    summary: 'Cerrar período contable',
    description: 'Cierra un período contable, impidiendo futuras modificaciones'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período contable',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período contable cerrado exitosamente',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período contable no encontrado'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El período ya está cerrado'
  })
  async cerrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() cerrarDto: CerrarPeriodoDto
  ): Promise<ResponsePeriodoContableDto> {
    return this.periodoContableService.cerrar(id, cerrarDto);
  }

  /**
   * Reabrir un período contable
   */
  @Put(':id/reabrir')
  @ApiOperation({
    summary: 'Reabrir período contable',
    description: 'Reabre un período contable cerrado'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período contable',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período contable reabierto exitosamente',
    type: ResponsePeriodoContableDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período contable no encontrado'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El período no está cerrado'
  })
  async reabrir(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ResponsePeriodoContableDto> {
    return this.periodoContableService.reabrir(id);
  }

  /**
   * Eliminar un período contable
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar período contable',
    description: 'Elimina un período contable (solo si no está cerrado y no tiene comprobantes)'
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período contable',
    type: 'number'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Período contable eliminado exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período contable no encontrado'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede eliminar un período cerrado o con comprobantes'
  })
  async eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.periodoContableService.eliminar(id);
  }

  /**
   * Validar fecha en período activo
   */
  @Get('persona/:idPersona/validar-fecha')
  @ApiOperation({
    summary: 'Validar fecha en período activo',
    description: 'Valida si una fecha está dentro del período activo'
  })
  @ApiParam({
    name: 'idPersona',
    description: 'ID de la persona/empresa',
    type: 'number'
  })
  @ApiQuery({
    name: 'fecha',
    description: 'Fecha a validar (formato YYYY-MM-DD)',
    type: 'string'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado de la validación',
    schema: {
      type: 'object',
      properties: {
        valida: { type: 'boolean' },
        mensaje: { type: 'string' },
        periodo: { $ref: '#/components/schemas/ResponsePeriodoContableDto' }
      }
    }
  })
  async validarFechaEnPeriodoActivo(
    @Param('idPersona', ParseIntPipe) idPersona: number,
    @Query('fecha') fecha: string
  ) {
    const fechaValidar = new Date(fecha);
    return this.periodoContableService.validarFechaEnPeriodoActivo(
      idPersona,
      fechaValidar
    );
  }

  /**
   * Validar movimiento retroactivo
   */
  @Get('persona/:idPersona/validar-retroactivo')
  @ApiOperation({
    summary: 'Validar movimiento retroactivo',
    description: 'Valida si se permite un movimiento retroactivo según la configuración'
  })
  @ApiParam({
    name: 'idPersona',
    description: 'ID de la persona/empresa',
    type: 'number'
  })
  @ApiQuery({
    name: 'fecha',
    description: 'Fecha del movimiento (formato YYYY-MM-DD)',
    type: 'string'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado de la validación',
    schema: {
      type: 'object',
      properties: {
        permitido: { type: 'boolean' },
        mensaje: { type: 'string' }
      }
    }
  })
  async validarMovimientoRetroactivo(
    @Param('idPersona', ParseIntPipe) idPersona: number,
    @Query('fecha') fecha: string
  ) {
    const fechaMovimiento = new Date(fecha);
    return this.periodoContableService.validarMovimientoRetroactivo(
      idPersona,
      fechaMovimiento
    );
  }
}