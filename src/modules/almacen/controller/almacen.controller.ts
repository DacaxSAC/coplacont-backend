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
  ParseBoolPipe,
  ParseFloatPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';
import { CurrentUser } from '../../users/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../users/decorators/current-user.decorator';
import { AlmacenService } from '../service/almacen.service';
import { CreateAlmacenDto, UpdateAlmacenDto, ResponseAlmacenDto } from '../dto';

/**
 * Controlador para gestionar las operaciones CRUD de almacenes
 * Proporciona endpoints REST para la gestión de almacenes
 * Requiere autenticación JWT y filtra por empresa del usuario
 */
@ApiTags('Almacenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/almacenes')
export class AlmacenController {
  constructor(private readonly almacenService: AlmacenService) {}

  /**
   * Crear un nuevo almacén
   */
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo almacén para la empresa',
    description:
      'Crea un nuevo almacén asociado a la empresa del usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Almacén creado exitosamente',
    type: ResponseAlmacenDto,
  })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @ApiConflictResponse({ description: 'Ya existe un almacén con este nombre' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createAlmacenDto: CreateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.create(user.personaId, createAlmacenDto);
  }

  /**
   * Obtener todos los almacenes de la empresa
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los almacenes de la empresa',
    description:
      'Obtiene la lista de todos los almacenes de la empresa del usuario autenticado. Por defecto solo retorna almacenes activos.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description:
      'Si es true, incluye almacenes inactivos. Por defecto false (solo activos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de almacenes obtenida exitosamente',
    type: [ResponseAlmacenDto],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<ResponseAlmacenDto[]> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findAll(
      user.personaId,
      includeInactive || false,
    );
  }

  /**
   * Obtener un almacén por ID de la empresa
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener almacén por ID de la empresa',
    description:
      'Obtiene un almacén específico por su ID que pertenezca a la empresa del usuario autenticado',
  })
  @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Almacén encontrado',
    type: ResponseAlmacenDto,
  })
  @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAlmacenDto> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findOne(user.personaId, id);
  }

  /**
   * Actualizar un almacén de la empresa
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar almacén de la empresa',
    description:
      'Actualiza un almacén existente que pertenezca a la empresa del usuario autenticado',
  })
  @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Almacén actualizado exitosamente',
    type: ResponseAlmacenDto,
  })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
  @ApiConflictResponse({ description: 'Ya existe un almacén con este nombre' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAlmacenDto: UpdateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.update(
      user.personaId,
      id,
      updateAlmacenDto,
    );
  }

  /**
   * Eliminar un almacén de la empresa (soft delete)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar almacén de la empresa',
    description:
      'Elimina un almacén que pertenezca a la empresa del usuario autenticado (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Almacén eliminado exitosamente',
    type: ResponseAlmacenDto,
  })
  @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseAlmacenDto> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.remove(user.personaId, id);
  }

  /**
   * Buscar almacenes por nombre en la empresa
   */
  @Get('search/by-name')
  @ApiOperation({
    summary: 'Buscar almacenes por nombre en la empresa',
    description:
      'Busca almacenes que contengan el nombre especificado dentro de la empresa del usuario autenticado',
  })
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
    description: 'Nombre a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Almacenes encontrados',
    type: [ResponseAlmacenDto],
  })
  async findByName(
    @CurrentUser() user: AuthenticatedUser,
    @Query('nombre') nombre: string,
  ): Promise<ResponseAlmacenDto[]> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findByName(user.personaId, nombre);
  }

  /**
   * Buscar almacenes por ubicación en la empresa
   */
  @Get('search/by-location')
  @ApiOperation({
    summary: 'Buscar almacenes por ubicación en la empresa',
    description:
      'Busca almacenes que contengan la ubicación especificada dentro de la empresa del usuario autenticado',
  })
  @ApiQuery({
    name: 'ubicacion',
    required: true,
    type: String,
    description: 'Ubicación a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Almacenes encontrados',
    type: [ResponseAlmacenDto],
  })
  async findByLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Query('ubicacion') ubicacion: string,
  ): Promise<ResponseAlmacenDto[]> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findByLocation(user.personaId, ubicacion);
  }

  /**
   * Buscar almacenes por responsable en la empresa
   */
  @Get('search/by-responsible')
  @ApiOperation({
    summary: 'Buscar almacenes por responsable en la empresa',
    description:
      'Busca almacenes que contengan el responsable especificado dentro de la empresa del usuario autenticado',
  })
  @ApiQuery({
    name: 'responsable',
    required: true,
    type: String,
    description: 'Responsable a buscar',
  })
  @ApiResponse({
    status: 200,
    description: 'Almacenes encontrados',
    type: [ResponseAlmacenDto],
  })
  async findByResponsible(
    @CurrentUser() user: AuthenticatedUser,
    @Query('responsable') responsable: string,
  ): Promise<ResponseAlmacenDto[]> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findByResponsible(
      user.personaId,
      responsable,
    );
  }

  /**
   * Buscar almacenes por capacidad mínima en la empresa
   */
  @Get('search/by-min-capacity')
  @ApiOperation({
    summary: 'Buscar almacenes por capacidad mínima en la empresa',
    description:
      'Busca almacenes con capacidad mayor o igual a la especificada dentro de la empresa del usuario autenticado',
  })
  @ApiQuery({
    name: 'minCapacidad',
    required: true,
    type: Number,
    description: 'Capacidad mínima en m²',
  })
  @ApiResponse({
    status: 200,
    description: 'Almacenes encontrados',
    type: [ResponseAlmacenDto],
  })
  async findByMinCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Query('minCapacidad', ParseFloatPipe) minCapacidad: number,
  ): Promise<ResponseAlmacenDto[]> {
    if (!user.personaId) {
      throw new Error('Usuario no tiene empresa asociada');
    }
    return await this.almacenService.findByMinCapacity(
      user.personaId,
      minCapacidad,
    );
  }
}
