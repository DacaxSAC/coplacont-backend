import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Producto, Categoria, Almacen, Inventario, InventarioLote } from './entities';

// Services
import { CategoriaService, ProductoService, AlmacenService, InventarioService, InventarioLoteService } from './service';

// Controllers
import { CategoriaController, ProductoController, AlmacenController, InventarioController, InventarioLoteController } from './controller';

/**
 * Módulo de productos y almacenes
 * Gestiona las operaciones CRUD para productos, categorías y almacenes
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Producto,
            Categoria,
            Almacen,
            Inventario,
            InventarioLote
        ])
    ],
    controllers: [
        CategoriaController,
        ProductoController,
        AlmacenController,
        InventarioController,
        InventarioLoteController
    ],
    providers: [
        CategoriaService,
        ProductoService,
        AlmacenService,
        InventarioService,
        InventarioLoteService
    ],
    exports: [
        CategoriaService,
        ProductoService,
        AlmacenService,
        InventarioService,
        InventarioLoteService
    ]
})
export class ProductosModule {}