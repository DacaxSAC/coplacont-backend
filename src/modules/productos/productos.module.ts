import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Producto, Inventario, InventarioLote } from './entities';
import { Almacen } from '../almacen/entities/almacen.entity';
import { Categoria } from '../categoria/entities';
// Services
import {  ProductoService, InventarioService, InventarioLoteService } from './service';

// Controllers
import {  ProductoController, InventarioController, InventarioLoteController } from './controller';

/**
 * Módulo de productos y almacenes
 * Gestiona las operaciones CRUD para productos, categorías y almacenes
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Producto,
            Almacen,
            Categoria,
            Inventario,
            InventarioLote
        ])
    ],
    controllers: [
        ProductoController,
        InventarioController,
        InventarioLoteController
    ],
    providers: [
        ProductoService,
        InventarioService,
        InventarioLoteService
    ],
    exports: [
        ProductoService,
        InventarioService,
        InventarioLoteService
    ]
})
export class ProductosModule {}