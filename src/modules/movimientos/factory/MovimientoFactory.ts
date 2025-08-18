import { Comprobante } from "src/modules/comprobantes/entities/comprobante";
import { CreateMovimientoDetalleDto, CreateMovimientoDto, ResponseMovimientoDto, CreateDetalleSalidaDto } from "../dto";
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
    async createMovimientoFromComprobante(comprobante : Comprobante, costosUnitarios: number[], precioYcantidadPorLote: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[]): Promise<CreateMovimientoDto> {
        console.log('Comprobante')
        console.log(comprobante.detalles);
        const detalles = await this.createMovimientosDetallesFromDetallesComprobante(comprobante.detalles, comprobante.tipoOperacion, costosUnitarios, precioYcantidadPorLote);
        
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
    async createMovimientosDetallesFromDetallesComprobante (detalles: ComprobanteDetalle[], tipoOperacion: TipoOperacion, costosUnitarios: number[], precioYcantidadPorLote: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[]): Promise<CreateMovimientoDetalleDto[]> {
        const movimientoDetalles: CreateMovimientoDetalleDto[] = [];
        let indice = 0; // Contador para acceder a los elementos consecutivos del array costosUnitarios
        let indiceLote = 0; // Contador para acceder a los lotes por detalle
        
        for (const detalle of detalles) {
            let costoUnitario: number;
            let detallesSalida: CreateDetalleSalidaDto[] | undefined;
            
            if (tipoOperacion === TipoOperacion.COMPRA) {
                // Para compras (entradas), usar el precio unitario original del comprobante
                costoUnitario = detalle.precioUnitario;
            } else {
                // Para ventas (salidas), calcular el costo unitario promedio ponderado
                //const costoUnitarioPromedio = await this.inventarioLoteService.getCostoPromedioPonderado(detalle.inventario.id);
                console.log('Estamos en la parte donde registramos el detalle de un movimiento');
                console.log('TIPO: SALIDA');
                console.log('Antes de modificar la base de datos, este seria el detalle del detalle de movimiento de SALIDA');
                console.log(precioYcantidadPorLote);
                const costoUnitarioPromedio = costosUnitarios[indice]/detalle.cantidad;
                console.log(costoUnitarioPromedio);
                // Si no hay costo promedio (inventario sin lotes), usar el precio unitario del comprobante
                costoUnitario = costoUnitarioPromedio > 0 ? costoUnitarioPromedio : detalle.precioUnitario;
                
                // Obtener los lotes correspondientes a este detalle
                const lotesParaEsteDetalle: CreateDetalleSalidaDto[] = [];
                let cantidadRestante = detalle.cantidad;
                
                while (cantidadRestante > 0 && indiceLote < precioYcantidadPorLote.length) {
                    const lote = precioYcantidadPorLote[indiceLote];
                    const cantidadAUsar = Math.min(cantidadRestante, lote.cantidad);
                    
                    lotesParaEsteDetalle.push({
                        idLote: lote.idLote,
                        costoUnitarioDeLote: lote.costoUnitarioDeLote,
                        cantidad: cantidadAUsar
                    });
                    
                    cantidadRestante -= cantidadAUsar;
                    
                    if (cantidadAUsar === lote.cantidad) {
                        indiceLote++;
                    } else {
                        // Actualizar la cantidad restante del lote
                        precioYcantidadPorLote[indiceLote].cantidad -= cantidadAUsar;
                    }
                }
                console.log('Lotes para este detalle');
                console.log(lotesParaEsteDetalle);
                detallesSalida = lotesParaEsteDetalle.length > 0 ? lotesParaEsteDetalle : undefined;
            }
            
            const movimientoDetalle: CreateMovimientoDetalleDto = {
                idInventario: detalle.inventario.id,
                cantidad: detalle.cantidad,
                costoUnitario: costoUnitario
            };

            console.log('Estos serian los detalles de salida',detallesSalida);

            if (detallesSalida) {
                movimientoDetalle.detallesSalida = detallesSalida;
            }
            
            movimientoDetalles.push(movimientoDetalle);
            
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