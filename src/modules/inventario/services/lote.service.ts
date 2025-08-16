import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { ComprobanteDetalle } from '../../comprobantes/entities/comprobante-detalle';
import { TipoOperacion } from '../../comprobantes/enum/tipo-operacion.enum';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

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
        tipoOperacion: TipoOperacion,
        metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO
    ): Promise<void> {
        for (const detalle of detalles) {
            if (tipoOperacion === TipoOperacion.COMPRA) {
                await this.registrarLoteCompra(detalle);
            } else {
                await this.actualizarStockVenta(detalle, metodoValoracion);
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
     * Actualizar stock para ventas (FIFO - First In, First Out o lote específico)
     */
    private async actualizarStockVenta(detalle: ComprobanteDetalle, metodoValoracion: MetodoValoracion = MetodoValoracion.FIFO): Promise<void> {
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
    
        // Si se especifica un lote específico, usar ese lote
        if (detalle.idLote) {
            await this.actualizarLoteEspecifico(detalle.idLote, cantidadNum, inventario);
        } else {
            // Usar método de valoración seleccionado
            switch (metodoValoracion) {
                case MetodoValoracion.FIFO:
                    await this.actualizarLotesFIFO(inventario.id, cantidadNum);
                    break;
                case MetodoValoracion.LIFO:
                    await this.actualizarLotesLIFO(inventario.id, cantidadNum);
                    break;
                case MetodoValoracion.PROMEDIO:
                    await this.actualizarLotesPromedio(inventario.id, cantidadNum);
                    break;
                default:
                    await this.actualizarLotesPromedio(inventario.id, cantidadNum);
            }
        }
    
        // Actualizar stock del inventario - Convertir a números
        inventario.stockActual = stockActualNum - cantidadNum;
        await this.inventarioRepository.save(inventario);
    }

    /**
     * Actualizar un lote específico
     */
    private async actualizarLoteEspecifico(loteId: number, cantidad: number, inventario: Inventario): Promise<void> {
        const lote = await this.loteRepository.findOne({
            where: { id: loteId, inventario: { id: inventario.id } }
        });

        if (!lote) {
            throw new Error(`Lote no encontrado: ${loteId}`);
        }

        const cantidadActualNum = Number(lote.cantidadActual);
        if (cantidadActualNum < cantidad) {
            throw new Error(
                `Stock insuficiente en el lote ${loteId}. Disponible: ${cantidadActualNum}, Requerido: ${cantidad}`
            );
        }

        lote.cantidadActual = cantidadActualNum - cantidad;
        await this.loteRepository.save(lote);
    }

    /**
     * Actualizar lotes usando lógica FIFO
     */
    private async actualizarLotesFIFO(inventarioId: number, cantidad: number): Promise<void> {
        // Obtener lotes ordenados por fecha de ingreso (FIFO)
        const lotes = await this.loteRepository.find({
            where: { inventario: { id: inventarioId } },
            order: { fechaIngreso: 'ASC' }
        });
    
        let cantidadPendiente = cantidad;
    
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
    }

    /**
     * Actualizar lotes usando lógica LIFO (Last In, First Out)
     */
    private async actualizarLotesLIFO(inventarioId: number, cantidad: number): Promise<void> {
        // Obtener lotes ordenados por fecha de ingreso descendente (LIFO)
        const lotes = await this.loteRepository.find({
            where: { inventario: { id: inventarioId } },
            order: { fechaIngreso: 'DESC' }
        });
    
        let cantidadPendiente = cantidad;
    
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
    }

    /**
     * Actualizar lotes usando promedio ponderado
     */
    private async actualizarLotesPromedio(inventarioId: number, cantidad: number): Promise<void> {
        // Obtener todos los lotes con stock disponible
        const lotes = await this.loteRepository.find({
            where: { inventario: { id: inventarioId } },
            order: { fechaIngreso: 'ASC' }
        });
    
        console.log(lotes)
        // Filtrar lotes con stock disponible
        const lotesDisponibles = lotes.filter(lote => Number(lote.cantidadActual) > 0);
        
        if (lotesDisponibles.length === 0) {
            throw new Error('No hay lotes disponibles para la venta');
        }
    
        // Calcular totales para el promedio ponderado
        let cantidadTotal = 0;
        let valorTotal = 0;
    
        for (const lote of lotesDisponibles) {
            const cantidadLote = Number(lote.cantidadActual);
            const costoLote = Number(lote.costoUnitario);
            cantidadTotal += cantidadLote;
            valorTotal += cantidadLote * costoLote;
        }
    
        if (cantidadTotal < cantidad) {
            throw new Error(
                `Stock insuficiente. Disponible: ${cantidadTotal}, Requerido: ${cantidad}`
            );
        }
    
        // Distribuir proporcionalmente la cantidad a descontar
        let cantidadPendiente = cantidad;
    
        for (const lote of lotesDisponibles) {
            if (cantidadPendiente <= 0) break;
            
            const cantidadLote = Number(lote.cantidadActual);
            const proporcion = cantidadLote / cantidadTotal;
            const cantidadADescontar = Math.min(
                Math.round(cantidad * proporcion), 
                cantidadLote, 
                cantidadPendiente
            );
            
            if (cantidadADescontar > 0) {
                lote.cantidadActual = cantidadLote - cantidadADescontar;
                cantidadPendiente -= cantidadADescontar;
                await this.loteRepository.save(lote);
            }
        }
    
        // Si queda cantidad pendiente, descontarla de los primeros lotes disponibles
        if (cantidadPendiente > 0) {
            for (const lote of lotesDisponibles) {
                if (cantidadPendiente <= 0) break;
                
                const cantidadDisponible = Number(lote.cantidadActual);
                if (cantidadDisponible > 0) {
                    const cantidadADescontar = Math.min(cantidadDisponible, cantidadPendiente);
                    lote.cantidadActual = cantidadDisponible - cantidadADescontar;
                    cantidadPendiente -= cantidadADescontar;
                    await this.loteRepository.save(lote);
                }
            }
        }
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