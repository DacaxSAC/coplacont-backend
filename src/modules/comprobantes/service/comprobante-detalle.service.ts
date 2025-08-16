import { Injectable } from "@nestjs/common";
import { ComprobanteDetalle } from "../entities/comprobante-detalle";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateComprobanteDetalleDto } from "../dto/comprobante-detalle/create-comprobante-detalle.dto";
import { Comprobante } from "../entities/comprobante";
import { Transactional } from "typeorm-transactional";
import { ComprobanteTotalesService } from "./comprobante-totales.service";
import { Inventario } from "src/modules/productos/entities";

@Injectable()
export class ComprobanteDetalleService {

    constructor(
        @InjectRepository(ComprobanteDetalle)
        private readonly comprobanteDetalleRepository: Repository<ComprobanteDetalle>,
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>,
        private readonly comprobanteTotalesService: ComprobanteTotalesService,
    ) {}

    @Transactional()
    async register(idComprobante: number, createComprobanteDetalleDtos: CreateComprobanteDetalleDto[]) : Promise<ComprobanteDetalle[]>{
        console.log(`🔄 Registrando ${createComprobanteDetalleDtos.length} detalles para comprobante ${idComprobante}`);
        
        // Mapear DTOs a entidades y setear relaciones (comprobante y producto)
        const comprobante = new Comprobante();
        comprobante.idComprobante = idComprobante;

        const detalles = await Promise.all(createComprobanteDetalleDtos.map(async (dto, index) => {
            console.log(`📦 Procesando detalle ${index + 1}: Inventario=${dto.idInventario}, Cantidad=${dto.cantidad}`);
            
            const detalle = this.comprobanteDetalleRepository.create(dto);
            detalle.comprobante = comprobante;
            
            // Validar y establecer relación con inventario
            if (dto.idInventario) {
                const inventario = await this.inventarioRepository.findOne({
                    where: { id: dto.idInventario },
                    relations: ['producto', 'almacen']
                });
                if (!inventario) {
                    throw new Error(`Inventario no encontrado: ${dto.idInventario}`);
                }
                detalle.inventario = inventario;
                
                // Validar que el inventario tenga producto y almacén
                if (!inventario.producto) {
                    throw new Error(`El inventario ${dto.idInventario} no tiene un producto asociado`);
                }
                if (!inventario.almacen) {
                    throw new Error(`El inventario ${dto.idInventario} no tiene un almacén asociado`);
                }
                
                console.log(`✅ Detalle ${index + 1} procesado: Inventario=${inventario.id}, Producto=${inventario.producto.id}, Almacén=${inventario.almacen.id}`);
            } else {
                throw new Error('Cada detalle debe tener un inventario asociado');
            }
            
            return detalle;
        }));

        const detallesSaved = await this.comprobanteDetalleRepository.save(detalles);
        console.log(`✅ ${detallesSaved.length} detalles guardados exitosamente`);
        
        await this.comprobanteTotalesService.register(idComprobante, detallesSaved);
        console.log(`✅ Totales calculados para comprobante ${idComprobante}`);
        
        return detallesSaved;
    }

}
