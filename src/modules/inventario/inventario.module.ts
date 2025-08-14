import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities';
import { InventarioService } from './service/inventario.service';
import { InventarioRepository } from './repository';
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
  providers: [InventarioService, InventarioRepository],
  exports: [InventarioService, TypeOrmModule],
})
export class InventarioModule {}