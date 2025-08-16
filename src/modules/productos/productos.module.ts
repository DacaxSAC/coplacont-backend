import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Producto, Categoria, Inventario, InventarioLote, Almacen } from './entities';

// Services
import { CategoriaService, ProductoService, InventarioService, InventarioLoteService } from './service';

// Controllers
import { CategoriaController, ProductoController, InventarioController, InventarioLoteController } from './controller';

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
        InventarioController,
        InventarioLoteController
    ],
    providers: [
        CategoriaService,
        ProductoService,
        InventarioService,
        InventarioLoteService
    ],
    exports: [
        CategoriaService,
        ProductoService,
        InventarioService,
        InventarioLoteService
    ]
})
export class ProductosModule {}