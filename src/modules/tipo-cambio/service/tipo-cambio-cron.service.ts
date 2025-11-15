import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { TipoCambioService } from './tipo-cambio.service';

//Servicio para ejecutar tareas programadas relacionadas con tipos de cambio
@Injectable()
export class TipoCambioCronService implements OnModuleInit {
  private readonly logger = new Logger(TipoCambioCronService.name);

  constructor(private readonly tipoCambioService: TipoCambioService) {}

  onModuleInit() {
    this.iniciarJobDiario();
  }

  /**
   * Configura el job que se ejecuta diariamente a las 14:00
   * para obtener y guardar el tipo de cambio del día
   */
  private iniciarJobDiario(): void {
    // Ejecutar todos los días a las 14:00 (2:00 PM)
    // Formato cron: segundo minuto hora día mes día_semana
    // '0 0 14 * * *' = a las 14:00:00 todos los días
    cron.schedule(
      '0 0 14 * * *',
      async () => {
        this.logger.log(
          'Iniciando job diario de actualización de tipo de cambio',
        );

        const resultado =
          await this.tipoCambioService.actualizarTipoCambioDiario();

        if (resultado.success) {
          this.logger.log(
            'Job diario de tipo de cambio completado exitosamente',
          );
        } else {
          this.logger.error(
            'Error en job diario de tipo de cambio:',
            resultado.message,
          );
        }
      },
      {
        timezone: 'America/Lima',
      },
    );

    this.logger.log(
      'Job diario de tipo de cambio configurado para ejecutarse a las 14:00 (zona horaria: America/Lima)',
    );
  }

  // Método para ejecutar manualmente el job (útil para testing)
  async ejecutarJobManual(): Promise<void> {
    this.logger.log('Ejecutando job de tipo de cambio manualmente');

    const resultado = await this.tipoCambioService.actualizarTipoCambioDiario();

    if (resultado.success) {
      this.logger.log('Job manual de tipo de cambio completado exitosamente');
    } else {
      this.logger.error(
        'Error en job manual de tipo de cambio:',
        resultado.message,
      );
      throw new Error(resultado.message);
    }
  }
}
