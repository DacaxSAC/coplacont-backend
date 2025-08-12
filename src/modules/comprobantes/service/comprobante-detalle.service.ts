import { Injectable } from "@nestjs/common";
import { ComprobanteDetalle } from "../entities/comprobante-detalle";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateComprobanteDetalleDto } from "../dto/comprobante-detalle/create-comprobante-detalle.dto";
import { Comprobante } from "../entities/comprobante";
import { Transactional } from "typeorm-transactional";
import { ComprobanteTotalesService } from "./comprobante-totales.service";

@Injectable()
export class ComprobanteDetalleService {

    constructor(
        @InjectRepository(ComprobanteDetalle)
        private readonly comprobanteDetalleRepository: Repository<ComprobanteDetalle>,

        private readonly comprobanteTotalesService: ComprobanteTotalesService,
    ) { }

    @Transactional()
    async register(idComprobante: number, createComprobanteDetalleDtos: CreateComprobanteDetalleDto[]) {
        const comprobanteDetalles = this.comprobanteDetalleRepository.create(createComprobanteDetalleDtos);
        const comprobante = new Comprobante();
        comprobante.idComprobante = idComprobante;

        comprobanteDetalles.forEach((detalle) => {
            detalle.comprobante = comprobante;
        });
        const detallesSaved = await this.comprobanteDetalleRepository.save(comprobanteDetalles);
        await this.comprobanteTotalesService.register(idComprobante, detallesSaved);
    }

}
