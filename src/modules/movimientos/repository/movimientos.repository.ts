import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Movimiento } from '../entities/movimiento.entity';
import { MovimientoDetalle } from '../entities/movimiento-detalle.entity';
import { CreateMovimientoDto } from '../dto/create-movimiento.dto';
import { TipoMovimiento } from '../enum/tipo-movimiento.enum';
import { EstadoMovimiento } from '../enum/estado-movimiento.enum';
import { Producto } from '../../productos/entities/producto.entity';
import { Almacen } from '../../almacen/entities/almacen.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { InventarioLote } from '../../inventario/entities/inventario-lote.entity';

/**
 * Repositorio para encapsular la lógica de acceso a datos de movimientos
 */
@Injectable()
export class MovimientosRepository {

    constructor(
        @InjectRepository(Movimiento)
        private readonly movimientoRepository: Repository<Movimiento>,
        @InjectRepository(MovimientoDetalle)
        private readonly movimientoDetalleRepository: Repository<MovimientoDetalle>,
        @InjectRepository(Producto)
        private readonly productoRepository: Repository<Producto>,
        @InjectRepository(Almacen)
        private readonly almacenRepository: Repository<Almacen>,
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>,
        @InjectRepository(InventarioLote)
        private readonly inventarioLoteRepository: Repository<InventarioLote>,
        private readonly dataSource: DataSource
    ) {}

    /**
     * Crear un nuevo movimiento con sus detalles
     */
    async create(createMovimientoDto: CreateMovimientoDto): Promise<Movimiento> {
        return await this.dataSource.transaction(async manager => {
            // Crear el movimiento principal
            const movimiento = manager.create(Movimiento, {
                tipo: createMovimientoDto.tipo,
                fecha: new Date(createMovimientoDto.fecha),
                numeroDocumento: createMovimientoDto.numeroDocumento,
                observaciones: createMovimientoDto.observaciones,
                estado: createMovimientoDto.estado,
                idComprobante: createMovimientoDto.idComprobante
            });

            const savedMovimiento = await manager.save(Movimiento, movimiento);

            // Crear los detalles
            const detalles = createMovimientoDto.detalles.map(detalle => {
                const costoTotal = detalle.costoUnitario ? detalle.cantidad * detalle.costoUnitario : undefined;
                return manager.create(MovimientoDetalle, {
                    idMovimiento: savedMovimiento.id,
                    idInventario: detalle.idInventario,
                    cantidad: detalle.cantidad,
                    costoUnitario: detalle.costoUnitario,
                    costoTotal: costoTotal,
                    idLote: detalle.idLote
                });
            });

            await manager.save(MovimientoDetalle, detalles);

            // Retornar el movimiento con sus detalles
            const result = await manager.findOne(Movimiento, {
                where: { id: savedMovimiento.id },
                relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante']
            });
            
            if (!result) {
                throw new Error('Error al crear el movimiento');
            }
            
            return result;
        });
    }

    /**
     * Buscar movimiento por ID
     */
    async findById(id: number): Promise<Movimiento | null> {
        return await this.movimientoRepository.findOne({
            where: { id },
            relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante']
        });
    }

    /**
     * Buscar todos los movimientos
     */
    async findAll(): Promise<Movimiento[]> {
        return await this.movimientoRepository.find({
            relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Buscar movimientos por tipo
     */
    async findByTipo(tipo: TipoMovimiento): Promise<Movimiento[]> {
        return await this.movimientoRepository.find({
            where: { tipo },
            relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Buscar movimientos por estado
     */
    async findByEstado(estado: EstadoMovimiento): Promise<Movimiento[]> {
        return await this.movimientoRepository.find({
            where: { estado },
            relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Buscar movimientos por comprobante
     */
    async findByComprobante(idComprobante: number): Promise<Movimiento[]> {
        return await this.movimientoRepository.find({
            where: { idComprobante },
            relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen']
        });
    }

    /**
     * Actualizar estado del movimiento
     */
    async updateEstado(id: number, estado: EstadoMovimiento): Promise<Movimiento> {
        await this.movimientoRepository.update(id, { estado });
        const result = await this.findById(id);
        if (!result) {
            throw new Error('Movimiento no encontrado');
        }
        return result;
    }

    /**
     * Procesar movimiento (actualizar inventarios)
     */
    async procesarMovimiento(id: number): Promise<Movimiento> {
        return await this.dataSource.transaction(async manager => {
            const movimiento = await manager.findOne(Movimiento, {
                where: { id },
                relations: ['detalles']
            });

            if (!movimiento) {
                throw new Error('Movimiento no encontrado');
            }

            // Procesar cada detalle
            for (const detalle of movimiento.detalles) {
                await this.procesarDetalleMovimiento(manager, detalle, movimiento.tipo);
            }

            // Actualizar estado
            await manager.update(Movimiento, id, { estado: EstadoMovimiento.PROCESADO });

            const result = await manager.findOne(Movimiento, {
                where: { id },
                relations: ['detalles', 'detalles.inventario', 'detalles.inventario.producto', 'detalles.inventario.almacen', 'comprobante']
            });
            
            if (!result) {
                throw new Error('Error al procesar el movimiento');
            }
            
            return result;
        });
    }

    /**
     * Procesar detalle de movimiento
     */
    private async procesarDetalleMovimiento(
        manager: any,
        detalle: MovimientoDetalle,
        tipoMovimiento: TipoMovimiento
    ): Promise<void> {
        // Buscar inventario
        const inventario = await manager.findOne(Inventario, {
            where: { id: detalle.idInventario }
        });

        if (!inventario) {
            throw new Error(`Inventario con ID ${detalle.idInventario} no encontrado`);
        }

        // Actualizar stock según tipo de movimiento
        switch (tipoMovimiento) {
            case TipoMovimiento.ENTRADA:
                await this.procesarEntrada(manager, inventario, detalle);
                break;
            case TipoMovimiento.SALIDA:
                await this.procesarSalida(manager, inventario, detalle);
                break;
            case TipoMovimiento.AJUSTE:
                await this.procesarAjuste(manager, inventario, detalle);
                break;
        }
    }

    /**
     * Procesar entrada de inventario
     */
    private async procesarEntrada(
        manager: any,
        inventario: Inventario,
        detalle: MovimientoDetalle
    ): Promise<void> {
        // Actualizar stock
        inventario.stockActual += detalle.cantidad;
        await manager.save(Inventario, inventario);

        // Crear lote si tiene costo
        if (detalle.costoUnitario) {
            const lote = manager.create(InventarioLote, {
                inventario: inventario,
                numeroLote: `LOTE-${Date.now()}`,
                fechaVencimiento: null,
                cantidadInicial: detalle.cantidad,
                cantidadActual: detalle.cantidad,
                costoUnitario: detalle.costoUnitario,
                fechaIngreso: new Date()
            });
            await manager.save(InventarioLote, lote);
        }
    }

    /**
     * Procesar salida de inventario
     */
    private async procesarSalida(
        manager: any,
        inventario: Inventario,
        detalle: MovimientoDetalle
    ): Promise<void> {
        if (inventario.stockActual < detalle.cantidad) {
            throw new Error(`Stock insuficiente. Disponible: ${inventario.stockActual}, Requerido: ${detalle.cantidad}`);
        }

        // Actualizar stock
        inventario.stockActual -= detalle.cantidad;
        await manager.save(Inventario, inventario);

        // Si se especifica un lote, actualizar ese lote
        if (detalle.idLote) {
            const lote = await manager.findOne(InventarioLote, {
                where: { id: detalle.idLote }
            });

            if (!lote) {
                throw new Error('Lote no encontrado');
            }

            if (lote.cantidadActual < detalle.cantidad) {
                throw new Error(`Stock insuficiente en el lote. Disponible: ${lote.cantidadActual}, Requerido: ${detalle.cantidad}`);
            }

            lote.cantidadActual -= detalle.cantidad;
            await manager.save(InventarioLote, lote);
        }
    }

    /**
     * Procesar ajuste de inventario
     */
    private async procesarAjuste(
        manager: any,
        inventario: Inventario,
        detalle: MovimientoDetalle
    ): Promise<void> {
        // En ajustes, la cantidad puede ser positiva o negativa
        inventario.stockActual = detalle.cantidad;
        await manager.save(Inventario, inventario);
    }

    /**
     * Buscar producto por ID
     */
    async findProductoById(id: number): Promise<Producto | null> {
        return await this.productoRepository.findOne({ where: { id } });
    }

    /**
     * Buscar almacén por ID
     */
    async findAlmacenById(id: number): Promise<Almacen | null> {
        return await this.almacenRepository.findOne({ where: { id } });
    }

    /**
     * Buscar lote por ID
     */
    async findLoteById(id: number): Promise<InventarioLote | null> {
        return await this.inventarioLoteRepository.findOne({
            where: { id }
        });
    }

    async findInventarioById(id: number): Promise<Inventario | null> {
        return await this.inventarioRepository.findOne({
            where: { id }
        });
    }

    /**
     * Eliminar movimiento
     */
    async remove(id: number): Promise<void> {
        await this.dataSource.transaction(async manager => {
            // Eliminar detalles primero
            await manager.delete(MovimientoDetalle, { idMovimiento: id });
            // Eliminar movimiento
            await manager.delete(Movimiento, { id });
        });
    }
}