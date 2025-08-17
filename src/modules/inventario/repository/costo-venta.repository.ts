import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TipoMovimiento } from 'src/modules/movimientos/enum/tipo-movimiento.enum';

export interface CostoVentaMensualData {
  mes: number;
  comprasTotales: number;
  salidasTotales: number;
  inventarioFinal: number;
}

export interface CostoVentaFiltros {
  año: number;
  idAlmacen?: number;
  idProducto?: number;
}

@Injectable()
export class CostoVentaRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  /**
   * Obtiene los datos mensuales de compras para un año específico
   */
  async getComprasMensuales(filtros: CostoVentaFiltros): Promise<{ mes: number; total: number }[]> {
    let sql = `
      SELECT 
        EXTRACT(MONTH FROM c."fechaEmision") as mes,
        COALESCE(SUM(
          CASE 
            WHEN COALESCE(m.tipo, 'ENTRADA') = 'ENTRADA' 
            THEN COALESCE(md.cantidad * md.costo_unitario, cd.cantidad * cd."precioUnitario")
            ELSE 0
          END
        ), 0) as total
      FROM comprobante c
      INNER JOIN comprobante_detalle cd ON c."idComprobante" = cd.id_comprobante
      INNER JOIN inventario i ON cd.id_inventario = i.id
      INNER JOIN producto p ON i.id_producto = p.id
      INNER JOIN almacen a ON i.id_almacen = a.id
      LEFT JOIN movimientos m ON m.id_comprobante = c."idComprobante"
      LEFT JOIN movimiento_detalles md ON m.id = md.id_movimiento AND md.id_inventario = i.id
      WHERE EXTRACT(YEAR FROM c."fechaEmision") = $1
    `;

    const params: any[] = [filtros.año];
    let paramIndex = 2;

    if (filtros.idAlmacen) {
      sql += ` AND a.id = $${paramIndex}`;
      params.push(filtros.idAlmacen);
      paramIndex++;
    }

    if (filtros.idProducto) {
      sql += ` AND p.id = $${paramIndex}`;
      params.push(filtros.idProducto);
      paramIndex++;
    }

    sql += `
      GROUP BY EXTRACT(MONTH FROM c."fechaEmision")
      ORDER BY mes
    `;

    const result = await this.dataSource.query(sql, params);
    return result.map(row => ({
      mes: parseInt(row.mes),
      total: parseFloat(row.total) || 0
    }));
  }

  /**
   * Obtiene los datos mensuales de salidas para un año específico
   */
  async getSalidasMensuales(filtros: CostoVentaFiltros): Promise<{ mes: number; total: number }[]> {
    let sql = `
      SELECT 
        EXTRACT(MONTH FROM c."fechaEmision") as mes,
        COALESCE(SUM(
          CASE 
            WHEN COALESCE(m.tipo, 'ENTRADA') = 'SALIDA' 
            THEN COALESCE(md.cantidad * md.costo_unitario, cd.cantidad * cd."precioUnitario")
            ELSE 0
          END
        ), 0) as total
      FROM comprobante c
      INNER JOIN comprobante_detalle cd ON c."idComprobante" = cd.id_comprobante
      INNER JOIN inventario i ON cd.id_inventario = i.id
      INNER JOIN producto p ON i.id_producto = p.id
      INNER JOIN almacen a ON i.id_almacen = a.id
      LEFT JOIN movimientos m ON m.id_comprobante = c."idComprobante"
      LEFT JOIN movimiento_detalles md ON m.id = md.id_movimiento AND md.id_inventario = i.id
      WHERE EXTRACT(YEAR FROM c."fechaEmision") = $1
        AND COALESCE(m.tipo, 'ENTRADA') = 'SALIDA'
    `;

    const params: any[] = [filtros.año];
    let paramIndex = 2;

    if (filtros.idAlmacen) {
      sql += ` AND a.id = $${paramIndex}`;
      params.push(filtros.idAlmacen);
      paramIndex++;
    }

    if (filtros.idProducto) {
      sql += ` AND p.id = $${paramIndex}`;
      params.push(filtros.idProducto);
      paramIndex++;
    }

    sql += `
      GROUP BY EXTRACT(MONTH FROM c."fechaEmision")
      ORDER BY mes
    `;

    const result = await this.dataSource.query(sql, params);
    return result.map(row => ({
      mes: parseInt(row.mes),
      total: parseFloat(row.total) || 0
    }));
  }

  /**
   * Calcula el inventario final para un mes específico
   */
  async getInventarioFinalMensual(
    filtros: CostoVentaFiltros,
    mes: number
  ): Promise<number> {
    // Fecha de corte: último día del mes
    const fechaCorte = new Date(filtros.año, mes, 0, 23, 59, 59, 999);

    let sql = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN COALESCE(m.tipo, 'ENTRADA') = 'ENTRADA' 
            THEN COALESCE(md.cantidad * md.costo_unitario, cd.cantidad * cd."precioUnitario")
            ELSE -COALESCE(md.cantidad * md.costo_unitario, cd.cantidad * cd."precioUnitario")
          END
        ), 0) as total
      FROM comprobante c
      INNER JOIN comprobante_detalle cd ON c."idComprobante" = cd.id_comprobante
      INNER JOIN inventario i ON cd.id_inventario = i.id
      INNER JOIN producto p ON i.id_producto = p.id
      INNER JOIN almacen a ON i.id_almacen = a.id
      LEFT JOIN movimientos m ON m.id_comprobante = c."idComprobante"
      LEFT JOIN movimiento_detalles md ON m.id = md.id_movimiento AND md.id_inventario = i.id
      WHERE c."fechaEmision" <= $1
    `;

    const params: any[] = [fechaCorte];
    let paramIndex = 2;

    if (filtros.idAlmacen) {
      sql += ` AND a.id = $${paramIndex}`;
      params.push(filtros.idAlmacen);
      paramIndex++;
    }

    if (filtros.idProducto) {
      sql += ` AND p.id = $${paramIndex}`;
      params.push(filtros.idProducto);
      paramIndex++;
    }

    const result = await this.dataSource.query(sql, params);
    return parseFloat(result[0]?.total) || 0;
  }

  /**
   * Obtiene información del almacén por ID
   */
  async getAlmacenInfo(idAlmacen: number): Promise<{ nombre: string } | null> {
    const sql = `SELECT nombre FROM almacen WHERE id = $1`;
    const result = await this.dataSource.query(sql, [idAlmacen]);
    return result[0] || null;
  }

  /**
   * Obtiene información del producto por ID
   */
  async getProductoInfo(idProducto: number): Promise<{ nombre: string } | null> {
    const sql = `SELECT nombre FROM producto WHERE id = $1`;
    const result = await this.dataSource.query(sql, [idProducto]);
    return result[0] || null;
  }

  /**
   * Obtiene los datos completos del reporte de costo de venta para un año
   */
  async getCostoVentaAnual(filtros: CostoVentaFiltros): Promise<CostoVentaMensualData[]> {
    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    const resultado: CostoVentaMensualData[] = [];

    // Obtener compras y salidas mensuales
    const comprasMensuales = await this.getComprasMensuales(filtros);
    const salidasMensuales = await this.getSalidasMensuales(filtros);

    // Crear mapa para acceso rápido
    const comprasMap = new Map(comprasMensuales.map(c => [c.mes, c.total]));
    const salidasMap = new Map(salidasMensuales.map(s => [s.mes, s.total]));

    // Calcular datos para cada mes
    for (const mes of meses) {
      const comprasTotales = comprasMap.get(mes) || 0;
      const salidasTotales = salidasMap.get(mes) || 0;
      const inventarioFinal = await this.getInventarioFinalMensual(filtros, mes);

      resultado.push({
        mes,
        comprasTotales,
        salidasTotales,
        inventarioFinal
      });
    }

    return resultado;
  }
}