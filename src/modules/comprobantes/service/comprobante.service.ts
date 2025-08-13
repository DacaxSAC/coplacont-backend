import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { Comprobante } from "../entities/comprobante";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { EntidadService } from "src/modules/entidades/services";
import { Transactional } from "typeorm-transactional";
import { ComprobanteDetalleService } from "./comprobante-detalle.service";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";
import { plainToInstance } from "class-transformer";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { Correlativo } from "../entities/correlativo";

@Injectable()
export class ComprobanteService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>,
        @InjectRepository(Correlativo)
        private readonly correlativoRepository: Repository<Correlativo>,
        private readonly comprobanteDetalleService: ComprobanteDetalleService,
        private readonly personaService: EntidadService
    ) { }

    @Transactional()
    private async findOrCreateCorrelativo(tipoOperacion: TipoOperacion) {
        let correlativo = await this.correlativoRepository
            .createQueryBuilder('c')
            .setLock('pessimistic_write')
            .where('c.tipo = :tipo', { tipo: tipoOperacion })
            .getOne();

        if (!correlativo) {
            correlativo = this.correlativoRepository.create({
                tipo: tipoOperacion,
                ultimoNumero: 0,
            });
            await this.correlativoRepository.save(correlativo);
        }

        return correlativo;
    }

    @Transactional()
    async register(createComprobanteDto: CreateComprobanteDto): Promise<void> {
        const entidad = await this.personaService.findEntity(createComprobanteDto.idPersona);
        const comprobante = this.comprobanteRepository.create(createComprobanteDto);
        comprobante.persona = entidad;

        const correlativo = await this.findOrCreateCorrelativo(createComprobanteDto.tipoOperacion);
        correlativo.ultimoNumero += 1;
        await this.correlativoRepository.save(correlativo);
        comprobante.correlativo = `corr-${correlativo.ultimoNumero}`;

        const comprobanteSaved = await this.comprobanteRepository.save(comprobante);
        if (await this.existDetails(createComprobanteDto)) {
            this.comprobanteDetalleService.register(comprobanteSaved.idComprobante, createComprobanteDto.detalles!);
        }
    }

    @Transactional()
    async getNextCorrelativo(tipoOperacion: TipoOperacion): Promise<{ correlativo: string }> {
        let correlativo = await this.findOrCreateCorrelativo(tipoOperacion);
        return { correlativo: `corr-${correlativo.ultimoNumero + 1}` };
    }

    async findAll(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({ relations: ['totales'] });
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