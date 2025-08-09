import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { PersonController } from './controllers/person.controller';
import { PersonService } from './services/person.service';

/**
 * Módulo para la gestión de personas (clientes y proveedores)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Person]),
  ],
  controllers: [PersonController],
  providers: [PersonService],
  exports: [TypeOrmModule, PersonService],
})
export class PersonModule {}