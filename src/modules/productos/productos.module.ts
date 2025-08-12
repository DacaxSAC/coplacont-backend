import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Producto, Categoria, Almacen } from './entities';

// Services
import { CategoriaService, ProductoService, AlmacenService } from './service';

// Controllers
import { CategoriaController, ProductoController, AlmacenController } from './controller';

/**
 * Módulo de productos y almacenes
 * Gestiona las operaciones CRUD para productos, categorías y almacenes
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Producto,
            Categoria,
            Almacen
        ])
    ],
    controllers: [
        CategoriaController,
        ProductoController,
        AlmacenController
    ],
    providers: [
        CategoriaService,
        ProductoService,
        AlmacenService
    ],
    exports: [
        CategoriaService,
        ProductoService,
        AlmacenService
    ]
})
export class ProductosModule {}