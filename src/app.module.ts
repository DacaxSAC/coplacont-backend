import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/users/user.module';
import { EntidadModule } from './modules/entidades/entidad.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ConfigModule } from '@nestjs/config';
import { ComprobanteController } from './modules/comprobantes/controller/comprobante.controller';
import { ComprobanteModule } from './modules/comprobantes/comprobante.module';
import { ProductosModule } from './modules/productos/productos.module';
import { TipoCambioModule } from './modules/tipo-cambio/tipo-cambio.module';
import { MovimientosModule } from './modules/movimientos/movimientos.module';


@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Conexión global a la base de datos
    TypeOrmModule.forRoot(databaseConfig),

    // Módulos funcionales
    UserModule,
    EntidadModule,
    ComprobanteModule,
    ProductosModule,
    TipoCambioModule,
    MovimientosModule
  ],
  controllers: [AppController, ComprobanteController],
  providers: [AppService],
})
export class AppModule {}
