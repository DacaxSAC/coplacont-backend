import { Comprobante } from 'src/modules/comprobantes/entities/comprobante';
import {
  CreateMovimientoDetalleDto,
  CreateMovimientoDto,
  CreateDetalleSalidaDto,
} from '../dto';
import { EstadoMovimiento, TipoMovimiento } from '../enum';
import { Injectable } from '@nestjs/common';
import { ComprobanteDetalle } from 'src/modules/comprobantes/entities/comprobante-detalle';

@Injectable()
export class MovimientoFactory {
  constructor() {}

  /**
   * Crea un movimiento desde un comprobante
   * Utiliza el método de costeo promedio ponderado para calcular los costos en ventas
   * Para compras usa el precio unitario original del comprobante
   */
  async createMovimientoFromComprobante(
    comprobante: Comprobante,
    costosUnitarios: number[],
    precioYcantidadPorLote: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[],
  ): Promise<CreateMovimientoDto> {
    console.log('🔍 DEBUG MovimientoFactory - comprobante.tipoOperacion:', comprobante.tipoOperacion);
    console.log('🔍 DEBUG MovimientoFactory - comprobante.detalles:', comprobante.detalles?.length || 0);
    
    const detalles =
      await this.createMovimientosDetallesFromDetallesComprobante(
        comprobante.detalles,
        comprobante.tipoOperacion.descripcion,
        costosUnitarios,
        precioYcantidadPorLote,
      );

    console.log('🔍 DEBUG MovimientoFactory - detalles creados:', detalles.length);

    return {
      numeroDocumento: comprobante.serie + '-' + comprobante.numero,
      tipo: this.generateTipoFromTipoOperacion(comprobante.tipoOperacion.descripcion),
      fecha: comprobante.fechaEmision,
      observaciones: `Movimiento generado desde comprobante ${comprobante.serie}-${comprobante.numero}`,
      estado: EstadoMovimiento.PROCESADO,
      idComprobante: comprobante.idComprobante,
      detalles: detalles,
    };
  }

  /**
   * Crea los detalles de movimiento desde los detalles del comprobante
   * Para ventas: calcula el costo unitario usando el método de costeo promedio ponderado
   * Para compras: usa el precio unitario original del comprobante
   */
  async createMovimientosDetallesFromDetallesComprobante(
    detalles: ComprobanteDetalle[],
    tipoOperacion: string,
    costosUnitarios: number[],
    precioYcantidadPorLote: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[],
  ): Promise<CreateMovimientoDetalleDto[]> {
    console.log('🔍 DEBUG createMovimientosDetallesFromDetallesComprobante - Parámetros:');
    console.log('  - detalles.length:', detalles?.length || 0);
    console.log('  - tipoOperacion:', tipoOperacion);
    console.log('  - costosUnitarios:', costosUnitarios);
    console.log('  - precioYcantidadPorLote:', precioYcantidadPorLote);
    
    const movimientoDetalles: CreateMovimientoDetalleDto[] = [];
    let indice = 0; // Contador para acceder a los elementos consecutivos del array costosUnitarios
    let indiceLote = 0; // Contador para acceder a los lotes por detalle

    for (const detalle of detalles) {
      console.log(`🔍 DEBUG - Procesando detalle ${indice + 1}:`, {
        detalle: detalle,
        inventario: detalle.inventario,
        idInventario: detalle.inventario?.id,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario
      });
      
      // Validar que el detalle tenga inventario
      if (!detalle.inventario || !detalle.inventario.id) {
        console.error(`🚨 ERROR - Detalle ${indice + 1} no tiene inventario válido:`, detalle);
        indice++;
        continue;
      }
      
      let costoUnitario: number;
      let detallesSalida: CreateDetalleSalidaDto[] | undefined;

      const op = (tipoOperacion || '').toUpperCase();
      if (op === 'COMPRA' || op.includes('ENTRADA')) {
        // Para compras (entradas), usar el precio unitario original del comprobante
        costoUnitario = detalle.precioUnitario;
        console.log(`🔍 DEBUG - Es COMPRA, costoUnitario: ${costoUnitario}`);
      } else {
        const costoUnitarioCalculado = costosUnitarios[indice];
        // Si no hay costo calculado, usar el precio unitario del comprobante como fallback
        costoUnitario =
          costoUnitarioCalculado > 0
            ? costoUnitarioCalculado
            : detalle.precioUnitario;

        console.log(`🔍 DEBUG - Es VENTA, costoUnitario calculado: ${costoUnitario}`);

        // Obtener los lotes correspondientes a este detalle
        const lotesParaEsteDetalle: CreateDetalleSalidaDto[] = [];
        let cantidadRestante = detalle.cantidad;

        while (
          cantidadRestante > 0 &&
          indiceLote < precioYcantidadPorLote.length
        ) {
          const lote = precioYcantidadPorLote[indiceLote];
          const cantidadAUsar = Math.min(cantidadRestante, lote.cantidad);

          lotesParaEsteDetalle.push({
            idLote: lote.idLote,
            costoUnitarioDeLote: lote.costoUnitarioDeLote,
            cantidad: cantidadAUsar,
          });

          cantidadRestante -= cantidadAUsar;

          if (cantidadAUsar === lote.cantidad) {
            indiceLote++;
          } else {
            // Actualizar la cantidad restante del lote
            precioYcantidadPorLote[indiceLote].cantidad -= cantidadAUsar;
          }
        }

        detallesSalida =
          lotesParaEsteDetalle.length > 0 ? lotesParaEsteDetalle : undefined;
      }

      const movimientoDetalle: CreateMovimientoDetalleDto = {
        idInventario: detalle.inventario.id,
        cantidad: detalle.cantidad,
        // costoUnitario se calcula dinámicamente
      };

      console.log('Estos serian los detalles de salida', detallesSalida);

      // Para compras/entradas, asignar el idLote del lote creado
      if (
        op === 'COMPRA' || op.includes('ENTRADA') || op.includes('INGRESO')
      ) {
        if (indiceLote < precioYcantidadPorLote.length) {
        const loteCompra = precioYcantidadPorLote[indiceLote];
        movimientoDetalle.idLote = loteCompra.idLote;
        console.log(
          `🔗 Asignando lote ${loteCompra.idLote} al movimiento de entrada para inventario ${detalle.inventario.id}`,
        );
        indiceLote++;
        }
      }

      if (detallesSalida) {
        movimientoDetalle.detallesSalida = detallesSalida;
      }

      console.log(`🔍 DEBUG - MovimientoDetalle creado:`, movimientoDetalle);
      movimientoDetalles.push(movimientoDetalle);

      indice++;
    }

    console.log(`🔍 DEBUG - Total movimientoDetalles creados: ${movimientoDetalles.length}`);
    return movimientoDetalles;
  }

  private generateTipoFromTipoOperacion(tipoOperacion: string): TipoMovimiento {
    const op = (tipoOperacion || '').trim().toUpperCase();
    if (op === 'COMPRA') return TipoMovimiento.ENTRADA;
    if (op === 'VENTA') return TipoMovimiento.SALIDA;
    if (op.includes('ENTRADA') || op.includes('INGRESO')) return TipoMovimiento.ENTRADA;
    if (op.includes('SALIDA') || op.includes('EGRESO')) return TipoMovimiento.SALIDA;
    throw new Error(`Tipo de operación no soportado: ${tipoOperacion}`);
  }
}
