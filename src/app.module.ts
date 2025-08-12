import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/users/user.module';
import { PersonModule } from './modules/persons/person.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ConfigModule } from '@nestjs/config';
import { ComprobanteController } from './modules/comprobantes/controller/comprobante.controller';
import { ComprobanteModule } from './modules/comprobantes/comprobante.module';
import { ProductosModule } from './modules/productos/productos.module';


@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Conexión global a la base de datos
    TypeOrmModule.forRoot(databaseConfig),

    // Módulos funcionales
    UserModule,
    PersonModule,
    ComprobanteModule,
    ProductosModule
  ],
  controllers: [AppController, ComprobanteController],
  providers: [AppService],
})
export class AppModule {}
