import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ComprobanteTotales } from "../entities/comprobante-totales";
import { Repository, EntityManager } from "typeorm";
import { ComprobanteDetalle } from "../entities/comprobante-detalle";
import { Comprobante } from "../entities/comprobante";

@Injectable()
export class ComprobanteTotalesService {

    constructor(
        @InjectRepository(ComprobanteTotales)
        private readonly comprobanteTotalesRepository: Repository<ComprobanteTotales>,
    ) { }

    async register(idComprobante: number, detalles: ComprobanteDetalle[], manager?: EntityManager) {

        const comprobante = new Comprobante();
        comprobante.idComprobante = idComprobante;

        // Calcular totales
        const totalGravada = detalles.reduce((sum, d) => sum + Number(d.subtotal), 0);
        const totalIgv = detalles.reduce((sum, d) => sum + Number(d.igv ?? 0), 0);
        const totalIsc = detalles.reduce((sum, d) => sum + Number(d.isc ?? 0), 0);
        const totalGeneral = detalles.reduce((sum, d) => sum + Number(d.total), 0);

        const totalExonerada = 0;
        const totalInafecta = 0;

        // Usar el repositorio apropiado según si hay EntityManager
        const totalesRepo = manager ? manager.getRepository(ComprobanteTotales) : this.comprobanteTotalesRepository;

        // Crear entidad totales
        const totales = totalesRepo.create({
            comprobante,
            totalGravada,
            totalExonerada,
            totalInafecta,
            totalIgv,
            totalIsc,
            totalGeneral,
        });

        // Guardar totales en BD
        await totalesRepo.save(totales);
    }


}