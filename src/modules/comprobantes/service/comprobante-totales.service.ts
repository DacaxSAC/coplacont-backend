import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ComprobanteTotales } from "../entities/comprobante-totales";
import { Repository } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { ComprobanteDetalle } from "../entities/comprobante-detalle";
import { Comprobante } from "../entities/comprobante";

@Injectable()
export class ComprobanteTotalesService {

    constructor(
        @InjectRepository(ComprobanteTotales)
        private readonly comprobanteTotalesRepository: Repository<ComprobanteTotales>,
    ) { }

    @Transactional()
    async register(idComprobante: number, detalles: ComprobanteDetalle[]) {

        const comprobante = new Comprobante();
        comprobante.idComprobante = idComprobante;

        // Calcular totales
        const totalGravada = detalles.reduce((sum, d) => sum + Number(d.subtotal), 0);
        const totalIgv = detalles.reduce((sum, d) => sum + Number(d.igv ?? 0), 0);
        const totalIsc = detalles.reduce((sum, d) => sum + Number(d.isc ?? 0), 0);
        const totalGeneral = detalles.reduce((sum, d) => sum + Number(d.total), 0);

        const totalExonerada = 0;
        const totalInafecta = 0;

        // Crear entidad totales
        const totales = this.comprobanteTotalesRepository.create({
            comprobante,
            totalGravada,
            totalExonerada,
            totalInafecta,
            totalIgv,
            totalIsc,
            totalGeneral,
        });

        // Guardar totales en BD
        await this.comprobanteTotalesRepository.save(totales);
    }


}