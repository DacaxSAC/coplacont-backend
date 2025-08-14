import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Patch, 
  Post, 
  Delete,
  ParseIntPipe,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EntidadService } from '../services';
import { 
  CreateEntidadDto, 
  UpdateEntidadDto, 
  ActivateRoleDto, 
  EntidadResponseDto,
  ApiResponseDto 
} from '../dto';

@ApiTags('Entidades')
@Controller('api/entidades')
export class EntidadController {
  constructor(private readonly entidadService: EntidadService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva entidad' })
  @ApiResponse({ 
    status: 201, 
    description: 'Entidad creada exitosamente',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos o documento ya existe' 
  })
  create(@Body() createEntidadDto: CreateEntidadDto): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.create(createEntidadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las entidades activas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de entidades obtenida exitosamente',
    type: [EntidadResponseDto] 
  })
  findAll(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    return this.entidadService.findAll();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Obtener solo los clientes activos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de clientes obtenida exitosamente',
    type: [EntidadResponseDto] 
  })
  findClients(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    return this.entidadService.findClients();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Obtener solo los proveedores activos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de proveedores obtenida exitosamente',
    type: [EntidadResponseDto] 
  })
  findProviders(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    return this.entidadService.findProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una entidad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Entidad encontrada',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada' 
  })
  findById(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.findById(id);
  }

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Buscar entidad por número de documento' })
  @ApiParam({ name: 'documentNumber', description: 'Número de documento' })
  @ApiResponse({ 
    status: 200, 
    description: 'Entidad encontrada',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada' 
  })
  findByDocumentNumber(@Param('documentNumber') documentNumber: string): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.findByDocumentNumber(documentNumber);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos principales de una entidad' })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Entidad actualizada exitosamente',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada' 
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEntidadDto: UpdateEntidadDto
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.update(id, updateEntidadDto);
  }

  @Patch(':id/activate-roles')
  @ApiOperation({ 
    summary: 'Activar roles de una entidad',
    description: 'Solo permite activar roles (cliente o proveedor), no desactivarlos'
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Roles activados exitosamente',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'No se pueden desactivar roles' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada' 
  })
  activateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() activateRoleDto: ActivateRoleDto
  ): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.activateRole(id, activateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Eliminar una entidad (soft delete)',
    description: 'Marca la entidad como inactiva sin eliminarla físicamente'
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({ 
    status: 204, 
    description: 'Entidad eliminada exitosamente' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada' 
  })
  softDelete(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<null>> {
    return this.entidadService.softDelete(id);
  }

  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Restaurar una entidad eliminada',
    description: 'Reactiva una entidad que fue eliminada con soft delete'
  })
  @ApiParam({ name: 'id', description: 'ID de la entidad' })
  @ApiResponse({ 
    status: 200, 
    description: 'Entidad restaurada exitosamente',
    type: EntidadResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Entidad no encontrada o ya está activa' 
  })
  restore(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<EntidadResponseDto>> {
    return this.entidadService.restore(id);
  }
}