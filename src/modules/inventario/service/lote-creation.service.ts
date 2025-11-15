import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { ComprobanteDetalle } from '../../comprobantes/entities/comprobante-detalle';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';
import { StockCalculationService } from './stock-calculation.service';
import { StockCacheService } from './stock-cache.service';

/**
 * Servicio simplificado para creación de lotes sin campos calculados
 * Utiliza el nuevo sistema de cálculo dinámico
 */
@Injectable()
export class LoteCreationService {
  constructor(
    @InjectRepository(InventarioLote)
    private readonly loteRepository: Repository<InventarioLote>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    private readonly stockCalculationService: StockCalculationService,
    private readonly stockCacheService: StockCacheService,
  ) {}

  /**
   * Procesar lotes según el tipo de operación del comprobante
   */
  async procesarLotesComprobante(
    detalles: ComprobanteDetalle[],
    tipoOperacion: string,
    metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO,
    fechaEmision?: Date,
  ): Promise<{
    costoUnitario: number[];
    lotes: { idLote: number; costoUnitarioDeLote: number; cantidad: number }[];
  }> {
    const costosUnitariosDeDetalles: number[] = [];
    const lotesUsados: {
      idLote: number;
      costoUnitarioDeLote: number;
      cantidad: number;
    }[] = [];

    try {
      for (let i = 0; i < detalles.length; i++) {
        const detalle = detalles[i];

        if (tipoOperacion === 'COMPRA') {
          const loteCreado = await this.registrarLoteCompra(
            detalle,
            fechaEmision,
          );
          // Para compras, el costo unitario es el precio de compra
          costosUnitariosDeDetalles.push(Number(detalle.precioUnitario));

          // Agregar el lote creado a la lista de lotes
          lotesUsados.push({
            idLote: loteCreado.id,
            costoUnitarioDeLote: Number(detalle.precioUnitario),
            cantidad: Number(detalle.cantidad),
          });
        } else {
          // Para ventas, calcular costo usando el nuevo sistema dinámico
          const costoUnitario =
            await this.stockCalculationService.calcularCostoUnitarioVenta(
              detalle.inventario.id,
              Number(detalle.cantidad),
              metodoValoracion,
              fechaEmision,
            );

          costosUnitariosDeDetalles.push(costoUnitario);

          // Obtener información de lotes consumidos para FIFO
          if (metodoValoracion === MetodoValoracion.FIFO) {
            const consumoFIFO =
              await this.stockCalculationService.calcularConsumoFIFO(
                detalle.inventario.id,
                Number(detalle.cantidad),
                fechaEmision,
              );

            lotesUsados.push(
              ...consumoFIFO.map((consumo) => ({
                idLote: consumo.idLote,
                costoUnitarioDeLote: consumo.costoUnitario,
                cantidad: consumo.cantidad,
              })),
            );
          } else {
            // Para PROMEDIO, usar un lote ficticio con el costo promedio
            const costoPromedio =
              await this.stockCalculationService.calcularCostoPromedio(
                detalle.inventario.id,
                fechaEmision,
              );

            lotesUsados.push({
              idLote: 0, // Lote ficticio para promedio
              costoUnitarioDeLote: costoPromedio,
              cantidad: Number(detalle.cantidad),
            });
          }

          // Invalidar caché después de la venta
          this.stockCacheService.invalidateInventario(detalle.inventario.id);
        }
      }

      return {
        costoUnitario: costosUnitariosDeDetalles,
        lotes: lotesUsados,
      };
    } catch (error) {
      console.error('❌ Error procesando lotes:', error);
      throw error;
    }
  }

  /**
   * Registrar lote para compra (sin actualizar campos calculados)
   */
  private async registrarLoteCompra(
    detalle: ComprobanteDetalle,
    fechaEmision?: Date,
  ): Promise<InventarioLote> {
    // Validar que el detalle tenga inventario
    if (!detalle.inventario || !detalle.inventario.id) {
      throw new Error('El detalle debe tener un inventario válido');
    }

    const inventario = await this.inventarioRepository.findOne({
      where: { id: detalle.inventario.id },
      relations: ['producto', 'almacen'],
    });

    if (!inventario) {
      throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
    }

    // Validar que el inventario tenga producto y almacén
    if (!inventario.producto) {
      throw new Error(
        `El inventario ${detalle.inventario.id} no tiene un producto asociado`,
      );
    }
    if (!inventario.almacen) {
      throw new Error(
        `El inventario ${detalle.inventario.id} no tiene un almacén asociado`,
      );
    }

    // Validar cantidad y precio
    const cantidad = Number(detalle.cantidad);
    const precioUnitario = Number(detalle.precioUnitario);

    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a 0');
    }
    if (precioUnitario < 0) {
      throw new Error('El precio unitario no puede ser negativo');
    }

    // Crear nuevo lote (sin campos calculados)
    const lote = this.loteRepository.create({
      inventario: inventario,
      numeroLote: `LOTE-${Date.now()}-${inventario.id}-${inventario.producto.id}`,
      cantidadInicial: cantidad,
      costoUnitario: precioUnitario,
      fechaIngreso: fechaEmision || new Date(),
      observaciones: `Lote creado automáticamente desde compra - ${detalle.descripcion || 'Sin descripción'}`,
    });

    const loteGuardado = await this.loteRepository.save(lote);

    // Invalidar caché después de la compra
    this.stockCacheService.invalidateInventario(inventario.id);

    return loteGuardado;
  }

  /**
   * Validar que los lotes se crearon correctamente para compras
   */
  async validarLotesCompra(detalles: ComprobanteDetalle[]): Promise<boolean> {
    try {
      for (const detalle of detalles) {
        // Buscar el lote más reciente creado (por ID, no por fecha de ingreso)
        // para evitar problemas con compras retroactivas
        const loteReciente = await this.loteRepository.findOne({
          where: { inventario: { id: detalle.inventario.id } },
          order: { id: 'DESC' },
          relations: ['inventario'],
        });

        if (!loteReciente) {
          return false;
        }

        // Validar que el lote tiene los datos correctos
        if (Number(loteReciente.cantidadInicial) !== Number(detalle.cantidad)) {
          return false;
        }

        if (
          Number(loteReciente.costoUnitario) !== Number(detalle.precioUnitario)
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
