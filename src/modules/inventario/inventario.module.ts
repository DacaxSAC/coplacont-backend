import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities';
import { Almacen } from '../almacen/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { InventarioService } from './service/inventario.service';
import { LoteService } from './services/lote.service';
import { InventarioRepository } from './repository';
import { InventarioController } from './controller/inventario.controller';
import { LoteController } from './controller/lote.controller';
import { AlmacenModule } from '../almacen/almacen.module';
import { ProductosModule } from '../productos/productos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario, InventarioLote, Almacen, Producto]),
    AlmacenModule,
    ProductosModule
  ],
  controllers: [InventarioController, LoteController],
  providers: [InventarioService, LoteService, InventarioRepository],
  exports: [InventarioService, LoteService, TypeOrmModule],
})
export class InventarioModule {}