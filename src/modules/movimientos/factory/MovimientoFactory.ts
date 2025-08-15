import { Comprobante } from "src/modules/comprobantes/entities/comprobante";
import { CreateMovimientoDetalleDto, CreateMovimientoDto, ResponseMovimientoDto } from "../dto";
import { TipoOperacion } from "src/modules/comprobantes/enum/tipo-operacion.enum";
import { EstadoMovimiento, TipoMovimiento } from "../enum";
import { Injectable } from "@nestjs/common";
import { ComprobanteDetalle } from "src/modules/comprobantes/entities/comprobante-detalle";

@Injectable()
export class MovimientoFactory {

    createMovimientoFromComprobante(comprobante : Comprobante): CreateMovimientoDto {
        return {
            tipo: this.generateTipoFromTipoOperacion(comprobante.tipoOperacion),
            fecha: comprobante.fechaEmision,
            observaciones: `Movimiento generado desde comprobante ${comprobante.serie}-${comprobante.numero}`,
            estado: EstadoMovimiento.PROCESADO,
            idComprobante: comprobante.idComprobante,
            detalles:this.createMovimientosDetallesFromDetallesComprobante(comprobante.detalles)
        }
    }

    createMovimientosDetallesFromDetallesComprobante (detalles: ComprobanteDetalle[]): CreateMovimientoDetalleDto[] {
        return detalles.map(detalle => ({
            idInventario: detalle.inventario.id,
            cantidad: detalle.cantidad,
            costoUnitario: detalle.precioUnitario
        }))
    }

    generateTipoFromTipoOperacion (tipoOperacion : TipoOperacion) : TipoMovimiento {
        if (tipoOperacion === TipoOperacion.COMPRA) {
            return TipoMovimiento.ENTRADA;
        } else {
            return TipoMovimiento.SALIDA;
        }
    }


}