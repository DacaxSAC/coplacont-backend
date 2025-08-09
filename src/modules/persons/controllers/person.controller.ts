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
import { PersonService } from '../services/person.service';
import { 
  CreatePersonDto, 
  UpdatePersonDto, 
  ActivateRoleDto, 
  PersonResponseDto,
  ApiResponseDto 
} from '../dto';

@ApiTags('Persons')
@Controller('api/persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva persona' })
  @ApiResponse({ 
    status: 201, 
    description: 'Persona creada exitosamente',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos o documento ya existe' 
  })
  create(@Body() createPersonDto: CreatePersonDto): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.create(createPersonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las personas activas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de personas obtenida exitosamente',
    type: [PersonResponseDto] 
  })
  findAll(): Promise<ApiResponseDto<PersonResponseDto[]>> {
    return this.personService.findAll();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Obtener solo los clientes activos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de clientes obtenida exitosamente',
    type: [PersonResponseDto] 
  })
  findClients(): Promise<ApiResponseDto<PersonResponseDto[]>> {
    return this.personService.findClients();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Obtener solo los proveedores activos' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de proveedores obtenida exitosamente',
    type: [PersonResponseDto] 
  })
  findProviders(): Promise<ApiResponseDto<PersonResponseDto[]>> {
    return this.personService.findProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una persona por ID' })
  @ApiParam({ name: 'id', description: 'ID de la persona' })
  @ApiResponse({ 
    status: 200, 
    description: 'Persona encontrada',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada' 
  })
  findById(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.findById(id);
  }

  @Get('document/:documentNumber')
  @ApiOperation({ summary: 'Buscar persona por número de documento' })
  @ApiParam({ name: 'documentNumber', description: 'Número de documento' })
  @ApiResponse({ 
    status: 200, 
    description: 'Persona encontrada',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada' 
  })
  findByDocumentNumber(@Param('documentNumber') documentNumber: string): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.findByDocumentNumber(documentNumber);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos principales de una persona' })
  @ApiParam({ name: 'id', description: 'ID de la persona' })
  @ApiResponse({ 
    status: 200, 
    description: 'Persona actualizada exitosamente',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada' 
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonDto: UpdatePersonDto
  ): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.update(id, updatePersonDto);
  }

  @Patch(':id/activate-roles')
  @ApiOperation({ 
    summary: 'Activar roles de una persona',
    description: 'Solo permite activar roles (cliente o proveedor), no desactivarlos'
  })
  @ApiParam({ name: 'id', description: 'ID de la persona' })
  @ApiResponse({ 
    status: 200, 
    description: 'Roles activados exitosamente',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'No se pueden desactivar roles' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada' 
  })
  activateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() activateRoleDto: ActivateRoleDto
  ): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.activateRole(id, activateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Eliminar una persona (soft delete)',
    description: 'Marca la persona como inactiva sin eliminarla físicamente'
  })
  @ApiParam({ name: 'id', description: 'ID de la persona' })
  @ApiResponse({ 
    status: 204, 
    description: 'Persona eliminada exitosamente' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada' 
  })
  softDelete(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<null>> {
    return this.personService.softDelete(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ 
    summary: 'Restaurar una persona eliminada',
    description: 'Reactiva una persona que fue eliminada con soft delete'
  })
  @ApiParam({ name: 'id', description: 'ID de la persona' })
  @ApiResponse({ 
    status: 200, 
    description: 'Persona restaurada exitosamente',
    type: PersonResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Persona no encontrada o ya está activa' 
  })
  restore(@Param('id', ParseIntPipe) id: number): Promise<ApiResponseDto<PersonResponseDto>> {
    return this.personService.restore(id);
  }
}