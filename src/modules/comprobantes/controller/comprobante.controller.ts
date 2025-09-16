import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiExtraModels, ApiBody, ApiBearerAuth } from "@nestjs/swagger";
import { ComprobanteService } from "../service/comprobante.service";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { CreateComprobanteDetalleDto } from "../dto/comprobante-detalle/create-comprobante-detalle.dto";
import { JwtAuthGuard } from "../../users/guards/jwt-auth.guard";
import { CurrentUser } from "../../users/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../users/decorators/current-user.decorator";

@ApiTags('Comprobantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(CreateComprobanteDetalleDto)
@Controller('api/comprobante')
export class ComprobanteController {

    constructor(
        private readonly comprobanteService: ComprobanteService    
    ) {}

    @Get()
    @ApiOperation({ summary: 'Obtener todos los comprobantes' })
    @ApiResponse({ status: 200, description: 'Lista de comprobantes obtenida exitosamente', type: [ResponseComprobanteDto] })
    findAll(@CurrentUser() user: AuthenticatedUser): Promise<ResponseComprobanteDto[]> {
        if (!user.personaId) {
            throw new Error('Usuario no tiene una empresa asociada');
        }
        return this.comprobanteService.findAll(user.personaId);
    }

    @Get('siguiente-correlativo')
    @ApiOperation({ summary: 'Obtener el siguiente correlativo para un tipo de operación' })
    @ApiQuery({ 
        name: 'tipoOperacion', 
        description: 'Tipo de operación (venta o compra)', 
        enum: TipoOperacion,
        example: TipoOperacion.VENTA
    })
    @ApiResponse({ status: 200, description: 'Siguiente correlativo obtenido exitosamente', schema: { type: 'object', properties: { correlativo: { type: 'string', example: 'corr-000001' } } } })
    @ApiResponse({ status: 400, description: 'Tipo de operación inválido' })
    getNextCorrelativo(
        @Query('tipoOperacion') tipoOperacion: TipoOperacion,
        @CurrentUser() user: AuthenticatedUser
    ): Promise<{ correlativo: string }> {
        if (!user.personaId) {
            throw new Error('Usuario no tiene una empresa asociada');
        }
        return this.comprobanteService.getNextCorrelativo(tipoOperacion, user.personaId);
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo comprobante' })
    @ApiBody({ type: CreateComprobanteDto })
    @ApiResponse({ status: 201, description: 'Comprobante creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    create(
        @Body() createComprobanteDto: CreateComprobanteDto,
        @CurrentUser() user: AuthenticatedUser
    ): Promise<void> {
        if (!user.personaId) {
            throw new Error('Usuario no tiene una empresa asociada');
        }
        return this.comprobanteService.register(createComprobanteDto, user.personaId);
    }

}