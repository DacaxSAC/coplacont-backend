import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosController } from './controller/movimientos.controller';
import { MovimientosService } from './service/movimientos.service';
import { MovimientosRepository } from './repository/movimientos.repository';
import { MovimientoFactory } from './factory/MovimientoFactory';
import { Movimiento, MovimientoDetalle, DetalleSalida } from './entities';
// Importar entidades de otros módulos
import { Producto } from '../productos/entities/producto.entity';
import { Almacen } from '../almacen/entities/almacen.entity';
import { Inventario } from '../inventario/entities';
import { InventarioLote } from '../inventario/entities';
import { InventarioModule } from '../inventario/inventario.module';
import { UserModule } from '../users/user.module';

/**
 * Módulo para la gestión de movimientos de inventario
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movimiento,
      MovimientoDetalle,
      DetalleSalida,
      // Agregar entidades necesarias para los repositorios
      Producto,
      Almacen,
      Inventario,
      InventarioLote,
    ]),
    InventarioModule,
    UserModule,
  ],
  controllers: [MovimientosController],
  providers: [MovimientosService, MovimientosRepository, MovimientoFactory],
  exports: [MovimientosService, MovimientosRepository, MovimientoFactory],
})
export class MovimientosModule {}
