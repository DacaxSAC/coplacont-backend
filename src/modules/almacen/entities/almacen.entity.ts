import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Persona } from '../../users/entities/persona.entity';

/**
 * Entidad que representa un almacén en el sistema
 * Contiene información sobre ubicaciones de almacenamiento
 */
@Entity({ name: 'almacen' })
export class Almacen {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Relación con Persona (empresa propietaria del almacén)
   * Un almacén pertenece a una empresa específica
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  /**
   * Nombre del almacén
   */
  @Column({ length: 100, nullable: false })
  nombre: string;

  /**
   * Ubicación física del almacén
   */
  @Column({ length: 255, nullable: false })
  ubicacion: string;

  /**
   * Estado del almacén (activo/inactivo)
   */
  @Column({ default: true })
  estado: boolean;

  /**
   * Descripción adicional del almacén
   */
  @Column({ length: 500, nullable: true })
  descripcion: string;

  /**
   * Capacidad máxima del almacén
   */
  @Column({ nullable: true })
  capacidadMaxima: number;

  /**
   * Responsable del almacén
   */
  @Column({ length: 100, nullable: true })
  responsable: string;

  /**
   * Teléfono de contacto del almacén
   */
  @Column({ length: 20, nullable: true })
  telefono: string;

  /**
   * Fecha de creación del registro
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  /**
   * Fecha de última actualización
   */
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;
}
