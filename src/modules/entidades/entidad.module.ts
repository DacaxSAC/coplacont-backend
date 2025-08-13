import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entidad } from './entities';
import { EntidadController } from './controllers';
import { EntidadService } from './services';

/**
 * Módulo para la gestión de personas (clientes y proveedores)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Entidad]),
  ],
  controllers: [EntidadController],
  providers: [EntidadService],
  exports: [TypeOrmModule, EntidadService],
})
export class EntidadModule {}