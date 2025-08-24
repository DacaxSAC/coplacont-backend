import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodoContable, ConfiguracionPeriodo } from './entities';
import { PeriodoContableService } from './service';
import { PeriodoContableController } from './controller';

/**
 * Módulo de períodos contables
 * Gestiona períodos contables y sus configuraciones
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PeriodoContable,
      ConfiguracionPeriodo
    ])
  ],
  controllers: [
    PeriodoContableController
  ],
  providers: [
    PeriodoContableService
  ],
  exports: [
    PeriodoContableService,
    TypeOrmModule
  ]
})
export class PeriodosModule {}