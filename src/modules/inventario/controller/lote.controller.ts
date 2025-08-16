import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { LoteService } from '../services/lote.service';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { ResponseLoteDto } from '../dto/response-lote.dto';
import { plainToInstance } from 'class-transformer';

@Controller('lotes')
export class LoteController {
    constructor(private readonly loteService: LoteService) {}

    /**
     * Debug temporal para verificar lotes
     */
    @Get('debug/:idInventario')
    async debugLotes(@Param('idInventario', ParseIntPipe) idInventario: number): Promise<{ message: string }> {
        await this.loteService.debugLotes(idInventario);
        return { message: 'Debug ejecutado, revisa los logs del servidor' };
    }

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