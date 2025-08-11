import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comprobante } from "./entities/comprobante";
import { ComprobanteDetalle } from "./entities/comprobante-detalle";
import { ComprobanteTotales } from "./entities/comprobante-totales";
import { ComprobanteController } from "./controller/comprobante.controller";
import { ComprobanteService } from "./service/comprobante.service";
import { PersonModule } from "../persons/person.module";
import { ComprobanteDetalleService } from "./service/comprobante-detalle.service";
import { ComprobanteTotalesService } from "./service/comprobante-totales.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comprobante, ComprobanteDetalle, ComprobanteTotales]),
    PersonModule
  ],
  controllers: [ComprobanteController],
  providers: [ComprobanteService, ComprobanteDetalleService, ComprobanteTotalesService],
  exports: [TypeOrmModule, ComprobanteService],
})
export class ComprobanteModule{}