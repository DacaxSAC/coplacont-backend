import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { ComprobanteDetalle } from '../../comprobantes/entities/comprobante-detalle';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';

@Injectable()
export class LoteService {
    constructor(
        @InjectRepository(InventarioLote)
        private readonly loteRepository: Repository<InventarioLote>,
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>
    ) {}

    /**
     * Procesar lotes según el tipo de operación del comprobante
     */
    async procesarLotesComprobante(
        detalles: ComprobanteDetalle[],
        tipoOperacion: TipoOperacion
    ): Promise<void> {
        for (const detalle of detalles) {
            if (tipoOperacion === TipoOperacion.COMPRA) {
                await this.registrarLoteCompra(detalle);
            } else {
                await this.actualizarStockVenta(detalle);
            }
        }
    }

    /**
     * Registrar nuevo lote para compras
     */
    private async registrarLoteCompra(detalle: ComprobanteDetalle): Promise<void> {
        const inventario = await this.inventarioRepository.findOne({
            where: { id: detalle.inventario.id }
        });
    
        if (!inventario) {
            throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
        }
    
        // Crear nuevo lote
        const lote = this.loteRepository.create({
            inventario: inventario,
            numeroLote: `LOTE-${Date.now()}-${inventario.id}`,
            cantidadInicial: Number(detalle.cantidad),
            cantidadActual: Number(detalle.cantidad),
            costoUnitario: Number(detalle.precioUnitario),
            fechaIngreso: new Date()
        });
    
        await this.loteRepository.save(lote);
    
        // Actualizar stock del inventario - Convertir a números
        inventario.stockActual = Number(inventario.stockActual) + Number(detalle.cantidad);
        await this.inventarioRepository.save(inventario);
    }

    /**
     * Actualizar stock para ventas (FIFO - First In, First Out)
     */
    private async actualizarStockVenta(detalle: ComprobanteDetalle): Promise<void> {
        const inventario = await this.inventarioRepository.findOne({
            where: { id: detalle.inventario.id }
        });
    
        if (!inventario) {
            throw new Error(`Inventario no encontrado: ${detalle.inventario.id}`);
        }
    
        const stockActualNum = Number(inventario.stockActual);
        const cantidadNum = Number(detalle.cantidad);
    
        if (stockActualNum < cantidadNum) {
            throw new Error(
                `Stock insuficiente. Disponible: ${stockActualNum}, Requerido: ${cantidadNum}`
            );
        }
    
        // Obtener lotes ordenados por fecha de ingreso (FIFO)
        const lotes = await this.loteRepository.find({
            where: { inventario: { id: inventario.id } },
            order: { fechaIngreso: 'ASC' }
        });
    
        let cantidadPendiente = cantidadNum;
    
        for (const lote of lotes) {
            if (cantidadPendiente <= 0) break;
            if (Number(lote.cantidadActual) <= 0) continue;
    
            const cantidadADescontar = Math.min(Number(lote.cantidadActual), cantidadPendiente);
            
            lote.cantidadActual = Number(lote.cantidadActual) - cantidadADescontar;
            cantidadPendiente -= cantidadADescontar;
    
            await this.loteRepository.save(lote);
        }
    
        if (cantidadPendiente > 0) {
            throw new Error(
                `No hay suficientes lotes para cubrir la cantidad requerida. Faltante: ${cantidadPendiente}`
            );
        }
    
        // Actualizar stock del inventario - Convertir a números
        inventario.stockActual = stockActualNum - cantidadNum;
        await this.inventarioRepository.save(inventario);
    }

    /**
     * Obtener lotes por inventario
     */
    async findLotesByInventario(idInventario: number): Promise<InventarioLote[]> {
        return this.loteRepository.find({
            where: { inventario: { id: idInventario } },
            relations: ['inventario', 'inventario.producto', 'inventario.almacen'],
            order: { fechaIngreso: 'ASC' }
        });
    }

    /**
     * Obtener lote por ID
     */
    async findLoteById(id: number): Promise<InventarioLote | null> {
        return this.loteRepository.findOne({
            where: { id },
            relations: ['inventario', 'inventario.producto', 'inventario.almacen']
        });
    }

    /**
     * Obtener lotes con stock disponible
     */
    async findLotesDisponibles(idInventario: number): Promise<InventarioLote[]> {
        return this.loteRepository
            .createQueryBuilder('lote')
            .leftJoinAndSelect('lote.inventario', 'inventario')
            .leftJoinAndSelect('inventario.producto', 'producto')
            .leftJoinAndSelect('inventario.almacen', 'almacen')
            .where('lote.inventario.id = :idInventario', { idInventario })
            .andWhere('lote.cantidadActual > 0')
            .orderBy('lote.fechaIngreso', 'ASC')
            .getMany();
    }
}