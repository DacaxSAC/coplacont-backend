import { Body, Controller, Get, Post } from "@nestjs/common";
import { ComprobanteService } from "../service/comprobante.service";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";

@Controller('api/comprobante')
export class ComprobanteController {

    constructor(
        private readonly comprobanteService: ComprobanteService    
    ) {}

    @Get()
    findAll () : Promise<ResponseComprobanteDto[]>{
        return this.comprobanteService.findAll();
    }

    @Post()
    create (@Body() createComprobanteDto : CreateComprobanteDto) : Promise<void>{
        return this.comprobanteService.register(createComprobanteDto);
    }

}