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
import { CostoVentaService } from './service/costo-venta.service';
import { InventarioRepository } from './repository';
import { KardexRepository } from './repository/kardex.repository';
import { CostoVentaRepository } from './repository/costo-venta.repository';
import { InventarioController } from './controller/inventario.controller';
import { InventarioLoteController } from './controller/inventario-lote.controller';
import { LoteController } from './controller/lote.controller';
import { KardexController } from './controller/kardex.controller';
import { CostoVentaController } from './controller/costo-venta.controller';
import { ProductosModule } from '../productos/productos.module';
import { UserModule } from '../users/user.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Inventario, InventarioLote, Almacen, Producto]),
    ProductosModule,
    UserModule
  ],
  controllers: [InventarioController, InventarioLoteController, LoteController, KardexController, CostoVentaController],
  providers: [InventarioService, InventarioLoteService, LoteService, KardexService, CostoVentaService, InventarioRepository, KardexRepository, CostoVentaRepository],
  exports: [InventarioService, InventarioLoteService, LoteService, KardexService, CostoVentaService, TypeOrmModule],
})
export class InventarioModule {}