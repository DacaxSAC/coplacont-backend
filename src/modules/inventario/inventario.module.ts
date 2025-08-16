import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities/inventario-lote.entity';
import { Almacen } from '../almacen/entities/almacen.entity';
import { Producto } from '../productos/entities/producto.entity';


import { InventarioService } from './service/inventario.service';
import { InventarioLoteService } from './service/inventario-lote.service';
import { LoteService } from './service/lote.service';
import { KardexService } from './service/kardex.service';
import { InventarioRepository } from './repository';
import { KardexRepository } from './repository/kardex.repository';
import { InventarioController } from './controller/inventario.controller';
import { InventarioLoteController } from './controller/inventario-lote.controller';
import { LoteController } from './controller/lote.controller';
import { KardexController } from './controller/kardex.controller';
import { ProductosModule } from '../productos/productos.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario, InventarioLote, Almacen, Producto]),
    ProductosModule
  ],
  controllers: [InventarioController, InventarioLoteController, LoteController, KardexController],
  providers: [InventarioService, InventarioLoteService, LoteService, KardexService, InventarioRepository, KardexRepository],
  exports: [InventarioService, InventarioLoteService, LoteService, KardexService, TypeOrmModule],
})
export class InventarioModule {}