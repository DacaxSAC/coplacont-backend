import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categoria } from './entities';
import { CategoriaController } from './controller';
import { CategoriaService } from './service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria]),
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService],
  exports: [CategoriaService],
})
export class CategoriaModule {}
