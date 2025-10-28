import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Persona } from '../../users/entities/persona.entity';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

/**
 * Entidad que representa la configuración de períodos contables por empresa
 * Define las reglas y parámetros para el manejo de períodos
 */
@Entity('configuracion_periodo')
@Index(['persona'], { unique: true }) // Una configuración por persona/empresa
export class ConfiguracionPeriodo {
  /**
   * Identificador único de la configuración
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Duración del período en meses (por defecto 12 para períodos anuales)
   */
  @Column({ type: 'int', default: 12 })
  duracionMeses: number;

  /**
   * Mes de inicio del período (1-12, por defecto 1 para enero)
   */
  @Column({ type: 'int', default: 1 })
  mesInicio: number;

  /**
   * Días límite para movimientos retroactivos
   * 0 = no permite retroactivos, -1 = sin límite
   */
  @Column({ type: 'int', default: 30 })
  diasLimiteRetroactivo: number;

  /**
   * Permite recálculo automático del Kardex
   */
  @Column({ default: true })
  recalculoAutomaticoKardex: boolean;

  /**
   * Método de cálculo de costo por defecto
   */
  @Column({
    type: 'enum',
    enum: MetodoValoracion,
    default: MetodoValoracion.PROMEDIO,
  })
  metodoCalculoCosto: MetodoValoracion;

  /**
   * Permite cerrar períodos automáticamente
   */
  @Column({ default: false })
  cierreAutomatico: boolean;

  /**
   * Días después del fin del período para cierre automático
   */
  @Column({ type: 'int', default: 30 })
  diasParaCierreAutomatico: number;

  /**
   * Permite movimientos en períodos cerrados (solo para administradores)
   */
  @Column({ default: false })
  permitirMovimientosPeriodoCerrado: boolean;

  /**
   * Requiere autorización para movimientos retroactivos
   */
  @Column({ default: true })
  requiereAutorizacionRetroactivo: boolean;

  /**
   * Notificar cuando se acerque el cierre del período
   */
  @Column({ default: true })
  notificarProximoCierre: boolean;

  /**
   * Días antes del cierre para enviar notificación
   */
  @Column({ type: 'int', default: 15 })
  diasNotificacionCierre: number;

  /**
   * Configuración activa
   */
  @Column({ default: true })
  activa: boolean;

  /**
   * Relación con Persona (empresa)
   * Cada empresa tiene su propia configuración de períodos
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  /**
   * Fecha de creación del registro
   */
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  /**
   * Fecha de última actualización
   */
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  /**
   * Método para verificar si permite movimientos retroactivos
   */
  permiteRetroactivo(diasAtras: number): boolean {
    if (this.diasLimiteRetroactivo === -1) return true; // Sin límite
    if (this.diasLimiteRetroactivo === 0) return false; // No permite
    return diasAtras <= this.diasLimiteRetroactivo;
  }

  /**
   * Método para calcular fecha de inicio del período para un año dado
   */
  calcularFechaInicioPeriodo(año: number): Date {
    return new Date(año, this.mesInicio - 1, 1);
  }

  /**
   * Método para calcular fecha de fin del período
   */
  calcularFechaFinPeriodo(fechaInicio: Date): Date {
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMonth(fechaFin.getMonth() + this.duracionMeses);
    fechaFin.setDate(fechaFin.getDate() - 1); // Último día del período
    return fechaFin;
  }

  /**
   * Método para verificar si debe cerrar automáticamente
   */
  debeCerrarAutomaticamente(fechaFinPeriodo: Date): boolean {
    if (!this.cierreAutomatico) return false;

    const fechaLimite = new Date(fechaFinPeriodo);
    fechaLimite.setDate(fechaLimite.getDate() + this.diasParaCierreAutomatico);

    return new Date() >= fechaLimite;
  }

  /**
   * Método para verificar si debe notificar próximo cierre
   */
  debeNotificarCierre(fechaFinPeriodo: Date): boolean {
    if (!this.notificarProximoCierre) return false;

    const fechaNotificacion = new Date(fechaFinPeriodo);
    fechaNotificacion.setDate(
      fechaNotificacion.getDate() - this.diasNotificacionCierre,
    );

    const hoy = new Date();
    return hoy >= fechaNotificacion && hoy <= fechaFinPeriodo;
  }
}
