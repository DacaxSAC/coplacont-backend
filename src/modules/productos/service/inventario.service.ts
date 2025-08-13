import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from '../entities/inventario.entity';
import { Almacen } from '../entities/almacen.entity';
import { Producto } from '../entities/producto.entity';
import { CreateInventarioDto } from '../dto/inventario/create-inventario.dto';
import { UpdateInventarioDto } from '../dto/inventario/update-inventario.dto';

/**
 * Servicio para la gestión de inventario
 * Maneja las operaciones CRUD y lógica de negocio relacionada con el inventario
 */
@Injectable()
export class InventarioService {

    constructor(
        @InjectRepository(Inventario)
        private readonly inventarioRepository: Repository<Inventario>,
        @InjectRepository(Almacen)
        private readonly almacenRepository: Repository<Almacen>,
        @InjectRepository(Producto)
        private readonly productoRepository: Repository<Producto>
    ) {}

    /**
     * Crear un nuevo registro de inventario
     * @param createInventarioDto - Datos para crear el inventario
     * @returns Inventario creado
     */
    async create(createInventarioDto: CreateInventarioDto): Promise<Inventario> {
        const { idAlmacen, idProducto, stockActual } = createInventarioDto;

        // Verificar que el almacén existe y está activo
        const almacen = await this.almacenRepository.findOne({
            where: { id: idAlmacen, estado: true }
        });
        if (!almacen) {
            throw new NotFoundException(`Almacén con ID ${idAlmacen} no encontrado o inactivo`);
        }

        // Verificar que el producto existe y está activo
        const producto = await this.productoRepository.findOne({
            where: { id: idProducto, estado: true }
        });
        if (!producto) {
            throw new NotFoundException(`Producto con ID ${idProducto} no encontrado o inactivo`);
        }

        // Verificar que no existe ya un registro de inventario para este almacén y producto
        const existingInventario = await this.inventarioRepository.findOne({
            where: { almacen: { id: idAlmacen }, producto: { id: idProducto } }
        });
        if (existingInventario) {
            throw new ConflictException(`Ya existe un registro de inventario para el producto ${idProducto} en el almacén ${idAlmacen}`);
        }

        // Crear el nuevo inventario
        const inventario = this.inventarioRepository.create({
            stockActual,
            almacen,
            producto
        });

        return await this.inventarioRepository.save(inventario);
    }

    /**
     * Obtener todos los registros de inventario
     * @returns Lista de inventarios
     */
    async findAll(): Promise<Inventario[]> {
        return await this.inventarioRepository.find({
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    /**
     * Obtener un inventario por ID
     * @param id - ID del inventario
     * @returns Inventario encontrado
     */
    async findOne(id: number): Promise<Inventario> {
        const inventario = await this.inventarioRepository.findOne({
            where: { id },
            relations: ['almacen', 'producto', 'producto.categoria', 'lotes']
        });

        if (!inventario) {
            throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
        }

        return inventario;
    }

    /**
     * Obtener inventario por almacén
     * @param idAlmacen - ID del almacén
     * @returns Lista de inventarios del almacén
     */
    async findByAlmacen(idAlmacen: number): Promise<Inventario[]> {
        const almacen = await this.almacenRepository.findOne({
            where: { id: idAlmacen, estado: true }
        });
        if (!almacen) {
            throw new NotFoundException(`Almacén con ID ${idAlmacen} no encontrado o inactivo`);
        }

        return await this.inventarioRepository.find({
            where: { almacen: { id: idAlmacen } },
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { producto: { descripcion: 'ASC' } }
        });
    }

    /**
     * Obtener inventario por producto
     * @param idProducto - ID del producto
     * @returns Lista de inventarios del producto
     */
    async findByProducto(idProducto: number): Promise<Inventario[]> {
        const producto = await this.productoRepository.findOne({
            where: { id: idProducto, estado: true }
        });
        if (!producto) {
            throw new NotFoundException(`Producto con ID ${idProducto} no encontrado o inactivo`);
        }

        return await this.inventarioRepository.find({
            where: { producto: { id: idProducto } },
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { almacen: { nombre: 'ASC' } }
        });
    }

    /**
     * Obtener inventario específico por almacén y producto
     * @param idAlmacen - ID del almacén
     * @param idProducto - ID del producto
     * @returns Inventario encontrado
     */
    async findByAlmacenAndProducto(idAlmacen: number, idProducto: number): Promise<Inventario> {
        const inventario = await this.inventarioRepository.findOne({
            where: { 
                almacen: { id: idAlmacen }, 
                producto: { id: idProducto } 
            },
            relations: ['almacen', 'producto', 'producto.categoria', 'lotes']
        });

        if (!inventario) {
            throw new NotFoundException(`No se encontró inventario para el producto ${idProducto} en el almacén ${idAlmacen}`);
        }

        return inventario;
    }

    /**
     * Obtener productos con stock bajo
     * @param idAlmacen - ID del almacén (opcional)
     * @returns Lista de inventarios con stock bajo
     */
    async findLowStock(idAlmacen?: number): Promise<Inventario[]> {
        const queryBuilder = this.inventarioRepository
            .createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.almacen', 'almacen')
            .leftJoinAndSelect('inventario.producto', 'producto')
            .leftJoinAndSelect('producto.categoria', 'categoria')
            .where('inventario.stockActual <= producto.stockMinimo')
            .andWhere('producto.estado = :estado', { estado: true })
            .andWhere('almacen.estado = :estado', { estado: true });

        if (idAlmacen) {
            queryBuilder.andWhere('almacen.id = :idAlmacen', { idAlmacen });
        }

        return await queryBuilder
            .orderBy('inventario.stockActual', 'ASC')
            .getMany();
    }

    /**
     * Actualizar un inventario
     * @param id - ID del inventario
     * @param updateInventarioDto - Datos para actualizar
     * @returns Inventario actualizado
     */
    async update(id: number, updateInventarioDto: UpdateInventarioDto): Promise<Inventario> {
        const inventario = await this.findOne(id);
        const { idAlmacen, idProducto, stockActual } = updateInventarioDto;

        // Si se cambia el almacén, verificar que existe y está activo
        if (idAlmacen && idAlmacen !== inventario.almacen.id) {
            const almacen = await this.almacenRepository.findOne({
                where: { id: idAlmacen, estado: true }
            });
            if (!almacen) {
                throw new NotFoundException(`Almacén con ID ${idAlmacen} no encontrado o inactivo`);
            }
            inventario.almacen = almacen;
        }

        // Si se cambia el producto, verificar que existe y está activo
        if (idProducto && idProducto !== inventario.producto.id) {
            const producto = await this.productoRepository.findOne({
                where: { id: idProducto, estado: true }
            });
            if (!producto) {
                throw new NotFoundException(`Producto con ID ${idProducto} no encontrado o inactivo`);
            }
            inventario.producto = producto;
        }

        // Verificar que no existe otro registro con la nueva combinación almacén-producto
        if ((idAlmacen && idAlmacen !== inventario.almacen.id) || 
            (idProducto && idProducto !== inventario.producto.id)) {
            const existingInventario = await this.inventarioRepository.findOne({
                where: { 
                    almacen: { id: idAlmacen || inventario.almacen.id }, 
                    producto: { id: idProducto || inventario.producto.id } 
                }
            });
            if (existingInventario && existingInventario.id !== id) {
                throw new ConflictException(`Ya existe un registro de inventario para esta combinación de almacén y producto`);
            }
        }

        // Actualizar stock si se proporciona
        if (stockActual !== undefined) {
            if (stockActual < 0) {
                throw new BadRequestException('El stock no puede ser negativo');
            }
            inventario.stockActual = stockActual;
        }

        return await this.inventarioRepository.save(inventario);
    }

    /**
     * Actualizar stock de un inventario
     * @param id - ID del inventario
     * @param cantidad - Cantidad a sumar o restar (puede ser negativa)
     * @returns Inventario actualizado
     */
    async updateStock(id: number, cantidad: number): Promise<Inventario> {
        const inventario = await this.findOne(id);
        const nuevoStock = inventario.stockActual + cantidad;

        if (nuevoStock < 0) {
            throw new BadRequestException(`No hay suficiente stock. Stock actual: ${inventario.stockActual}, cantidad solicitada: ${Math.abs(cantidad)}`);
        }

        inventario.stockActual = nuevoStock;
        return await this.inventarioRepository.save(inventario);
    }

    /**
     * Eliminar un inventario
     * @param id - ID del inventario
     * @returns Resultado de la eliminación
     */
    async remove(id: number): Promise<{ message: string }> {
        const inventario = await this.findOne(id);
        
        // Verificar que no tenga lotes asociados
        if (inventario.lotes && inventario.lotes.length > 0) {
            throw new BadRequestException('No se puede eliminar el inventario porque tiene lotes asociados');
        }

        await this.inventarioRepository.remove(inventario);
        return { message: `Inventario con ID ${id} eliminado correctamente` };
    }

    /**
     * Obtener resumen de inventario por almacén
     * @param idAlmacen - ID del almacén
     * @returns Resumen del inventario
     */
    async getResumenByAlmacen(idAlmacen: number): Promise<any> {
        const inventarios = await this.findByAlmacen(idAlmacen);
        
        const totalProductos = inventarios.length;
        const stockBajo = inventarios.filter(inv => inv.stockActual <= inv.producto.stockMinimo).length;
        const sinStock = inventarios.filter(inv => inv.stockActual === 0).length;
        const valorTotal = inventarios.reduce((total, inv) => {
            // Aquí se podría calcular con el costo promedio de los lotes
            return total + (inv.stockActual * (inv.producto.precio || 0));
        }, 0);

        return {
            almacen: inventarios[0]?.almacen || null,
            totalProductos,
            stockBajo,
            sinStock,
            valorTotal: parseFloat(valorTotal.toFixed(2))
        };
    }
}