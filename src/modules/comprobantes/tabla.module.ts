import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tabla } from './entities/tabla.entity';
import { TablaDetalle } from './entities/tabla-detalle.entity';
import { TablaController } from './controller/tabla.controller';
import { TablaService } from './service/tabla.service';
import { UserModule } from '../users/user.module';

/**
 * Módulo para la gestión de tablas maestras y sus detalles
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Tabla, TablaDetalle]),
    UserModule, // Para autenticación JWT
  ],
  controllers: [TablaController],
  providers: [TablaService],
  exports: [TablaService, TypeOrmModule],
})
export class TablaModule {}
