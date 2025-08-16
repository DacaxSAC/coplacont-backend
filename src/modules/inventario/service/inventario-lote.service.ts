import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';
import { CreateInventarioLoteDto } from '../dto/inventario-lote/create-inventario-lote.dto';
import { UpdateInventarioLoteDto } from '../dto/inventario-lote/update-inventario-lote.dto';

/**
 * Servicio para la gestión de lotes de inventario
 * Maneja las operaciones CRUD y lógica de negocio relacionada con los lotes
 */
@Injectable()
export class InventarioLoteService {

    constructor(
        @InjectRepository(InventarioLote)
        private readonly inventarioLoteRepository: Repository<InventarioLote>,
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>
    ) {}

    /**
     * Crear un nuevo lote de inventario
     * @param createInventarioLoteDto - Datos para crear el lote
     * @returns Lote creado
     */
    async create(createInventarioLoteDto: CreateInventarioLoteDto): Promise<InventarioLote> {
        const { 
            idInventario, 
            fechaIngreso, 
            fechaVencimiento, 
            cantidadInicial, 
            cantidadActual, 
            costoUnitario,
            numeroLote,
            observaciones,
            estado = true
        } = createInventarioLoteDto;

        // Verificar que el inventario existe
        const inventario = await this.inventarioRepository.findOne({
            where: { id: idInventario },
            relations: ['almacen', 'producto']
        });
        if (!inventario) {
            throw new NotFoundException(`Inventario con ID ${idInventario} no encontrado`);
        }

        // Validar que la cantidad actual no sea mayor que la inicial
        if (cantidadActual > cantidadInicial) {
            throw new BadRequestException('La cantidad actual no puede ser mayor que la cantidad inicial');
        }

        // Validar fecha de vencimiento si se proporciona
        if (fechaVencimiento) {
            const fechaVenc = new Date(fechaVencimiento);
            const fechaIng = new Date(fechaIngreso);
            if (fechaVenc <= fechaIng) {
                throw new BadRequestException('La fecha de vencimiento debe ser posterior a la fecha de ingreso');
            }
        }

        // Crear el nuevo lote
        const lote = this.inventarioLoteRepository.create({
            fechaIngreso: new Date(fechaIngreso),
            fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : undefined,
            cantidadInicial,
            cantidadActual,
            costoUnitario,
            numeroLote,
            observaciones,
            estado,
            inventario
        });

        const loteGuardado = await this.inventarioLoteRepository.save(lote);

        // Actualizar el stock del inventario sumando la cantidad del nuevo lote
        await this.inventarioRepository.update(
            { id: idInventario },
            { stockActual: () => `"stockActual" + ${cantidadActual}` }
        );

        return loteGuardado;
    }

    /**
     * Obtener todos los lotes
     * @returns Lista de lotes
     */
    async findAll(): Promise<InventarioLote[]> {
        return await this.inventarioLoteRepository.find({
            relations: ['inventario', 'inventario.almacen', 'inventario.producto'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Obtener un lote por ID
     * @param id - ID del lote
     * @returns Lote encontrado
     */
    async findOne(id: number): Promise<InventarioLote> {
        const lote = await this.inventarioLoteRepository.findOne({
            where: { id },
            relations: ['inventario', 'inventario.almacen', 'inventario.producto', 'inventario.producto.categoria']
        });

        if (!lote) {
            throw new NotFoundException(`Lote con ID ${id} no encontrado`);
        }

        return lote;
    }

    /**
     * Obtener lotes por inventario
     * @param idInventario - ID del inventario
     * @returns Lista de lotes del inventario
     */
    async findByInventario(idInventario: number): Promise<InventarioLote[]> {
        const inventario = await this.inventarioRepository.findOne({
            where: { id: idInventario }
        });
        if (!inventario) {
            throw new NotFoundException(`Inventario con ID ${idInventario} no encontrado`);
        }

        return await this.inventarioLoteRepository.find({
            where: { inventario: { id: idInventario } },
            relations: ['inventario', 'inventario.almacen', 'inventario.producto'],
            order: { fechaIngreso: 'ASC' }
        });
    }

    /**
     * Obtener lotes activos (con cantidad > 0)
     * @param idInventario - ID del inventario (opcional)
     * @returns Lista de lotes activos
     */
    async findActiveLotes(idInventario?: number): Promise<InventarioLote[]> {
        const queryBuilder = this.inventarioLoteRepository
            .createQueryBuilder('lote')
            .leftJoinAndSelect('lote.inventario', 'inventario')
            .leftJoinAndSelect('inventario.almacen', 'almacen')
            .leftJoinAndSelect('inventario.producto', 'producto')
            .where('lote.cantidadActual > 0')
            .andWhere('lote.estado = :estado', { estado: true });

        if (idInventario) {
            queryBuilder.andWhere('inventario.id = :idInventario', { idInventario });
        }

        return await queryBuilder
            .orderBy('lote.fechaIngreso', 'ASC')
            .getMany();
    }

    /**
     * Obtener lotes próximos a vencer
     * @param dias - Días de anticipación (por defecto 30)
     * @param idInventario - ID del inventario (opcional)
     * @returns Lista de lotes próximos a vencer
     */
    async findLotesProximosVencer(dias: number = 30, idInventario?: number): Promise<InventarioLote[]> {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dias);

        const queryBuilder = this.inventarioLoteRepository
            .createQueryBuilder('lote')
            .leftJoinAndSelect('lote.inventario', 'inventario')
            .leftJoinAndSelect('inventario.almacen', 'almacen')
            .leftJoinAndSelect('inventario.producto', 'producto')
            .where('lote.fechaVencimiento IS NOT NULL')
            .andWhere('lote.fechaVencimiento <= :fechaLimite', { fechaLimite })
            .andWhere('lote.cantidadActual > 0')
            .andWhere('lote.estado = :estado', { estado: true });

        if (idInventario) {
            queryBuilder.andWhere('inventario.id = :idInventario', { idInventario });
        }

        return await queryBuilder
            .orderBy('lote.fechaVencimiento', 'ASC')
            .getMany();
    }

    /**
     * Obtener lotes vencidos
     * @param idInventario - ID del inventario (opcional)
     * @returns Lista de lotes vencidos
     */
    async findLotesVencidos(idInventario?: number): Promise<InventarioLote[]> {
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999); // Final del día

        const queryBuilder = this.inventarioLoteRepository
            .createQueryBuilder('lote')
            .leftJoinAndSelect('lote.inventario', 'inventario')
            .leftJoinAndSelect('inventario.almacen', 'almacen')
            .leftJoinAndSelect('inventario.producto', 'producto')
            .where('lote.fechaVencimiento IS NOT NULL')
            .andWhere('lote.fechaVencimiento < :hoy', { hoy })
            .andWhere('lote.cantidadActual > 0')
            .andWhere('lote.estado = :estado', { estado: true });

        if (idInventario) {
            queryBuilder.andWhere('inventario.id = :idInventario', { idInventario });
        }

        return await queryBuilder
            .orderBy('lote.fechaVencimiento', 'ASC')
            .getMany();
    }

    /**
     * Buscar lotes por número de lote
     * @param numeroLote - Número de lote a buscar
     * @returns Lista de lotes encontrados
     */
    async findByNumeroLote(numeroLote: string): Promise<InventarioLote[]> {
        return await this.inventarioLoteRepository.find({
            where: { numeroLote },
            relations: ['inventario', 'inventario.almacen', 'inventario.producto'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Actualizar un lote
     * @param id - ID del lote
     * @param updateInventarioLoteDto - Datos para actualizar
     * @returns Lote actualizado
     */
    async update(id: number, updateInventarioLoteDto: UpdateInventarioLoteDto): Promise<InventarioLote> {
        const lote = await this.findOne(id);
        const { 
            fechaIngreso, 
            fechaVencimiento, 
            cantidadInicial, 
            cantidadActual, 
            costoUnitario,
            numeroLote,
            observaciones,
            estado
        } = updateInventarioLoteDto;

        const cantidadAnterior = lote.cantidadActual;

        // Validaciones
        if (cantidadInicial !== undefined && cantidadActual !== undefined) {
            if (cantidadActual > cantidadInicial) {
                throw new BadRequestException('La cantidad actual no puede ser mayor que la cantidad inicial');
            }
        } else if (cantidadInicial !== undefined && cantidadInicial < lote.cantidadActual) {
            throw new BadRequestException('La cantidad inicial no puede ser menor que la cantidad actual');
        } else if (cantidadActual !== undefined && cantidadActual > (cantidadInicial || lote.cantidadInicial)) {
            throw new BadRequestException('La cantidad actual no puede ser mayor que la cantidad inicial');
        }

        if (fechaVencimiento && fechaIngreso) {
            const fechaVenc = new Date(fechaVencimiento);
            const fechaIng = new Date(fechaIngreso);
            if (fechaVenc <= fechaIng) {
                throw new BadRequestException('La fecha de vencimiento debe ser posterior a la fecha de ingreso');
            }
        } else if (fechaVencimiento && !fechaIngreso) {
            const fechaVenc = new Date(fechaVencimiento);
            if (fechaVenc <= lote.fechaIngreso) {
                throw new BadRequestException('La fecha de vencimiento debe ser posterior a la fecha de ingreso');
            }
        }

        // Actualizar campos
        if (fechaIngreso) lote.fechaIngreso = new Date(fechaIngreso);
        if (fechaVencimiento !== undefined) {
            lote.fechaVencimiento = fechaVencimiento ? new Date(fechaVencimiento) : undefined;
        }
        if (cantidadInicial !== undefined) lote.cantidadInicial = cantidadInicial;
        if (cantidadActual !== undefined) lote.cantidadActual = cantidadActual;
        if (costoUnitario !== undefined) lote.costoUnitario = costoUnitario;
        if (numeroLote !== undefined) lote.numeroLote = numeroLote;
        if (observaciones !== undefined) lote.observaciones = observaciones;
        if (estado !== undefined) lote.estado = estado;

        const loteActualizado = await this.inventarioLoteRepository.save(lote);

        // Actualizar el stock del inventario si cambió la cantidad actual
        if (cantidadActual !== undefined && cantidadActual !== cantidadAnterior) {
            const diferencia = cantidadActual - cantidadAnterior;
            await this.inventarioRepository.update(
                { id: lote.inventario.id },
                { stockActual: () => `"stockActual" + ${diferencia}` }
            );
        }

        return loteActualizado;
    }

    /**
     * Consumir cantidad de un lote (método FIFO)
     * @param idInventario - ID del inventario
     * @param cantidad - Cantidad a consumir
     * @returns Información del consumo realizado
     */
    async consumirStock(idInventario: number, cantidad: number): Promise<{ lotes: any[], cantidadConsumida: number, costoPromedio: number }> {
        if (cantidad <= 0) {
            throw new BadRequestException('La cantidad a consumir debe ser positiva');
        }

        // Obtener lotes activos ordenados por FIFO (primero en entrar, primero en salir)
        const lotes = await this.inventarioLoteRepository.find({
            where: { 
                inventario: { id: idInventario }, 
                cantidadActual: MoreThan(0),
                estado: true
            },
            order: { fechaIngreso: 'ASC' },
            relations: ['inventario']
        });

        if (lotes.length === 0) {
            throw new BadRequestException('No hay lotes disponibles para consumir');
        }

        let cantidadRestante = cantidad;
        let costoTotal = 0;
        let cantidadTotalConsumida = 0;
        const lotesAfectados: Array<{
            id: number;
            numeroLote?: string;
            cantidadConsumida: number;
            costoUnitario: number;
            costoTotal: number;
        }> = [];

        for (const lote of lotes) {
            if (cantidadRestante <= 0) break;

            const cantidadAConsumir = Math.min(cantidadRestante, lote.cantidadActual);
            const costoLote = cantidadAConsumir * lote.costoUnitario;

            // Actualizar el lote
            lote.cantidadActual -= cantidadAConsumir;
            await this.inventarioLoteRepository.save(lote);

            // Registrar información del consumo
            lotesAfectados.push({
                id: lote.id,
                numeroLote: lote.numeroLote,
                cantidadConsumida: cantidadAConsumir,
                costoUnitario: lote.costoUnitario,
                costoTotal: costoLote
            });

            cantidadRestante -= cantidadAConsumir;
            costoTotal += costoLote;
            cantidadTotalConsumida += cantidadAConsumir;
        }

        if (cantidadRestante > 0) {
            throw new BadRequestException(`No hay suficiente stock. Disponible: ${cantidadTotalConsumida}, Solicitado: ${cantidad}`);
        }

        // Actualizar el stock del inventario
        await this.inventarioRepository.update(
            { id: idInventario },
            { stockActual: () => `"stockActual" - ${cantidadTotalConsumida}` }
        );

        const costoPromedio = cantidadTotalConsumida > 0 ? costoTotal / cantidadTotalConsumida : 0;

        return {
            lotes: lotesAfectados,
            cantidadConsumida: cantidadTotalConsumida,
            costoPromedio: parseFloat(costoPromedio.toFixed(4))
        };
    }

    /**
     * Eliminar un lote (soft delete)
     * @param id - ID del lote
     * @returns Resultado de la eliminación
     */
    async remove(id: number): Promise<{ message: string }> {
        const lote = await this.findOne(id);
        
        // Actualizar el stock del inventario restando la cantidad actual del lote
        if (lote.cantidadActual > 0) {
            await this.inventarioRepository.update(
                { id: lote.inventario.id },
                { stockActual: () => `"stockActual" - ${lote.cantidadActual}` }
            );
        }

        // Soft delete: marcar como inactivo
        lote.estado = false;
        lote.cantidadActual = 0;
        await this.inventarioLoteRepository.save(lote);

        return { message: `Lote con ID ${id} eliminado correctamente` };
    }

    /**
     * Obtener costo promedio ponderado de un inventario
     * @param idInventario - ID del inventario
     * @returns Costo promedio ponderado
     */
    async getCostoPromedioPonderado(idInventario: number): Promise<number> {
        
        const lotes = await this.inventarioLoteRepository.find({
            where: { 
                inventario: { id: idInventario }, 
                cantidadActual: MoreThan(0),
                estado: true
            }
        });

        if (lotes.length === 0) {
            return 0;
        }

        let costoTotal = 0;
        let cantidadTotal = 0;

        for (const lote of lotes) {
            // Convertir strings a números para asegurar cálculos correctos
            const cantidad = parseFloat(lote.cantidadActual.toString());
            const costo = parseFloat(lote.costoUnitario.toString());
            
            costoTotal += cantidad * costo;
            cantidadTotal += cantidad;
        }
        
        return cantidadTotal > 0 ? parseFloat((costoTotal / cantidadTotal).toFixed(4)) : 0;
    }
}