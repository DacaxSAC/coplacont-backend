import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Almacen } from './entities/almacen.entity';
import { AlmacenController } from './controller';
import { AlmacenService } from './service';
import { UserModule } from '../users/user.module'; // Para autenticación y multi-tenancy

@Module({
  imports: [
    TypeOrmModule.forFeature([Almacen]),
    UserModule, // Proporciona JwtAuthGuard, JwtService y UserService
  ],
  controllers: [AlmacenController],
  providers: [AlmacenService],
  exports: [AlmacenService],
})
export class AlmacenModule {}
