import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categoria } from './entities';
import { CategoriaController } from './controller';
import { CategoriaService } from './service';
import { UserModule } from '../users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria]),
    UserModule, // Importar UserModule para JwtAuthGuard, JwtService y UserService
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService],
  exports: [CategoriaService],
})
export class CategoriaModule {}
