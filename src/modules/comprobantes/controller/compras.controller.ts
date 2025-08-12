import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ComprasService } from '../service/compras.service';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

/**
 * Controlador especializado para el manejo de comprobantes de compra
 * Proporciona endpoints específicos para operaciones de compras
 */
@ApiTags('Compras')
@Controller('api/compras')
export class ComprasController {

    constructor(
        private readonly comprasService: ComprasService
    ) {}

    /**
     * Obtiene todos los comprobantes de compra
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes de compra
     */
    @Get()
    @ApiOperation({ summary: 'Obtener todos los comprobantes de compra' })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de comprobantes de compra obtenida exitosamente', 
        type: [ResponseComprobanteDto] 
    })
    async findAll(): Promise<ResponseComprobanteDto[]> {
        return this.comprasService.findAll();
    }

    /**
     * Busca un comprobante de compra por su ID
     * @param id - ID del comprobante
     * @returns Promise<ResponseComprobanteDto | null> Comprobante encontrado o null
     */
    @Get(':id')
    @ApiOperation({ summary: 'Obtener un comprobante de compra por ID' })
    @ApiParam({ name: 'id', description: 'ID del comprobante de compra', type: 'number' })
    @ApiResponse({ 
        status: 200, 
        description: 'Comprobante de compra encontrado', 
        type: ResponseComprobanteDto 
    })
    @ApiResponse({ status: 404, description: 'Comprobante de compra no encontrado' })
    async findById(@Param('id') id: number): Promise<ResponseComprobanteDto | null> {
        return this.comprasService.findById(id);
    }

    /**
     * Busca comprobantes de compra por rango de fechas
     * @param fechaInicio - Fecha de inicio del rango (formato: YYYY-MM-DD)
     * @param fechaFin - Fecha de fin del rango (formato: YYYY-MM-DD)
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes en el rango
     */
    @Get('fecha-rango/buscar')
    @ApiOperation({ summary: 'Buscar comprobantes de compra por rango de fechas' })
    @ApiQuery({ 
        name: 'fechaInicio', 
        description: 'Fecha de inicio del rango (YYYY-MM-DD)', 
        type: 'string',
        example: '2024-01-01'
    })
    @ApiQuery({ 
        name: 'fechaFin', 
        description: 'Fecha de fin del rango (YYYY-MM-DD)', 
        type: 'string',
        example: '2024-12-31'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de comprobantes de compra en el rango de fechas', 
        type: [ResponseComprobanteDto] 
    })
    async findByDateRange(
        @Query('fechaInicio') fechaInicio: string,
        @Query('fechaFin') fechaFin: string
    ): Promise<ResponseComprobanteDto[]> {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return this.comprasService.findByDateRange(inicio, fin);
    }

    /**
     * Busca comprobantes de compra por proveedor
     * @param proveedorId - ID del proveedor
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes del proveedor
     */
    @Get('proveedor/:proveedorId')
    @ApiOperation({ summary: 'Obtener comprobantes de compra por proveedor' })
    @ApiParam({ name: 'proveedorId', description: 'ID del proveedor', type: 'number' })
    @ApiResponse({ 
        status: 200, 
        description: 'Lista de comprobantes de compra del proveedor', 
        type: [ResponseComprobanteDto] 
    })
    async findByProveedor(@Param('proveedorId') proveedorId: number): Promise<ResponseComprobanteDto[]> {
        return this.comprasService.findByProveedor(proveedorId);
    }
}