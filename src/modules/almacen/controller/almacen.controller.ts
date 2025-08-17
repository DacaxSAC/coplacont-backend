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
    ParseFloatPipe
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiConflictResponse
} from '@nestjs/swagger';
import { AlmacenService } from '../service/almacen.service';
import { CreateAlmacenDto, UpdateAlmacenDto, ResponseAlmacenDto } from '../dto';

/**
 * Controlador para gestionar las operaciones CRUD de almacenes
 * Proporciona endpoints REST para la gestión de almacenes
 */
@ApiTags('Almacenes')
@Controller('/api/almacenes')
export class AlmacenController {

    constructor(private readonly almacenService: AlmacenService) {}

    /**
     * Crear un nuevo almacén
     */
    @Post()
    @ApiOperation({ 
        summary: 'Crear nuevo almacén',
        description: 'Crea un nuevo almacén' 
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Almacén creado exitosamente',
        type: ResponseAlmacenDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @ApiConflictResponse({ description: 'Ya existe un almacén con este nombre' })
    async create(@Body() createAlmacenDto: CreateAlmacenDto): Promise<ResponseAlmacenDto> {
        return await this.almacenService.create(createAlmacenDto);
    }

    /**
     * Obtener todos los almacenes
     */
    @Get()
    @ApiOperation({ 
        summary: 'Obtener todos los almacenes',
        description: 'Obtiene la lista de todos los almacenes. Por defecto solo retorna almacenes activos.' 
    })
    @ApiQuery({ 
        name: 'includeInactive', 
        required: false, 
        type: Boolean,
        description: 'Si es true, incluye almacenes inactivos. Por defecto false (solo activos)' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de almacenes obtenida exitosamente',
        type: [ResponseAlmacenDto] 
    })
    async findAll(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean): Promise<ResponseAlmacenDto[]> {
        return await this.almacenService.findAll(includeInactive || false);
    }

    /**
     * Obtener un almacén por ID
     */
    @Get(':id')
    @ApiOperation({ 
        summary: 'Obtener almacén por ID',
        description: 'Obtiene un almacén específico por su ID' 
    })
    @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacén encontrado',
        type: ResponseAlmacenDto 
    })
    @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResponseAlmacenDto> {
        return await this.almacenService.findOne(id);
    }

    /**
     * Actualizar un almacén
     */
    @Patch(':id')
    @ApiOperation({ 
        summary: 'Actualizar almacén',
        description: 'Actualiza un almacén existente' 
    })
    @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacén actualizado exitosamente',
        type: ResponseAlmacenDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
    @ApiConflictResponse({ description: 'Ya existe un almacén con este nombre' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAlmacenDto: UpdateAlmacenDto
    ): Promise<ResponseAlmacenDto> {
        return await this.almacenService.update(id, updateAlmacenDto);
    }

    /**
     * Eliminar un almacén (soft delete)
     */
    @Delete(':id')
    @ApiOperation({ 
        summary: 'Eliminar almacén',
        description: 'Elimina un almacén (soft delete)' 
    })
    @ApiParam({ name: 'id', description: 'ID del almacén', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacén eliminado exitosamente' 
    })
    @ApiNotFoundResponse({ description: 'Almacén no encontrado' })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        await this.almacenService.remove(id);
        return { message: 'Almacén eliminado exitosamente' };
    }

    /**
     * Buscar almacenes por nombre
     */
    @Get('search/by-name')
    @ApiOperation({ 
        summary: 'Buscar almacenes por nombre',
        description: 'Busca almacenes que contengan el nombre especificado' 
    })
    @ApiQuery({ 
        name: 'nombre', 
        required: true, 
        type: String,
        description: 'Nombre a buscar' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacenes encontrados',
        type: [ResponseAlmacenDto] 
    })
    async findByName(@Query('nombre') nombre: string): Promise<ResponseAlmacenDto[]> {
        return await this.almacenService.findByName(nombre);
    }

    /**
     * Buscar almacenes por ubicación
     */
    @Get('search/by-location')
    @ApiOperation({ 
        summary: 'Buscar almacenes por ubicación',
        description: 'Busca almacenes que contengan la ubicación especificada' 
    })
    @ApiQuery({ 
        name: 'ubicacion', 
        required: true, 
        type: String,
        description: 'Ubicación a buscar' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacenes encontrados',
        type: [ResponseAlmacenDto] 
    })
    async findByLocation(@Query('ubicacion') ubicacion: string): Promise<ResponseAlmacenDto[]> {
        return await this.almacenService.findByLocation(ubicacion);
    }

    /**
     * Buscar almacenes por responsable
     */
    @Get('search/by-responsible')
    @ApiOperation({ 
        summary: 'Buscar almacenes por responsable',
        description: 'Busca almacenes que contengan el responsable especificado' 
    })
    @ApiQuery({ 
        name: 'responsable', 
        required: true, 
        type: String,
        description: 'Responsable a buscar' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacenes encontrados',
        type: [ResponseAlmacenDto] 
    })
    async findByResponsible(@Query('responsable') responsable: string): Promise<ResponseAlmacenDto[]> {
        return await this.almacenService.findByResponsible(responsable);
    }

    /**
     * Buscar almacenes por capacidad mínima
     */
    @Get('search/by-min-capacity')
    @ApiOperation({ 
        summary: 'Buscar almacenes por capacidad mínima',
        description: 'Busca almacenes con capacidad mayor o igual a la especificada' 
    })
    @ApiQuery({ 
        name: 'minCapacidad', 
        required: true, 
        type: Number,
        description: 'Capacidad mínima en m²' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Almacenes encontrados',
        type: [ResponseAlmacenDto] 
    })
    async findByMinCapacity(@Query('minCapacidad', ParseFloatPipe) minCapacidad: number): Promise<ResponseAlmacenDto[]> {
        return await this.almacenService.findByMinCapacity(minCapacidad);
    }
}