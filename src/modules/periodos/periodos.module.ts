import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodoContable, ConfiguracionPeriodo } from './entities';
import { PeriodoContableService } from './service';
import { PeriodoContableController } from './controller';
import { UserModule } from '../users/user.module';

/**
 * Módulo de períodos contables
 * Gestiona períodos contables y sus configuraciones con soporte multi-tenant
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PeriodoContable, ConfiguracionPeriodo]),
    UserModule,
  ],
  controllers: [PeriodoContableController],
  providers: [PeriodoContableService],
  exports: [PeriodoContableService, TypeOrmModule],
})
export class PeriodosModule {}
