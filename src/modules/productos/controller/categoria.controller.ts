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
    ParseBoolPipe
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
import { CategoriaService } from '../service/categoria.service';
import { CreateCategoriaDto, UpdateCategoriaDto, ResponseCategoriaDto } from '../dto';

/**
 * Controlador para gestionar las operaciones CRUD de categorías
 * Proporciona endpoints REST para la gestión de categorías de productos
 */
@ApiTags('Categorías')
@Controller('/api/categorias')
export class CategoriaController {

    constructor(private readonly categoriaService: CategoriaService) {}

    /**
     * Crear una nueva categoría
     */
    @Post()
    @ApiOperation({ 
        summary: 'Crear nueva categoría',
        description: 'Crea una nueva categoría de productos' 
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Categoría creada exitosamente',
        type: ResponseCategoriaDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @ApiConflictResponse({ description: 'Ya existe una categoría con este nombre' })
    async create(@Body() createCategoriaDto: CreateCategoriaDto): Promise<ResponseCategoriaDto> {
        return await this.categoriaService.create(createCategoriaDto);
    }

    /**
     * Obtener todas las categorías
     */
    @Get()
    @ApiOperation({ 
        summary: 'Obtener todas las categorías',
        description: 'Obtiene la lista de todas las categorías' 
    })
    @ApiQuery({ 
        name: 'includeInactive', 
        required: false, 
        type: Boolean,
        description: 'Incluir categorías inactivas' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de categorías obtenida exitosamente',
        type: [ResponseCategoriaDto] 
    })
    async findAll(
        @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean
    ): Promise<ResponseCategoriaDto[]> {
        return await this.categoriaService.findAll(includeInactive || false);
    }

    /**
     * Obtener una categoría por ID
     */
    @Get(':id')
    @ApiOperation({ 
        summary: 'Obtener categoría por ID',
        description: 'Obtiene una categoría específica por su ID' 
    })
    @ApiParam({ name: 'id', description: 'ID de la categoría', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Categoría encontrada',
        type: ResponseCategoriaDto 
    })
    @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResponseCategoriaDto> {
        return await this.categoriaService.findOne(id);
    }

    /**
     * Actualizar una categoría
     */
    @Patch(':id')
    @ApiOperation({ 
        summary: 'Actualizar categoría',
        description: 'Actualiza una categoría existente' 
    })
    @ApiParam({ name: 'id', description: 'ID de la categoría', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Categoría actualizada exitosamente',
        type: ResponseCategoriaDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
    @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
    @ApiConflictResponse({ description: 'Ya existe una categoría con este nombre' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCategoriaDto: UpdateCategoriaDto
    ): Promise<ResponseCategoriaDto> {
        return await this.categoriaService.update(id, updateCategoriaDto);
    }

    /**
     * Eliminar una categoría (soft delete)
     */
    @Delete(':id')
    @ApiOperation({ 
        summary: 'Eliminar categoría',
        description: 'Elimina una categoría (soft delete)' 
    })
    @ApiParam({ name: 'id', description: 'ID de la categoría', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Categoría eliminada exitosamente' 
    })
    @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
    @ApiConflictResponse({ description: 'No se puede eliminar la categoría porque tiene productos asociados' })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        await this.categoriaService.remove(id);
        return { message: 'Categoría eliminada exitosamente' };
    }

    /**
     * Buscar categorías por nombre
     */
    @Get('search/by-name')
    @ApiOperation({ 
        summary: 'Buscar categorías por nombre',
        description: 'Busca categorías que contengan el nombre especificado' 
    })
    @ApiQuery({ 
        name: 'nombre', 
        required: true, 
        type: String,
        description: 'Nombre a buscar' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Categorías encontradas',
        type: [ResponseCategoriaDto] 
    })
    async findByName(@Query('nombre') nombre: string): Promise<ResponseCategoriaDto[]> {
        return await this.categoriaService.findByName(nombre);
    }
}