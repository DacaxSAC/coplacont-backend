import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EntidadService } from '../services';
import {
  CreateEntidadDto,
  UpdateEntidadDto,
  ActivateRoleDto,
  EntidadResponseDto,
  ApiResponseDto,
} from '../dto';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';
import { CurrentUser } from '../../users/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../users/decorators/current-user.decorator';

@ApiTags('Entidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/entidades')
export class EntidadController {
  constructor(private readonly entidadService: EntidadService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva entidad' })
  @ApiResponse({
    status: 201,
    description: 'Entidad creada exitosamente',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o documento ya existe',
  })
  create(
    @Body() createEntidadDto: CreateEntidadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.create(createEntidadDto, user.personaId);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las entidades',
    description: 'Por defecto solo retorna entidades activas',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description:
      'Si es true, incluye entidades inactivas. Por defecto false (solo activas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de entidades obtenida exitosamente',
    type: [EntidadResponseDto],
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.findAll(
      user.personaId,
      includeInactive || false,
    );
  }

  @Get('clients')
  @ApiOperation({
    summary: 'Obtener solo los clientes',
    description: 'Por defecto solo retorna clientes activos',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description:
      'Si es true, incluye clientes inactivos. Por defecto false (solo activos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes obtenida exitosamente',
    type: [EntidadResponseDto],
  })
  findClients(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.findClients(
      user.personaId,
      includeInactive || false,
    );
  }

  @Get('providers')
  @ApiOperation({
    summary: 'Obtener solo los proveedores',
    description: 'Por defecto solo retorna proveedores activos',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description:
      'Si es true, incluye proveedores inactivos. Por defecto false (solo activos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de proveedores obtenida exitosamente',
    type: [EntidadResponseDto],
  })
  findProviders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.findProviders(
      user.personaId,
      includeInactive || false,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una entidad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Entidad encontrada',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada',
  })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.findById(id, user.personaId);
  }

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Buscar entidad por número de documento' })
  @ApiParam({ name: 'documentNumber', description: 'Número de documento' })
  @ApiResponse({
    status: 200,
    description: 'Entidad encontrada',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada',
  })
  findByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.findByDocumentNumber(
      documentNumber,
      user.personaId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos principales de una entidad' })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Entidad actualizada exitosamente',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEntidadDto: UpdateEntidadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.update(id, user.personaId, updateEntidadDto);
  }

  @Patch(':id/activate-roles')
  @ApiOperation({
    summary: 'Activar roles de una entidad',
    description:
      'Solo permite activar roles (cliente o proveedor), no desactivarlos',
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Roles activados exitosamente',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se pueden desactivar roles',
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada',
  })
  activateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() activateRoleDto: ActivateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.activateRole(
      id,
      user.personaId,
      activateRoleDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar una entidad (soft delete)',
    description: 'Marca la entidad como inactiva sin eliminarla físicamente',
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({
    status: 204,
    description: 'Entidad eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada',
  })
  softDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<null>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.softDelete(id, user.personaId);
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restaurar una entidad eliminada',
    description: 'Reactiva una entidad que fue eliminada con soft delete',
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({
    status: 200,
    description: 'Entidad restaurada exitosamente',
    type: EntidadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entidad no encontrada o ya está activa',
  })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    if (!user.personaId) {
      throw new UnauthorizedException('Usuario no tiene una empresa asociada');
    }
    return this.entidadService.restore(id, user.personaId);
  }
}
