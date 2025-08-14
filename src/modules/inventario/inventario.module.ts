import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities';
import { InventarioService } from './service/inventario.service';
import { InventarioController } from './controller/inventario.controller';
import { AlmacenModule } from '../almacen/almacen.module';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario, InventarioLote]),
    AlmacenModule,
    ProductosModule
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService, TypeOrmModule],
})
export class InventarioModule {}