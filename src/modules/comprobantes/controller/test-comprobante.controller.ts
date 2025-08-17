import { Controller, Get, Param } from '@nestjs/common';
import { ComprasService } from '../service/compras.service';
import { VentasService } from '../service/ventas.service';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

/**
 * Controlador temporal para probar la relación persona en comprobantes
 */
@Controller('api/test-comprobantes')
export class TestComprobanteController {
    constructor(
        private readonly comprasService: ComprasService,
        private readonly ventasService: VentasService
    ) {}

    /**
     * Obtiene un comprobante de compra por ID para probar la relación persona
     * @param id - ID del comprobante
     * @returns Promise<ResponseComprobanteDto | null>
     */
    @Get('compra/:id')
    async getCompraById(@Param('id') id: number): Promise<ResponseComprobanteDto | null> {
        return await this.comprasService.findById(id);
    }

    /**
     * Obtiene todos los comprobantes de compra para probar la relación persona
     * @returns Promise<ResponseComprobanteDto[]>
     */
    @Get('compras')
    async getAllCompras(): Promise<ResponseComprobanteDto[]> {
        return await this.comprasService.findAll();
    }

    /**
     * Obtiene todos los comprobantes de venta para probar la relación persona
     * @returns Promise<ResponseComprobanteDto[]>
     */
    @Get('ventas')
    async getAllVentas(): Promise<ResponseComprobanteDto[]> {
        return await this.ventasService.findAll();
    }
}