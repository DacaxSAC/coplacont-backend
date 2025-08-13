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
    ClassSerializerInterceptor
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody
} from '@nestjs/swagger';
import { InventarioService } from '../service/inventario.service';
import { CreateInventarioDto } from '../dto/inventario/create-inventario.dto';
import { UpdateInventarioDto } from '../dto/inventario/update-inventario.dto';
import { ResponseInventarioDto } from '../dto/inventario/response-inventario.dto';
import { plainToClass } from 'class-transformer';

/**
 * Controlador para la gestión de inventario
 * Maneja las operaciones CRUD y consultas específicas de inventario
 */
@ApiTags('Inventario')
@Controller('inventario')
@UseInterceptors(ClassSerializerInterceptor)
export class InventarioController {

    constructor(private readonly inventarioService: InventarioService) {}

    /**
     * Crear un nuevo registro de inventario
     */
    @Post()
    @ApiOperation({ 
        summary: 'Crear inventario', 
        description: 'Crea un nuevo registro de inventario para un producto en un almacén específico' 
    })
    @ApiBody({ type: CreateInventarioDto })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Inventario creado exitosamente',
        type: ResponseInventarioDto
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Datos de entrada inválidos' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Almacén o producto no encontrado' 
    })
    @ApiResponse({ 
        status: HttpStatus.CONFLICT, 
        description: 'Ya existe inventario para este producto en el almacén' 
    })
    async create(@Body() createInventarioDto: CreateInventarioDto): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioService.create(createInventarioDto);
        return plainToClass(ResponseInventarioDto, inventario);
    }

    /**
     * Obtener todos los registros de inventario
     */
    @Get()
    @ApiOperation({ 
        summary: 'Listar inventarios', 
        description: 'Obtiene todos los registros de inventario' 
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Lista de inventarios obtenida exitosamente',
        type: [ResponseInventarioDto]
    })
    async findAll(): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioService.findAll();
        return inventarios.map(inventario => plainToClass(ResponseInventarioDto, inventario));
    }

    /**
     * Obtener un inventario por ID
     */
    @Get(':id')
    @ApiOperation({ 
        summary: 'Obtener inventario por ID', 
        description: 'Obtiene un registro de inventario específico por su ID' 
    })
    @ApiParam({ name: 'id', description: 'ID del inventario', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario encontrado',
        type: ResponseInventarioDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Inventario no encontrado' 
    })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioService.findOne(id);
        return plainToClass(ResponseInventarioDto, inventario);
    }

    /**
     * Obtener inventario por almacén
     */
    @Get('almacen/:idAlmacen')
    @ApiOperation({ 
        summary: 'Obtener inventario por almacén', 
        description: 'Obtiene todos los productos en inventario de un almacén específico' 
    })
    @ApiParam({ name: 'idAlmacen', description: 'ID del almacén', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario del almacén obtenido exitosamente',
        type: [ResponseInventarioDto]
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Almacén no encontrado' 
    })
    async findByAlmacen(@Param('idAlmacen', ParseIntPipe) idAlmacen: number): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioService.findByAlmacen(idAlmacen);
        return inventarios.map(inventario => plainToClass(ResponseInventarioDto, inventario));
    }

    /**
     * Obtener inventario por producto
     */
    @Get('producto/:idProducto')
    @ApiOperation({ 
        summary: 'Obtener inventario por producto', 
        description: 'Obtiene el inventario de un producto en todos los almacenes' 
    })
    @ApiParam({ name: 'idProducto', description: 'ID del producto', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario del producto obtenido exitosamente',
        type: [ResponseInventarioDto]
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Producto no encontrado' 
    })
    async findByProducto(@Param('idProducto', ParseIntPipe) idProducto: number): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioService.findByProducto(idProducto);
        return inventarios.map(inventario => plainToClass(ResponseInventarioDto, inventario));
    }

    /**
     * Obtener inventario específico por almacén y producto
     */
    @Get('almacen/:idAlmacen/producto/:idProducto')
    @ApiOperation({ 
        summary: 'Obtener inventario específico', 
        description: 'Obtiene el inventario de un producto específico en un almacén específico' 
    })
    @ApiParam({ name: 'idAlmacen', description: 'ID del almacén', type: 'number' })
    @ApiParam({ name: 'idProducto', description: 'ID del producto', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario específico obtenido exitosamente',
        type: ResponseInventarioDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Inventario no encontrado para esta combinación' 
    })
    async findByAlmacenAndProducto(
        @Param('idAlmacen', ParseIntPipe) idAlmacen: number,
        @Param('idProducto', ParseIntPipe) idProducto: number
    ): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioService.findByAlmacenAndProducto(idAlmacen, idProducto);
        return plainToClass(ResponseInventarioDto, inventario);
    }

    /**
     * Obtener productos con stock bajo
     */
    @Get('reportes/stock-bajo')
    @ApiOperation({ 
        summary: 'Obtener productos con stock bajo', 
        description: 'Obtiene los productos que tienen stock igual o menor al stock mínimo configurado' 
    })
    @ApiQuery({ 
        name: 'idAlmacen', 
        description: 'ID del almacén (opcional)', 
        type: 'number', 
        required: false 
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Productos con stock bajo obtenidos exitosamente',
        type: [ResponseInventarioDto]
    })
    async findLowStock(@Query('idAlmacen') idAlmacen?: number): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioService.findLowStock(idAlmacen);
        return inventarios.map(inventario => plainToClass(ResponseInventarioDto, inventario));
    }

    /**
     * Obtener resumen de inventario por almacén
     */
    @Get('reportes/resumen/:idAlmacen')
    @ApiOperation({ 
        summary: 'Obtener resumen de inventario', 
        description: 'Obtiene un resumen estadístico del inventario de un almacén' 
    })
    @ApiParam({ name: 'idAlmacen', description: 'ID del almacén', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Resumen de inventario obtenido exitosamente'
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Almacén no encontrado' 
    })
    async getResumenByAlmacen(@Param('idAlmacen', ParseIntPipe) idAlmacen: number): Promise<any> {
        return await this.inventarioService.getResumenByAlmacen(idAlmacen);
    }

    /**
     * Actualizar un inventario
     */
    @Patch(':id')
    @ApiOperation({ 
        summary: 'Actualizar inventario', 
        description: 'Actualiza un registro de inventario existente' 
    })
    @ApiParam({ name: 'id', description: 'ID del inventario', type: 'number' })
    @ApiBody({ type: UpdateInventarioDto })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario actualizado exitosamente',
        type: ResponseInventarioDto
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Datos de entrada inválidos' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Inventario no encontrado' 
    })
    @ApiResponse({ 
        status: HttpStatus.CONFLICT, 
        description: 'Conflicto con combinación almacén-producto existente' 
    })
    async update(
        @Param('id', ParseIntPipe) id: number, 
        @Body() updateInventarioDto: UpdateInventarioDto
    ): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioService.update(id, updateInventarioDto);
        return plainToClass(ResponseInventarioDto, inventario);
    }

    /**
     * Actualizar stock de un inventario
     */
    @Patch(':id/stock')
    @ApiOperation({ 
        summary: 'Actualizar stock', 
        description: 'Actualiza el stock de un inventario sumando o restando una cantidad' 
    })
    @ApiParam({ name: 'id', description: 'ID del inventario', type: 'number' })
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                cantidad: {
                    type: 'number',
                    description: 'Cantidad a sumar (positiva) o restar (negativa)',
                    example: 10
                }
            },
            required: ['cantidad']
        }
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Stock actualizado exitosamente',
        type: ResponseInventarioDto
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Stock insuficiente o cantidad inválida' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Inventario no encontrado' 
    })
    async updateStock(
        @Param('id', ParseIntPipe) id: number,
        @Body('cantidad') cantidad: number
    ): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioService.updateStock(id, cantidad);
        return plainToClass(ResponseInventarioDto, inventario);
    }

    /**
     * Eliminar un inventario
     */
    @Delete(':id')
    @ApiOperation({ 
        summary: 'Eliminar inventario', 
        description: 'Elimina un registro de inventario (solo si no tiene lotes asociados)' 
    })
    @ApiParam({ name: 'id', description: 'ID del inventario', type: 'number' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Inventario eliminado exitosamente'
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'No se puede eliminar el inventario porque tiene lotes asociados' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Inventario no encontrado' 
    })
    async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        return await this.inventarioService.remove(id);
    }
}