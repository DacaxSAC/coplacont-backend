import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LoteService } from '../services/lote.service';
import { InventarioLote } from 'src/modules/productos/entities';
import { ResponseLoteDto } from '../dto/response-lote.dto';
import { plainToInstance } from 'class-transformer';

@Controller('lotes')
export class LoteController {
    constructor(private readonly loteService: LoteService) {}

    /**
     * Obtener lotes por inventario
     */
    @Get('inventario/:idInventario')
    async getLotesByInventario(
        @Param('idInventario', ParseIntPipe) idInventario: number
    ): Promise<ResponseLoteDto[]> {
        const lotes = await this.loteService.findLotesByInventario(idInventario);
        return plainToInstance(ResponseLoteDto, lotes, { excludeExtraneousValues: true });
    }

    /**
     * Obtener lotes disponibles por inventario
     */
    @Get('inventario/:idInventario/disponibles')
    async getLotesDisponibles(
        @Param('idInventario', ParseIntPipe) idInventario: number
    ): Promise<ResponseLoteDto[]> {
        const lotes = await this.loteService.findLotesDisponibles(idInventario);
        return plainToInstance(ResponseLoteDto, lotes, { excludeExtraneousValues: true });
    }

    /**
     * Obtener lotes recientes (últimos 10)
     */
    @Get('recientes')
    async getLotesRecientes(): Promise<ResponseLoteDto[]> {
        const lotes = await this.loteService.findLotesRecientes();
        return plainToInstance(ResponseLoteDto, lotes, { excludeExtraneousValues: true });
    }

    /**
     * Obtener lote por ID
     */
    @Get(':id')
    async getLoteById(
        @Param('id', ParseIntPipe) id: number
    ): Promise<ResponseLoteDto | null> {
        const lote = await this.loteService.findLoteById(id);
        return lote ? plainToInstance(ResponseLoteDto, lote, { excludeExtraneousValues: true }) : null;
    }
}