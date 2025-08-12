import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ComprobanteService } from "../service/comprobante.service";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";

@ApiTags('Comprobantes')
@Controller('api/comprobante')
export class ComprobanteController {

    constructor(
        private readonly comprobanteService: ComprobanteService    
    ) {}

    @Get()
    @ApiOperation({ summary: 'Obtener todos los comprobantes' })
    @ApiResponse({ status: 200, description: 'Lista de comprobantes obtenida exitosamente', type: [ResponseComprobanteDto] })
    findAll () : Promise<ResponseComprobanteDto[]>{
        return this.comprobanteService.findAll();
    }

    @Get('compras')
    @ApiOperation({ summary: 'Obtener todos los comprobantes de compra' })
    @ApiResponse({ status: 200, description: 'Lista de comprobantes de compra obtenida exitosamente', type: [ResponseComprobanteDto] })
    findCompras(): Promise<ResponseComprobanteDto[]> {
        return this.comprobanteService.findCompras();
    }

    @Get('ventas')
    @ApiOperation({ summary: 'Obtener todos los comprobantes de venta' })
    @ApiResponse({ status: 200, description: 'Lista de comprobantes de venta obtenida exitosamente', type: [ResponseComprobanteDto] })
    findVentas(): Promise<ResponseComprobanteDto[]> {
        return this.comprobanteService.findVentas();
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo comprobante' })
    @ApiResponse({ status: 201, description: 'Comprobante creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    create (@Body() createComprobanteDto : CreateComprobanteDto) : Promise<void>{
        return this.comprobanteService.register(createComprobanteDto);
    }

}