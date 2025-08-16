import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities';
import { Almacen } from 'src/modules/productos/entities';
import { Producto } from '../productos/entities/producto.entity';


import { InventarioService } from './service/inventario.service';
import { LoteService } from './services/lote.service';
import { KardexService } from './services/kardex.service';
import { InventarioRepository } from './repository';
import { KardexRepository } from './repositories/kardex.repository';
import { InventarioController } from './controller/inventario.controller';
import { LoteController } from './controller/lote.controller';
import { KardexController } from './controller/kardex.controller';
import { ProductosModule } from '../productos/productos.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario, InventarioLote, Almacen, Producto]),
    ProductosModule
  ],
  controllers: [InventarioController, LoteController, KardexController],
  providers: [InventarioService, LoteService, KardexService, InventarioRepository, KardexRepository],
  exports: [InventarioService, LoteService, KardexService, TypeOrmModule],
})
export class InventarioModule {}