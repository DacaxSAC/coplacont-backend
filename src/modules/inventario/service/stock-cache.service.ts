import { Injectable } from '@nestjs/common';
import { LoteStockResult } from './stock-calculation.service';

/**
 * Interfaz para el resultado de stock de inventario en caché
 */
export interface InventarioStockCacheResult {
  stockActual: number;
  costoPromedioActual: number;
  valorTotal: number;
}

/**
 * Interfaz para entrada de caché con TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Servicio de caché inteligente para optimizar cálculos de stock
 * Implementa TTL (Time To Live) y invalidación selectiva
 */
@Injectable()
export class StockCacheService {
  private readonly lotesStockCache = new Map<
    string,
    CacheEntry<LoteStockResult>
  >();
  private readonly inventarioStockCache = new Map<
    string,
    CacheEntry<InventarioStockCacheResult>
  >();
  private readonly lotesDisponiblesCache = new Map<
    string,
    CacheEntry<LoteStockResult[]>
  >();

  // TTL por defecto: 5 minutos
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  // TTL para consultas frecuentes: 2 minutos
  private readonly FREQUENT_TTL = 2 * 60 * 1000;

  // TTL para consultas complejas: 10 minutos
  private readonly COMPLEX_TTL = 10 * 60 * 1000;

  /**
   * Obtiene el stock de un lote desde caché
   * @param idLote - ID del lote
   * @param fechaHasta - Fecha hasta la cual calcular
   * @returns Stock del lote o null si no está en caché o expiró
   */
  getLoteStock(idLote: number, fechaHasta?: Date): LoteStockResult | null {
    const key = this.generateLoteStockKey(idLote, fechaHasta);
    return this.getFromCache(this.lotesStockCache, key);
  }

  /**
   * Almacena el stock de un lote en caché
   * @param idLote - ID del lote
   * @param fechaHasta - Fecha hasta la cual se calculó
   * @param stock - Resultado del cálculo de stock
   * @param ttl - TTL personalizado (opcional)
   */
  setLoteStock(
    idLote: number,
    fechaHasta: Date | undefined,
    stock: LoteStockResult,
    ttl: number = this.FREQUENT_TTL,
  ): void {
    const key = this.generateLoteStockKey(idLote, fechaHasta);
    this.setInCache(this.lotesStockCache, key, stock, ttl);
  }

  /**
   * Obtiene el stock de un inventario desde caché
   * @param idInventario - ID del inventario
   * @param fechaHasta - Fecha hasta la cual calcular
   * @returns Stock del inventario o null si no está en caché o expiró
   */
  getInventarioStock(
    idInventario: number,
    fechaHasta?: Date,
  ): InventarioStockCacheResult | null {
    const key = this.generateInventarioStockKey(idInventario, fechaHasta);
    return this.getFromCache(this.inventarioStockCache, key);
  }

  /**
   * Almacena el stock de un inventario en caché
   * @param idInventario - ID del inventario
   * @param fechaHasta - Fecha hasta la cual se calculó
   * @param stock - Resultado del cálculo de stock
   * @param ttl - TTL personalizado (opcional)
   */
  setInventarioStock(
    idInventario: number,
    fechaHasta: Date | undefined,
    stock: InventarioStockCacheResult,
    ttl: number = this.DEFAULT_TTL,
  ): void {
    const key = this.generateInventarioStockKey(idInventario, fechaHasta);
    this.setInCache(this.inventarioStockCache, key, stock, ttl);
  }

  /**
   * Obtiene los lotes disponibles desde caché
   * @param idInventario - ID del inventario
   * @param fechaHasta - Fecha hasta la cual calcular
   * @returns Lotes disponibles o null si no está en caché o expiró
   */
  getLotesDisponibles(
    idInventario: number,
    fechaHasta?: Date,
  ): LoteStockResult[] | null {
    const key = this.generateLotesDisponiblesKey(idInventario, fechaHasta);
    return this.getFromCache(this.lotesDisponiblesCache, key);
  }

  /**
   * Almacena los lotes disponibles en caché
   * @param idInventario - ID del inventario
   * @param fechaHasta - Fecha hasta la cual se calculó
   * @param lotes - Lista de lotes disponibles
   * @param ttl - TTL personalizado (opcional)
   */
  setLotesDisponibles(
    idInventario: number,
    fechaHasta: Date | undefined,
    lotes: LoteStockResult[],
    ttl: number = this.DEFAULT_TTL,
  ): void {
    const key = this.generateLotesDisponiblesKey(idInventario, fechaHasta);
    this.setInCache(this.lotesDisponiblesCache, key, lotes, ttl);
  }

  /**
   * Invalida todas las entradas de caché relacionadas con un lote específico
   * Se debe llamar cuando se registra un nuevo movimiento que afecta al lote
   * @param idLote - ID del lote afectado
   */
  invalidateLote(idLote: number): void {
    // Invalidar caché de stock del lote específico
    const loteKeys = Array.from(this.lotesStockCache.keys()).filter((key) =>
      key.startsWith(`lote_${idLote}_`),
    );

    loteKeys.forEach((key) => this.lotesStockCache.delete(key));
  }

  /**
   * Invalida todas las entradas de caché relacionadas con un inventario específico
   * Se debe llamar cuando se registra un nuevo movimiento que afecta al inventario
   * @param idInventario - ID del inventario afectado
   */
  invalidateInventario(idInventario: number): void {
    // Invalidar caché de stock del inventario
    const inventarioKeys = Array.from(this.inventarioStockCache.keys()).filter(
      (key) => key.startsWith(`inventario_${idInventario}_`),
    );

    inventarioKeys.forEach((key) => this.inventarioStockCache.delete(key));

    // Invalidar caché de lotes disponibles del inventario
    const lotesKeys = Array.from(this.lotesDisponiblesCache.keys()).filter(
      (key) => key.startsWith(`lotes_${idInventario}_`),
    );

    lotesKeys.forEach((key) => this.lotesDisponiblesCache.delete(key));
  }

  /**
   * Invalida todas las entradas de caché relacionadas con múltiples inventarios
   * Útil para invalidaciones masivas después de operaciones complejas
   * @param idsInventario - IDs de los inventarios afectados
   */
  invalidateMultipleInventarios(idsInventario: number[]): void {
    idsInventario.forEach((id) => this.invalidateInventario(id));
  }

  /**
   * Limpia todas las entradas expiradas de todos los cachés
   * Se recomienda ejecutar periódicamente
   */
  cleanExpiredEntries(): void {
    const now = Date.now();

    this.cleanExpiredFromCache(this.lotesStockCache, now);
    this.cleanExpiredFromCache(this.inventarioStockCache, now);
    this.cleanExpiredFromCache(this.lotesDisponiblesCache, now);
  }

  /**
   * Limpia completamente todos los cachés
   * Útil para reiniciar el sistema de caché
   */
  clearAllCaches(): void {
    this.lotesStockCache.clear();
    this.inventarioStockCache.clear();
    this.lotesDisponiblesCache.clear();
  }

  /**
   * Obtiene estadísticas del caché
   * @returns Estadísticas de uso del caché
   */
  getCacheStats(): {
    lotesStock: { total: number; expired: number };
    inventarioStock: { total: number; expired: number };
    lotesDisponibles: { total: number; expired: number };
  } {
    const now = Date.now();

    return {
      lotesStock: this.getCacheStatsForMap(this.lotesStockCache, now),
      inventarioStock: this.getCacheStatsForMap(this.inventarioStockCache, now),
      lotesDisponibles: this.getCacheStatsForMap(
        this.lotesDisponiblesCache,
        now,
      ),
    };
  }

  // Métodos privados

  private generateLoteStockKey(idLote: number, fechaHasta?: Date): string {
    const fechaStr = fechaHasta
      ? fechaHasta.toISOString().split('T')[0]
      : 'current';
    return `lote_${idLote}_${fechaStr}`;
  }

  private generateInventarioStockKey(
    idInventario: number,
    fechaHasta?: Date,
  ): string {
    const fechaStr = fechaHasta
      ? fechaHasta.toISOString().split('T')[0]
      : 'current';
    return `inventario_${idInventario}_${fechaStr}`;
  }

  private generateLotesDisponiblesKey(
    idInventario: number,
    fechaHasta?: Date,
  ): string {
    const fechaStr = fechaHasta
      ? fechaHasta.toISOString().split('T')[0]
      : 'current';
    return `lotes_${idInventario}_${fechaStr}`;
  }

  private getFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
  ): T | null {
    const entry = cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si la entrada ha expirado
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setInCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    data: T,
    ttl: number,
  ): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanExpiredFromCache<T>(
    cache: Map<string, CacheEntry<T>>,
    now: number,
  ): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => cache.delete(key));
  }

  private getCacheStatsForMap<T>(
    cache: Map<string, CacheEntry<T>>,
    now: number,
  ): { total: number; expired: number } {
    let expired = 0;

    for (const entry of cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      }
    }

    return {
      total: cache.size,
      expired,
    };
  }
}
