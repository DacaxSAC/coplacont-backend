import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Persona } from '../../users/entities/persona.entity';
import { Comprobante } from '../../comprobantes/entities/comprobante';

/**
 * Entidad que representa un período contable
 * Permite gestionar períodos anuales configurables por persona/empresa
 */
@Entity('periodo_contable')
@Index(['persona', 'año'], { unique: true }) // Un período por año por persona
export class PeriodoContable {
  /**
   * Identificador único del período contable
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Año del período contable
   */
  @Column({ type: 'int', nullable: false })
  año: number;

  /**
   * Fecha de inicio del período
   */
  @Column({ type: 'date', nullable: false })
  fechaInicio: Date;

  /**
   * Fecha de fin del período
   */
  @Column({ type: 'date', nullable: false })
  fechaFin: Date;

  /**
   * Indica si el período está activo
   * Solo puede haber un período activo por persona
   */
  @Column({ default: true })
  activo: boolean;

  /**
   * Indica si el período está cerrado
   * Un período cerrado no permite modificaciones
   */
  @Column({ default: false })
  cerrado: boolean;

  /**
   * Fecha en que se cerró el período
   */
  @Column({ type: 'timestamp', nullable: true })
  fechaCierre?: Date;

  /**
   * Usuario que cerró el período
   */
  @Column({ length: 100, nullable: true })
  usuarioCierre?: string;

  /**
   * Observaciones del período
   */
  @Column({ length: 500, nullable: true })
  observaciones?: string;

  /**
   * Relación con Persona (empresa)
   * Cada empresa maneja sus propios períodos contables
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  /**
   * Relación con comprobantes del período
   */
  @OneToMany(() => Comprobante, comprobante => comprobante.periodoContable)
  comprobantes: Comprobante[];

  /**
   * Fecha de creación del registro
   */
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  fechaCreacion: Date;

  /**
   * Fecha de última actualización
   */
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  fechaActualizacion: Date;

  /**
   * Método para verificar si una fecha está dentro del período
   */
  estaEnPeriodo(fecha: Date): boolean {
    // Convertir fechas del período a Date si son strings
    const fechaInicio = this.fechaInicio instanceof Date ? this.fechaInicio : new Date(this.fechaInicio);
    const fechaFin = this.fechaFin instanceof Date ? this.fechaFin : new Date(this.fechaFin);
    
    return fecha >= fechaInicio && fecha <= fechaFin;
  }

  /**
   * Método para verificar si el período puede ser modificado
   */
  puedeSerModificado(): boolean {
    return !this.cerrado;
  }

  /**
   * Método para obtener la descripción del período
   */
  getDescripcion(): string {
    // Función auxiliar para formatear fechas que pueden ser Date o string
    const formatearFecha = (fecha: Date | string): string => {
      if (fecha instanceof Date) {
        return fecha.toISOString().split('T')[0];
      }
      // Si es string, asumimos que ya está en formato YYYY-MM-DD
      return String(fecha).split('T')[0];
    };

    return `Período ${this.año} (${formatearFecha(this.fechaInicio)} - ${formatearFecha(this.fechaFin)})`;
  }
}