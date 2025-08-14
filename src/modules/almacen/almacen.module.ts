import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Almacen } from './entities/almacen.entity';

// Services
import { AlmacenService } from './service/almacen.service';

// Controllers
import { AlmacenController } from './controller/almacen.controller';

/**
 * Módulo de almacenes
 * Gestiona las operaciones CRUD para almacenes
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Almacen
        ])
    ],
    controllers: [
        AlmacenController
    ],
    providers: [
        AlmacenService
    ],
    exports: [
        AlmacenService
    ]
})
export class AlmacenModule {}