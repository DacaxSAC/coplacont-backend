import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { Comprobante } from "../entities/comprobante";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { PersonService } from "src/modules/persons/services";
import { Transactional } from "typeorm-transactional";
import { ComprobanteDetalleService } from "./comprobante-detalle.service";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";
import { plainToInstance } from "class-transformer";
import { TipoOperacion } from "../enum/tipo-operacion.enum";

@Injectable()
export class ComprobanteService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>,
        private readonly comprobanteDetalleService: ComprobanteDetalleService,
        private readonly personaService: PersonService
    ) { }

    @Transactional()
    async register(createComprobanteDto: CreateComprobanteDto): Promise<void> {
        const entidad = await this.personaService.findEntity(createComprobanteDto.idPersona);
        const comprobante = this.comprobanteRepository.create(createComprobanteDto);
        comprobante.persona = entidad;
        const comprobanteSaved = await this.comprobanteRepository.save(comprobante);
        if (await this.existDetails(createComprobanteDto)) {
            this.comprobanteDetalleService.register(comprobanteSaved.idComprobante, createComprobanteDto.detalles!);
        }
    }

    async findAll(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({relations: ['totales']});
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    async existDetails(createComprobanteDto: CreateComprobanteDto): Promise<boolean> {
        return (
            createComprobanteDto.detalles !== undefined &&
            createComprobanteDto.detalles !== null &&
            Array.isArray(createComprobanteDto.detalles) &&
            createComprobanteDto.detalles.length > 0
        );
    }

    /**
     * Obtiene todos los comprobantes de tipo COMPRA
     * @returns Lista de comprobantes de compra
     */
    async findCompras(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.COMPRA },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Obtiene todos los comprobantes de tipo VENTA
     * @returns Lista de comprobantes de venta
     */
    async findVentas(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.VENTA },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

}