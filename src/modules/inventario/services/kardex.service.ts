import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, EntityManager } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Inventario } from '../entities/inventario.entity';
import { InventarioLote } from '../entities/inventario-lote.entity';

import { KardexFilterDto } from '../dto/kardex-filter.dto';
import { KardexMovementDto } from '../dto/kardex-movement.dto';
import { StockBalanceDto, StockBalanceResponseDto } from '../dto/stock-balance.dto';
import { ValuationReportDto, ValuationItemDto } from '../dto/valuation-report.dto';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    @InjectRepository(InventarioLote)
    private readonly loteRepository: Repository<InventarioLote>,
    private readonly entityManager: EntityManager,
  ) {}

  /**
   * Obtiene el historial de movimientos de inventario (Kardex)
   */
  async getMovementHistory(filters: KardexFilterDto): Promise<{
    data: KardexMovementDto[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createMovementQueryBuilder(filters);
    
    if (!queryBuilder) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }

    // Obtener total de registros
    const total = await queryBuilder.getCount();

    // Aplicar paginación y obtener resultados
    const rawMovements = await queryBuilder
      .skip(skip)
      .limit(limit)
      .orderBy('c.fechaEmision', 'DESC')
      .addOrderBy('cd.idDetalle', 'ASC')
      .getRawMany();

    // Convertir a DTOs
    const movements = rawMovements.map((raw, index) => {
      const isCompra = raw.tipoOperacion === TipoOperacion.COMPRA;
      const cantidad = Number(raw.cantidad);
      const costoUnitario = Number(raw.costoUnitario);
      const valorTotal = Number(raw.valorTotal);

      return plainToInstance(KardexMovementDto, {
        id: index + 1, // ID temporal para el movimiento
        fecha: raw.fecha,
        tipoOperacion: raw.tipoOperacion,
        numeroComprobante: raw.numeroComprobante,
        descripcion: raw.descripcion,
        cantidadEntrada: isCompra ? cantidad : 0,
        costoUnitarioEntrada: isCompra ? costoUnitario : 0,
        valorTotalEntrada: isCompra ? valorTotal : 0,
        cantidadSalida: !isCompra ? cantidad : 0,
        costoUnitarioSalida: !isCompra ? costoUnitario : 0,
        valorTotalSalida: !isCompra ? valorTotal : 0,
        cantidadSaldo: 0, // Se calculará en calculateRunningBalances
        costoUnitarioSaldo: 0, // Se calculará en calculateRunningBalances
        valorTotalSaldo: 0, // Se calculará en calculateRunningBalances
        producto: {
          id: raw.idProducto || 0,
          codigo: raw.codigoProducto || '',
          nombre: raw.nombreProducto || '',
          unidadMedida: raw.unidadMedida || ''
        },
        almacen: {
          id: raw.idAlmacen || 0,
          nombre: raw.nombreAlmacen || '',
          codigo: raw.codigoAlmacen || ''
        },
        lote: raw.lote !== 'Sin lote' ? {
          id: raw.idLote || 0,
          numeroLote: raw.lote,
          fechaIngreso: raw.fechaIngresoLote || new Date(),
          fechaVencimiento: raw.fechaVencimientoLote
        } : undefined
      });
    });

    // Calcular balances acumulados
    const movementsWithBalance = this.calculateRunningBalances(movements);

    return {
      data: movementsWithBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene el balance actual de stock
   */
  async getCurrentStockBalance(filters: KardexFilterDto): Promise<StockBalanceResponseDto> {
    const queryBuilder = this.inventarioRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.producto', 'producto')
      .leftJoinAndSelect('inv.almacen', 'almacen')
      .leftJoinAndSelect('inv.inventarioLotes', 'lotes')
      .where('inv.stockActual > 0');

    // Aplicar filtros
    this.applyStockFilters(queryBuilder, filters);

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;
    
    queryBuilder.skip(offset).take(limit);
    
    const [inventarios, total] = await queryBuilder.getManyAndCount();
    
    // Calcular datos de balance
    const balances = await Promise.all(
      inventarios.map(async (inv) => this.calculateStockBalance(inv))
    );
    
    const data = plainToInstance(StockBalanceDto, balances, {
      excludeExtraneousValues: true,
    });
    
    // Calcular resumen
    const summary = {
      totalItems: total,
      totalStockValue: balances.reduce((sum, b) => sum + b.valorTotal, 0),
      totalQuantity: balances.reduce((sum, b) => sum + b.stockActual, 0),
    };
    
    return plainToInstance(StockBalanceResponseDto, {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    }, { excludeExtraneousValues: true });
  }

  /**
   * Genera reporte de valoración de inventario
   */
  async getValuationReport(
    filters: KardexFilterDto,
    metodoValoracion: MetodoValoracion = MetodoValoracion.FIFO
  ): Promise<ValuationReportDto> {
    const queryBuilder = this.inventarioRepository
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.producto', 'producto')
      .leftJoinAndSelect('inv.almacen', 'almacen')
      .leftJoinAndSelect('inv.inventarioLotes', 'lotes')
      .where('inv.stockActual > 0');

    this.applyStockFilters(queryBuilder, filters);

    // Paginación
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;
    
    queryBuilder.skip(offset).take(limit);
    
    const [inventarios, total] = await queryBuilder.getManyAndCount();
    
    // Calcular valoraciones
    const items = await Promise.all(
      inventarios.map(async (inv) => this.calculateValuations(inv))
    );
    
    const data = plainToInstance(ValuationItemDto, items, {
      excludeExtraneousValues: true,
    });
    
    // Calcular resumen
    const resumen = {
      totalFIFO: items.reduce((sum, item) => sum + item.valoracionFIFO, 0),
      totalLIFO: items.reduce((sum, item) => sum + item.valoracionLIFO, 0),
      totalPromedio: items.reduce((sum, item) => sum + item.valoracionPromedio, 0),
      diferenciaTotalFIFO_LIFO: 0,
      diferenciaTotalFIFO_Promedio: 0,
      cantidadTotalItems: total,
      valorTotalInventario: 0,
    };
    
    resumen.diferenciaTotalFIFO_LIFO = resumen.totalFIFO - resumen.totalLIFO;
    resumen.diferenciaTotalFIFO_Promedio = resumen.totalFIFO - resumen.totalPromedio;
    resumen.valorTotalInventario = resumen.totalFIFO; // Usar FIFO como base
    
    return plainToInstance(ValuationReportDto, {
      fechaReporte: new Date(),
      metodoValoracion,
      items: data,
      resumen,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { excludeExtraneousValues: true });
  }

  /**
   * Crea query builder para movimientos de inventario
   */
  private createMovementQueryBuilder(filters: KardexFilterDto): SelectQueryBuilder<any> | null {
    try {
      const queryBuilder = this.entityManager
         .createQueryBuilder()
         .select([
           'c.fechaEmision as fecha',
           'c.tipoOperacion as tipoOperacion',
           'CONCAT(c.serie, "-", c.numero) as numeroComprobante',
           'cd.descripcion as descripcion',
           'cd.cantidad as cantidad',
           'cd.precioUnitario as costoUnitario',
           'cd.total as valorTotal',
           'COALESCE(il.numeroLote, "Sin lote") as lote',
           'p.id as idProducto',
           'p.codigo as codigoProducto',
           'p.nombre as nombreProducto',
           'p.unidadMedida as unidadMedida',
           'a.id as idAlmacen',
           'a.nombre as nombreAlmacen',
           'il.id as idLote',
           'il.fechaIngreso as fechaIngresoLote',
           'il.fechaVencimiento as fechaVencimientoLote'
         ])
        .from('comprobante', 'c')
         .innerJoin('comprobante_detalle', 'cd', 'cd.id_comprobante = c.idComprobante')
         .innerJoin('inventario', 'i', 'i.id = cd.id_inventario')
         .innerJoin('producto', 'p', 'p.id = i.idProducto')
         .innerJoin('almacen', 'a', 'a.id = i.idAlmacen')
         .leftJoin('inventario_lote', 'il', 'il.id = cd.idLote')
         .where('1=1');

      // Aplicar filtros
      if (filters.idInventario) {
        queryBuilder.andWhere('i.id = :idInventario', { idInventario: filters.idInventario });
      }

      if (filters.idProducto) {
        queryBuilder.andWhere('i.idProducto = :idProducto', { idProducto: filters.idProducto });
      }

      if (filters.idAlmacen) {
        queryBuilder.andWhere('i.idAlmacen = :idAlmacen', { idAlmacen: filters.idAlmacen });
      }

      if (filters.fechaInicio) {
        queryBuilder.andWhere('c.fechaEmision >= :fechaInicio', { fechaInicio: filters.fechaInicio });
      }

      if (filters.fechaFin) {
        queryBuilder.andWhere('c.fechaEmision <= :fechaFin', { fechaFin: filters.fechaFin });
      }

      if (filters.tipoOperacion) {
        queryBuilder.andWhere('c.tipoOperacion = :tipoOperacion', { tipoOperacion: filters.tipoOperacion });
      }

      return queryBuilder;
    } catch (error) {
      console.error('Error creating movement query builder:', error);
      return null;
    }
  }

  /**
   * Aplica filtros para consultas de stock
   */
  private applyStockFilters(queryBuilder: SelectQueryBuilder<Inventario>, filters: KardexFilterDto): void {
    if (filters.idInventario) {
      queryBuilder.andWhere('inv.id = :idInventario', { idInventario: filters.idInventario });
    }
    
    if (filters.idProducto) {
      queryBuilder.andWhere('producto.id = :idProducto', { idProducto: filters.idProducto });
    }
    
    if (filters.idAlmacen) {
      queryBuilder.andWhere('almacen.id = :idAlmacen', { idAlmacen: filters.idAlmacen });
    }
  }

  /**
   * Calcula saldos acumulados para los movimientos
   */
  private calculateRunningBalances(movements: KardexMovementDto[]): KardexMovementDto[] {
    let cantidadAcumulada = 0;
    let valorAcumulado = 0;

    return movements.map(movement => {
      // Calcular entradas y salidas
      const entradaCantidad = movement.cantidadEntrada || 0;
      const salidaCantidad = movement.cantidadSalida || 0;
      const entradaValor = movement.valorTotalEntrada || 0;
      const salidaValor = movement.valorTotalSalida || 0;

      // Actualizar acumulados
      cantidadAcumulada += entradaCantidad - salidaCantidad;
      valorAcumulado += entradaValor - salidaValor;

      // Calcular costo unitario promedio
      const costoUnitarioPromedio = cantidadAcumulada > 0 ? valorAcumulado / cantidadAcumulada : 0;

      // Actualizar el movimiento con los saldos calculados
      movement.cantidadSaldo = cantidadAcumulada;
      movement.costoUnitarioSaldo = costoUnitarioPromedio;
      movement.valorTotalSaldo = valorAcumulado;

      return movement;
    });
  }

  /**
   * Calcula el balance de stock para un inventario
   */
  private async calculateStockBalance(inventario: Inventario): Promise<any> {
    const lotes = inventario.inventarioLotes || [];
    const lotesConStock = lotes.filter(lote => lote.cantidadActual > 0);
    
    let valorTotal = 0;
    let costoUnitarioPromedio = 0;
    
    if (lotesConStock.length > 0) {
      valorTotal = lotesConStock.reduce((sum, lote) => sum + (lote.cantidadActual * lote.costoUnitario), 0);
      costoUnitarioPromedio = inventario.stockActual > 0 ? valorTotal / inventario.stockActual : 0;
    }
    
    return {
      idInventario: inventario.id,
      stockActual: inventario.stockActual,
      costoUnitarioPromedio,
      valorTotal,
      fechaActualizacion: inventario.fechaActualizacion,
      producto: {
        id: inventario.producto.id,
        codigo: inventario.producto.codigo,
        nombre: inventario.producto.nombre,
        descripcion: inventario.producto.descripcion,
        unidadMedida: inventario.producto.unidadMedida,
        categoria: inventario.producto.categoria?.nombre || 'Sin categoría',
      },
      almacen: {
        id: inventario.almacen.id,
        nombre: inventario.almacen.nombre,
        ubicacion: inventario.almacen.ubicacion,
      },
      lotes: lotesConStock.map(lote => ({
        id: lote.id,
        numeroLote: lote.numeroLote || `LOTE-${lote.id}`,
        cantidadActual: lote.cantidadActual,
        costoUnitario: lote.costoUnitario,
        fechaIngreso: lote.fechaIngreso,
        fechaVencimiento: lote.fechaVencimiento,
        valorTotal: lote.cantidadActual * lote.costoUnitario,
      })),
    };
  }

  /**
   * Calcula valoraciones usando diferentes métodos
   */
  private async calculateValuations(inventario: Inventario): Promise<any> {
    const lotes = inventario.inventarioLotes || [];
    const lotesConStock = lotes
      .filter(lote => lote.cantidadActual > 0)
      .sort((a, b) => a.fechaIngreso.getTime() - b.fechaIngreso.getTime());
    
    const cantidadTotal = inventario.stockActual;
    
    // FIFO - Primeros en entrar, primeros en salir
    let valoracionFIFO = 0;
    let cantidadRestanteFIFO = cantidadTotal;
    for (const lote of lotesConStock) {
      if (cantidadRestanteFIFO <= 0) break;
      const cantidadAUsar = Math.min(cantidadRestanteFIFO, lote.cantidadActual);
      valoracionFIFO += cantidadAUsar * lote.costoUnitario;
      cantidadRestanteFIFO -= cantidadAUsar;
    }
    
    // LIFO - Últimos en entrar, primeros en salir
    let valoracionLIFO = 0;
    let cantidadRestanteLIFO = cantidadTotal;
    const lotesLIFO = [...lotesConStock].reverse();
    for (const lote of lotesLIFO) {
      if (cantidadRestanteLIFO <= 0) break;
      const cantidadAUsar = Math.min(cantidadRestanteLIFO, lote.cantidadActual);
      valoracionLIFO += cantidadAUsar * lote.costoUnitario;
      cantidadRestanteLIFO -= cantidadAUsar;
    }
    
    // Promedio ponderado
    const valorTotalLotes = lotesConStock.reduce((sum, lote) => sum + (lote.cantidadActual * lote.costoUnitario), 0);
    const costoUnitarioPromedio = cantidadTotal > 0 ? valorTotalLotes / cantidadTotal : 0;
    const valoracionPromedio = cantidadTotal * costoUnitarioPromedio;
    
    return {
      idInventario: inventario.id,
      producto: {
        id: inventario.producto.id,
        codigo: inventario.producto.codigo,
        nombre: inventario.producto.nombre,
        categoria: inventario.producto.categoria?.nombre || 'Sin categoría',
        unidadMedida: inventario.producto.unidadMedida,
      },
      almacen: {
        id: inventario.almacen.id,
        nombre: inventario.almacen.nombre,
      },
      cantidadActual: cantidadTotal,
      valoracionFIFO,
      costoUnitarioFIFO: cantidadTotal > 0 ? valoracionFIFO / cantidadTotal : 0,
      valoracionLIFO,
      costoUnitarioLIFO: cantidadTotal > 0 ? valoracionLIFO / cantidadTotal : 0,
      valoracionPromedio,
      costoUnitarioPromedio,
      diferencia_FIFO_LIFO: valoracionFIFO - valoracionLIFO,
      diferencia_FIFO_Promedio: valoracionFIFO - valoracionPromedio,
    };
  }
}