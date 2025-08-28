import { Controller, Get, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../users/guards/jwt-auth.guard';
import { CurrentUser } from '../../users/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../users/decorators/current-user.decorator';
import { ComprasService } from '../service/compras.service';
import { VentasService } from '../service/ventas.service';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

/**
 * Controlador temporal para probar la relación persona en comprobantes
 */
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/test-comprobantes')
export class TestComprobanteController {
    constructor(
        private readonly comprasService: ComprasService,
        private readonly ventasService: VentasService
    ) {}

    /**
     * Obtiene un comprobante de compra por ID para probar la relación persona
     * @param id - ID del comprobante
     * @param user - Usuario autenticado
     * @returns Promise<ResponseComprobanteDto | null>
     */
    @Get('compra/:id')
    async getCompraById(
        @Param('id') id: number,
        @CurrentUser() user: AuthenticatedUser
    ): Promise<ResponseComprobanteDto | null> {
        if (!user.personaId) {
            throw new UnauthorizedException('Usuario no tiene una persona asociada');
        }
        return await this.comprasService.findById(id, user.personaId);
    }

    /**
     * Obtiene todos los comprobantes de compra para probar la relación persona
     * @param user - Usuario autenticado
     * @returns Promise<ResponseComprobanteDto[]>
     */
    @Get('compras')
    async getAllCompras(@CurrentUser() user: AuthenticatedUser): Promise<ResponseComprobanteDto[]> {
        if (!user.personaId) {
            throw new UnauthorizedException('Usuario no tiene una persona asociada');
        }
        return await this.comprasService.findAll(user.personaId);
    }

    /**
     * Obtiene todos los comprobantes de venta para probar la relación persona
     * @param user - Usuario autenticado
     * @returns Promise<ResponseComprobanteDto[]>
     */
    @Get('ventas')
    async getAllVentas(@CurrentUser() user: AuthenticatedUser): Promise<ResponseComprobanteDto[]> {
        if (!user.personaId) {
            throw new UnauthorizedException('Usuario no tiene una persona asociada');
        }
        return await this.ventasService.findAll(user.personaId);
    }
}