import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entidad } from './entities';
import { EntidadController } from './controllers';
import { EntidadService } from './services';
import { UserModule } from '../users/user.module';

/**
 * Módulo para la gestión de personas (clientes y proveedores)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Entidad]),
    UserModule, // Importar UserModule para JwtAuthGuard, JwtService y UserService
  ],
  controllers: [EntidadController],
  providers: [EntidadService],
  exports: [TypeOrmModule, EntidadService],
})
export class EntidadModule {}
