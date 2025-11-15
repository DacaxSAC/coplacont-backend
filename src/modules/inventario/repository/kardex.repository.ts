import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';

export interface DetalleSalidaData {
  id: number;
  idLote: number;
  costoUnitarioDeLote: number;
  cantidad: number;
}

export interface KardexMovementData {
  fecha: Date;
  tipoOperacion: string; // Ahora es string en lugar de enum
  tipoMovimiento: TipoMovimiento;
  tipoComprobante: string;
  numeroComprobante: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  idInventario: number;
  nombreProducto: string;
  nombreAlmacen: string;
  detallesSalida?: DetalleSalidaData[];
}

@Injectable()
export class KardexRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Obtiene los movimientos del kardex para un producto específico en un almacén
   * Usa consulta SQL directa para evitar dependencias circulares
   * Incluye detalles de salida cuando el movimiento es de tipo SALIDA
   */
  async getKardexMovements(
    idInventario: number,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<KardexMovementData[]> {
    let sql = `
      SELECT 
        c."fechaEmision" as fecha,
        td.descripcion as "tipoOperacion",
        COALESCE(m.tipo, 'ENTRADA') as "tipoMovimiento",
        tdc.descripcion as "tipoComprobante",
        CONCAT(c.serie, '-', c.numero) as "numeroComprobante",
        COALESCE(md.cantidad, cd.cantidad) as cantidad,
        cd."precioUnitario" as "costoUnitario",
        cd.cantidad * cd."precioUnitario" as "costoTotal",
        i.id as "idInventario",
        p.nombre as "nombreProducto",
        a.nombre as "nombreAlmacen",
        md.id as "idMovimientoDetalle"
      FROM comprobante c
      INNER JOIN comprobante_detalle cd ON c."idComprobante" = cd.id_comprobante
      INNER JOIN inventario i ON cd.id_inventario = i.id
      INNER JOIN producto p ON i.id_producto = p.id
      INNER JOIN almacen a ON i.id_almacen = a.id
      INNER JOIN tabla_detalle td ON c."idTipoOperacion" = td."idTablaDetalle"
      INNER JOIN tabla_detalle tdc ON c."idTipoComprobante" = tdc."idTablaDetalle"
      LEFT JOIN movimientos m ON m.id_comprobante = c."idComprobante"
      LEFT JOIN movimiento_detalles md ON m.id = md.id_movimiento AND md.id_inventario = i.id
      WHERE i.id = $1
    `;

    const params: any[] = [idInventario];
    let paramIndex = 2;

    if (fechaInicio) {
      sql += ` AND c."fechaEmision" >= $${paramIndex}`;
      params.push(fechaInicio);
      paramIndex++;
    }

    if (fechaFin) {
      sql += ` AND c."fechaEmision" <= $${paramIndex}`;
      params.push(fechaFin);
      paramIndex++;
    }

    sql += ` ORDER BY c."fechaEmision" ASC, c."idComprobante" ASC`;

    const movimientos: Array<{
      fecha: Date;
      tipoOperacion: string;
      tipoMovimiento: string;
      tipoComprobante: string;
      numeroComprobante: string;
      cantidad: string | number;
      costoUnitario: string | number;
      costoTotal: string | number;
      idInventario: string | number;
      nombreProducto: string;
      nombreAlmacen: string;
      idMovimientoDetalle?: number;
    }> = await this.dataSource.query(sql, params);

    // Obtener detalles de salida para movimientos de tipo SALIDA
    const movimientosConDetalles: KardexMovementData[] = await Promise.all(
      movimientos.map(async (movimiento) => {
        if (
          movimiento.tipoMovimiento === 'SALIDA' &&
          movimiento.idMovimientoDetalle
        ) {
          const detallesSalidaSql = `
            SELECT 
              ds.id,
              ds.id_lote as "idLote",
              ds.costo_unitario_de_lote as "costoUnitarioDeLote",
              ds.cantidad
            FROM detalle_salidas ds
            WHERE ds.id_movimiento_detalle = $1
          `;

          const detallesSalida: Array<{
            id: number;
            idLote: number;
            costoUnitarioDeLote: number;
            cantidad: number;
          }> = await this.dataSource.query(detallesSalidaSql, [
            movimiento.idMovimientoDetalle,
          ]);

          return {
            fecha: new Date(movimiento.fecha),
            tipoOperacion: movimiento.tipoOperacion,
            tipoMovimiento: TipoMovimiento.SALIDA,
            tipoComprobante: movimiento.tipoComprobante,
            numeroComprobante: movimiento.numeroComprobante,
            cantidad: Number(movimiento.cantidad),
            costoUnitario: Number(movimiento.costoUnitario),
            costoTotal: Number(movimiento.costoTotal),
            idInventario: Number(movimiento.idInventario),
            nombreProducto: movimiento.nombreProducto,
            nombreAlmacen: movimiento.nombreAlmacen,
            detallesSalida:
              detallesSalida.length > 0 ? detallesSalida : undefined,
          };
        }

        // Remover el campo idMovimientoDetalle del resultado final
        const mov = movimiento as any;
        return {
          fecha: new Date(mov.fecha),
          tipoOperacion: mov.tipoOperacion,
          tipoMovimiento:
            mov.tipoMovimiento === 'ENTRADA'
              ? TipoMovimiento.ENTRADA
              : TipoMovimiento.SALIDA,
          tipoComprobante: mov.tipoComprobante,
          numeroComprobante: mov.numeroComprobante,
          cantidad: Number(mov.cantidad),
          costoUnitario: Number(mov.costoUnitario),
          costoTotal: Number(mov.costoTotal),
          idInventario: Number(mov.idInventario),
          nombreProducto: mov.nombreProducto,
          nombreAlmacen: mov.nombreAlmacen,
        } as KardexMovementData;
      }),
    );

    return movimientosConDetalles;
  }

  /**
   * Calcula el stock inicial para una fecha específica
   */
  async getStockInicial(
    idInventario: number,
    fechaCorte: Date,
  ): Promise<{ cantidad: number; costoTotal: number }> {
    const sql = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN COALESCE(m.tipo, 'ENTRADA') = 'ENTRADA' THEN COALESCE(md.cantidad, cd.cantidad)
            ELSE -COALESCE(md.cantidad, cd.cantidad)
          END
        ), 0) as cantidad,
        COALESCE(SUM(
          CASE 
            WHEN COALESCE(m.tipo, 'ENTRADA') = 'ENTRADA' THEN cd.cantidad * cd."precioUnitario"
            ELSE -cd.cantidad * cd."precioUnitario"
          END
        ), 0) as "costoTotal"
      FROM comprobante c
      INNER JOIN comprobante_detalle cd ON c."idComprobante" = cd.id_comprobante
      INNER JOIN inventario i ON cd.id_inventario = i.id
      LEFT JOIN movimientos m ON m.id_comprobante = c."idComprobante"
      LEFT JOIN movimiento_detalles md ON m.id = md.id_movimiento AND md.id_inventario = i.id
      WHERE i.id = $1 AND c."fechaEmision" < $2
    `;

    const result: Array<{
      cantidad: string | number;
      costoTotal: string | number;
    }> = await this.dataSource.query(sql, [idInventario, fechaCorte]);
    return {
      cantidad: parseFloat(String(result[0]?.cantidad)) || 0,
      costoTotal: parseFloat(String(result[0]?.costoTotal)) || 0,
    };
  }
}
