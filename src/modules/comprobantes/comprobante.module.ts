import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comprobante } from "./entities/comprobante";
import { ComprobanteDetalle } from "./entities/comprobante-detalle";
import { ComprobanteTotales } from "./entities/comprobante-totales";
import { Correlativo } from "./entities/correlativo";
import { ComprobanteController } from "./controller/comprobante.controller";
import { ComprasController } from "./controller/compras.controller";
import { VentasController } from "./controller/ventas.controller";
import { ComprobanteService } from "./service/comprobante.service";
import { ComprasService } from "./service/compras.service";
import { VentasService } from "./service/ventas.service";
import { EntidadModule } from "../entidades/entidad.module";
import { MovimientosModule } from "../movimientos/movimientos.module";
import { InventarioModule } from "../inventario/inventario.module";
import { ComprobanteDetalleService } from "./service/comprobante-detalle.service";
import { ComprobanteTotalesService } from "./service/comprobante-totales.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comprobante, ComprobanteDetalle, ComprobanteTotales, Correlativo]),
    EntidadModule,
    MovimientosModule,
    InventarioModule
  ],
  controllers: [ComprobanteController, ComprasController, VentasController],
  providers: [
    ComprobanteService, 
    ComprasService, 
    VentasService, 
    ComprobanteDetalleService, 
    ComprobanteTotalesService
  ],
  exports: [TypeOrmModule, ComprobanteService, ComprasService, VentasService],
})
export class ComprobanteModule{}