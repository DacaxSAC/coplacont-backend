import { Injectable } from "@nestjs/common";
import { ComprobanteDetalle } from "../entities/comprobante-detalle";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateComprobanteDetalleDto } from "../dto/comprobante-detalle/create-comprobante-detalle.dto";
import { Comprobante } from "../entities/comprobante";
import { Transactional } from "typeorm-transactional";
import { ComprobanteTotalesService } from "./comprobante-totales.service";
import { Producto } from "src/modules/productos/entities";

@Injectable()
export class ComprobanteDetalleService {

    constructor(
        @InjectRepository(ComprobanteDetalle)
        private readonly comprobanteDetalleRepository: Repository<ComprobanteDetalle>,

        private readonly comprobanteTotalesService: ComprobanteTotalesService,
    ) { }

    @Transactional()
    async register(idComprobante: number, createComprobanteDetalleDtos: CreateComprobanteDetalleDto[]) {
        // Mapear DTOs a entidades y setear relaciones (comprobante y producto)
        const comprobante = new Comprobante();
        comprobante.idComprobante = idComprobante;

        const detalles = createComprobanteDetalleDtos.map(dto => {
            const detalle = this.comprobanteDetalleRepository.create(dto);
            detalle.comprobante = comprobante;
            if (dto.idProducto) {
                const producto = new Producto();
                producto.id = dto.idProducto;
                detalle.producto = producto;
            }
            return detalle;
        });

        const detallesSaved = await this.comprobanteDetalleRepository.save(detalles);
        await this.comprobanteTotalesService.register(idComprobante, detallesSaved);
    }

}
