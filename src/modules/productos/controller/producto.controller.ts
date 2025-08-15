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
import { ProductoService } from '../service/producto.service';
import { CreateProductoDto, UpdateProductoDto, ResponseProductoDto } from '../dto';
import { TipoProducto } from '../enum/tipo-producto.enum';

/**
 * Controlador para gestionar las operaciones CRUD de productos
 * Proporciona endpoints REST para la gestión de productos
 */
@ApiTags('Productos')
@Controller('/api/productos')
export class ProductoController {

    constructor(private readonly productoService: ProductoService) {}

    /**
     * Crear un nuevo producto
     */
    @Post()
    @ApiOperation({ 
        summary: 'Crear nuevo producto',
        description: 'Crea un nuevo producto' 
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Producto creado exitosamente',
        type: ResponseProductoDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos o categoría no válida' })
    @ApiConflictResponse({ description: 'Ya existe un producto con este código' })
    async create(@Body() createProductoDto: CreateProductoDto): Promise<ResponseProductoDto> {
        return await this.productoService.create(createProductoDto);
    }

    /**
     * Obtener todos los productos
     */
    @Get()
    @ApiOperation({ 
        summary: 'Obtener todos los productos',
        description: 'Obtiene la lista de todos los productos con sus categorías' 
    })
    @ApiQuery({ 
        name: 'includeInactive', 
        required: false, 
        type: Boolean,
        description: 'Incluir productos inactivos' 
    })
    @ApiQuery({ 
        name: 'tipo', 
        required: false, 
        enum: TipoProducto,
        description: 'Filtrar por tipo de ítem (PRODUCTO | SERVICIO)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de productos obtenida exitosamente',
        type: [ResponseProductoDto] 
    })
    async findAll(
        @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
        @Query('tipo') tipo?: TipoProducto
    ): Promise<ResponseProductoDto[]> {
        return await this.productoService.findAll(includeInactive || false, tipo);
    }

    /**
     * Obtener un producto por ID
     */
    @Get(':id')
    @ApiOperation({ 
        summary: 'Obtener producto por ID',
        description: 'Obtiene un producto específico por su ID con su categoría' 
    })
    @ApiParam({ name: 'id', description: 'ID del producto', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Producto encontrado',
        type: ResponseProductoDto 
    })
    @ApiNotFoundResponse({ description: 'Producto no encontrado' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResponseProductoDto> {
        return await this.productoService.findOne(id);
    }

    /**
     * Actualizar un producto
     */
    @Patch(':id')
    @ApiOperation({ 
        summary: 'Actualizar producto',
        description: 'Actualiza un producto existente' 
    })
    @ApiParam({ name: 'id', description: 'ID del producto', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Producto actualizado exitosamente',
        type: ResponseProductoDto 
    })
    @ApiBadRequestResponse({ description: 'Datos de entrada inválidos o categoría no válida' })
    @ApiNotFoundResponse({ description: 'Producto no encontrado' })
    @ApiConflictResponse({ description: 'Ya existe un producto con este código' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateProductoDto: UpdateProductoDto
    ): Promise<ResponseProductoDto> {
        return await this.productoService.update(id, updateProductoDto);
    }

    /**
     * Eliminar un producto (soft delete)
     */
    @Delete(':id')
    @ApiOperation({ 
        summary: 'Eliminar producto',
        description: 'Elimina un producto (soft delete)' 
    })
    @ApiParam({ name: 'id', description: 'ID del producto', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'Producto eliminado exitosamente' 
    })
    @ApiNotFoundResponse({ description: 'Producto no encontrado' })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        await this.productoService.remove(id);
        return { message: 'Producto eliminado exitosamente' };
    }

    /**
     * Buscar productos por descripción
     */
    @Get('search/by-description')
    @ApiOperation({ 
        summary: 'Buscar productos por descripción',
        description: 'Busca productos que contengan la descripción especificada' 
    })
    @ApiQuery({ 
        name: 'descripcion', 
        required: true, 
        type: String,
        description: 'Descripción a buscar' 
    })
    @ApiQuery({ 
        name: 'tipo', 
        required: false, 
        enum: TipoProducto,
        description: 'Filtrar por tipo de ítem (PRODUCTO | SERVICIO)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Productos encontrados',
        type: [ResponseProductoDto] 
    })
    async findByDescription(
        @Query('descripcion') descripcion: string,
        @Query('tipo') tipo?: TipoProducto
    ): Promise<ResponseProductoDto[]> {
        return await this.productoService.findByDescription(descripcion, tipo);
    }

    /**
     * Buscar productos por nombre
     */
    @Get('search/by-name')
    @ApiOperation({ 
        summary: 'Buscar productos por nombre',
        description: 'Busca productos que contengan el nombre especificado' 
    })
    @ApiQuery({ 
        name: 'nombre', 
        required: true, 
        type: String,
        description: 'Nombre a buscar' 
    })
    @ApiQuery({ 
        name: 'tipo', 
        required: false, 
        enum: TipoProducto,
        description: 'Filtrar por tipo de ítem (PRODUCTO | SERVICIO)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Productos encontrados',
        type: [ResponseProductoDto] 
    })
    async findByName(
        @Query('nombre') nombre: string,
        @Query('tipo') tipo?: TipoProducto
    ): Promise<ResponseProductoDto[]> {
        return await this.productoService.findByName(nombre, tipo);
    }

    /**
     * Buscar productos por categoría
     */
    @Get('search/by-category/:categoriaId')
    @ApiOperation({ 
        summary: 'Buscar productos por categoría',
        description: 'Busca todos los productos de una categoría específica' 
    })
    @ApiParam({ name: 'categoriaId', description: 'ID de la categoría', type: Number })
    @ApiQuery({ 
        name: 'tipo', 
        required: false, 
        enum: TipoProducto,
        description: 'Filtrar por tipo de ítem (PRODUCTO | SERVICIO)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Productos de la categoría encontrados',
        type: [ResponseProductoDto] 
    })
    async findByCategory(
        @Param('categoriaId', ParseIntPipe) categoriaId: number,
        @Query('tipo') tipo?: TipoProducto
    ): Promise<ResponseProductoDto[]> {
        return await this.productoService.findByCategory(categoriaId, tipo);
    }

    /**
     * Obtener productos con stock bajo
     */
    @Get('reports/low-stock')
    @ApiOperation({ 
        summary: 'Productos con stock bajo',
        description: 'Obtiene productos que tienen definido un stock mínimo (para alertas de inventario)' 
    })
    @ApiQuery({ 
        name: 'tipo', 
        required: false, 
        enum: TipoProducto,
        description: 'Filtrar por tipo de ítem (PRODUCTO | SERVICIO)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Productos con stock bajo obtenidos',
        type: [ResponseProductoDto] 
    })
    async findLowStock(
        @Query('tipo') tipo?: TipoProducto
    ): Promise<ResponseProductoDto[]> {
        return await this.productoService.findLowStock(tipo);
    }
}