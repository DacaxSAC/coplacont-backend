import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Persona } from '../../users/entities/persona.entity';

/**
 * Entidad que maneja los correlativos por empresa y tipo de operación
 * Cada empresa tiene sus propios correlativos independientes
 */
@Entity({ name: 'correlativos' })
export class Correlativo {
  /**
   * Tipo de operación (COMPRA, VENTA, etc.)
   * Parte de la clave primaria compuesta
   */
  @PrimaryColumn({
    type: 'varchar',
    length: 10,
  })
  tipo: string;

  /**
   * ID de la persona/empresa propietaria del correlativo
   * Parte de la clave primaria compuesta
   */
  @PrimaryColumn()
  personaId: number;

  /**
   * Relación con la persona/empresa
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'personaId' })
  persona: Persona;

  /**
   * Último número utilizado para este tipo de operación y empresa
   */
  @Column({ default: 0 })
  ultimoNumero: number;
}
