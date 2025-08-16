import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Producto } from './entities';
import { Almacen } from '../almacen/entities/almacen.entity';
import { Categoria } from '../categoria/entities';
// Services
import {  ProductoService } from './service';

// Controllers
import {  ProductoController } from './controller';

/**
 * Módulo de productos y almacenes
 * Gestiona las operaciones CRUD para productos, categorías y almacenes
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Producto,
            Almacen,
            Categoria
        ])
    ],
    controllers: [
        ProductoController
    ],
    providers: [
        ProductoService
    ],
    exports: [
        ProductoService
    ]
})
export class ProductosModule {}