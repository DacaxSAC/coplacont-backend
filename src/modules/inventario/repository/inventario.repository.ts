import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from 'src/modules/inventario/entities';
import { Almacen } from 'src/modules/almacen/entities/almacen.entity';
import { Producto } from '../../productos/entities/producto.entity';

@Injectable()
export class InventarioRepository {

    constructor(
        @InjectRepository(Inventario)
        private readonly repository: Repository<Inventario>,
        @InjectRepository(Almacen)
        private readonly almacenRepository: Repository<Almacen>,
        @InjectRepository(Producto)
        private readonly productoRepository: Repository<Producto>
    ) {}

    
    async create(inventario: Partial<Inventario>): Promise<Inventario> {
        const newInventario = this.repository.create(inventario);
        return await this.repository.save(newInventario);
    }


    async findById(id: number): Promise<Inventario | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['almacen', 'producto', 'producto.categoria', 'inventarioLotes']
        });
    }

    async findAll(): Promise<Inventario[]> {
        return await this.repository.find({
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { fechaCreacion: 'DESC' }
        });
    }

    async findByAlmacen(idAlmacen: number): Promise<Inventario[]> {
        return await this.repository.find({
            where: { almacen: { id: idAlmacen } },
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { producto: { descripcion: 'ASC' } }
        });
    }

    async findByProducto(idProducto: number): Promise<Inventario[]> {
        return await this.repository.find({
            where: { producto: { id: idProducto } },
            relations: ['almacen', 'producto', 'producto.categoria'],
            order: { almacen: { nombre: 'ASC' } }
        });
    }

    async findByAlmacenAndProducto(idAlmacen: number, idProducto: number): Promise<Inventario | null> {
        return await this.repository.findOne({
            where: { 
                almacen: { id: idAlmacen }, 
                producto: { id: idProducto } 
            },
            relations: ['almacen', 'producto', 'producto.categoria', 'inventarioLotes']
        });
    }

    async findLowStock(idAlmacen?: number): Promise<Inventario[]> {
        const queryBuilder = this.repository
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


    async update(inventario: Inventario): Promise<Inventario> {
        return await this.repository.save(inventario);
    }


    async remove(inventario: Inventario): Promise<void> {
        await this.repository.remove(inventario);
    }


    async findAlmacenById(id: number): Promise<Almacen | null> {
        return await this.almacenRepository.findOne({
            where: { id, estado: true }
        });
    }

    async findProductoById(id: number): Promise<Producto | null> {
        return await this.productoRepository.findOne({
            where: { id, estado: true }
        });
    }

    async existsByAlmacenAndProducto(idAlmacen: number, idProducto: number): Promise<boolean> {
        const count = await this.repository.count({
            where: { almacen: { id: idAlmacen }, producto: { id: idProducto } }
        });
        return count > 0;
    }


    async existsByAlmacenAndProductoExcludingId(
        idAlmacen: number, 
        idProducto: number, 
        excludeId: number
    ): Promise<boolean> {
        const queryBuilder = this.repository
            .createQueryBuilder('inventario')
            .where('inventario.almacen.id = :idAlmacen', { idAlmacen })
            .andWhere('inventario.producto.id = :idProducto', { idProducto })
            .andWhere('inventario.id != :excludeId', { excludeId });

        const count = await queryBuilder.getCount();
        return count > 0;
    }
}