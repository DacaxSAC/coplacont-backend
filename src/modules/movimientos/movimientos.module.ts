import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosController } from './controller/movimientos.controller';
import { MovimientosService } from './service/movimientos.service';
import { MovimientosRepository } from './repository/movimientos.repository';
import { MovimientoFactory } from './factory/MovimientoFactory';
import { Movimiento } from './entities/movimiento.entity';
import { MovimientoDetalle } from './entities/movimiento-detalle.entity';
// Importar entidades de otros módulos
import { Producto } from '../productos/entities/producto.entity';
import { Almacen } from '../productos/entities';
import { Inventario } from '../inventario/entities/inventario.entity';
import { InventarioLote } from '../inventario/entities/inventario-lote.entity';

/**
 * Módulo para la gestión de movimientos de inventario
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Movimiento,
            MovimientoDetalle,
            // Agregar entidades necesarias para los repositorios
            Producto,
            Almacen,
            Inventario,
            InventarioLote
        ])
    ],
    controllers: [MovimientosController],
    providers: [
        MovimientosService,
        MovimientosRepository,
        MovimientoFactory
    ],
    exports: [
        MovimientosService,
        MovimientosRepository,
        MovimientoFactory
    ]
})
export class MovimientosModule {}