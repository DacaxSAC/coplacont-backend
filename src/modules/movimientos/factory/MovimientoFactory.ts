import { Comprobante } from "src/modules/comprobantes/entities/comprobante";
import { CreateMovimientoDetalleDto, CreateMovimientoDto, ResponseMovimientoDto } from "../dto";
import { TipoOperacion } from "src/modules/comprobantes/enum/tipo-operacion.enum";
import { EstadoMovimiento, TipoMovimiento } from "../enum";
import { Injectable } from "@nestjs/common";
import { ComprobanteDetalle } from "src/modules/comprobantes/entities/comprobante-detalle";
import { InventarioLoteService } from "src/modules/inventario/service/inventario-lote.service";

@Injectable()
export class MovimientoFactory {

    constructor(
        private readonly inventarioLoteService: InventarioLoteService
    ) {}

    /**
     * Crea un movimiento desde un comprobante
     * Utiliza el método de costeo promedio ponderado para calcular los costos en ventas
     * Para compras usa el precio unitario original del comprobante
     */
    async createMovimientoFromComprobante(comprobante : Comprobante, costosUnitarios: number[]): Promise<CreateMovimientoDto> {
        console.log('Comprobante')
        console.log(comprobante.detalles);
        const detalles = await this.createMovimientosDetallesFromDetallesComprobante(comprobante.detalles, comprobante.tipoOperacion, costosUnitarios);
        
        return {
            tipo: this.generateTipoFromTipoOperacion(comprobante.tipoOperacion),
            fecha: comprobante.fechaEmision,
            observaciones: `Movimiento generado desde comprobante ${comprobante.serie}-${comprobante.numero}`,
            estado: EstadoMovimiento.PROCESADO,
            idComprobante: comprobante.idComprobante,
            detalles: detalles
        }
    }

    /**
     * Crea los detalles de movimiento desde los detalles del comprobante
     * Para ventas: calcula el costo unitario usando el método de costeo promedio ponderado
     * Para compras: usa el precio unitario original del comprobante
     */
    async createMovimientosDetallesFromDetallesComprobante (detalles: ComprobanteDetalle[], tipoOperacion: TipoOperacion, costosUnitarios: number[]): Promise<CreateMovimientoDetalleDto[]> {
        const movimientoDetalles: CreateMovimientoDetalleDto[] = [];
        let indice = 0; // Contador para acceder a los elementos consecutivos del array costosUnitarios
        
        for (const detalle of detalles) {
            let costoUnitario: number;
            
            if (tipoOperacion === TipoOperacion.COMPRA) {
                // Para compras (entradas), usar el precio unitario original del comprobante
                costoUnitario = detalle.precioUnitario;
            } else {
                // Para ventas (salidas), calcular el costo unitario promedio ponderado
                //const costoUnitarioPromedio = await this.inventarioLoteService.getCostoPromedioPonderado(detalle.inventario.id);
                const costoUnitarioPromedio = costosUnitarios[indice]/detalle.cantidad;
                console.log(costoUnitarioPromedio);
                // Si no hay costo promedio (inventario sin lotes), usar el precio unitario del comprobante
                costoUnitario = costoUnitarioPromedio > 0 ? costoUnitarioPromedio : detalle.precioUnitario;
            }
            
            movimientoDetalles.push({
                idInventario: detalle.inventario.id,
                cantidad: detalle.cantidad,
                costoUnitario: costoUnitario
            });
            
            indice++; // Incrementar el índice para el siguiente elemento
        }
        
        return movimientoDetalles;
    }

    generateTipoFromTipoOperacion (tipoOperacion : TipoOperacion) : TipoMovimiento {
        if (tipoOperacion === TipoOperacion.COMPRA) {
            return TipoMovimiento.ENTRADA;
        } else {
            return TipoMovimiento.SALIDA;
        }
    }


}