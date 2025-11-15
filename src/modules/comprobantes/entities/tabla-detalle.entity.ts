import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tabla } from './tabla.entity';

/**
 * Entidad que representa los detalles/registros específicos de cada tabla maestra
 * Por ejemplo: en Tabla 12 (Tipo de Operación) tendríamos:
 * - código: '01', descripcion: 'Venta'
 * - código: '02', descripcion: 'Compra'
 */
@Entity({ name: 'tabla_detalle' })
export class TablaDetalle {
  @PrimaryGeneratedColumn()
  idTablaDetalle: number;

  // Relación con la tabla padre
  @ManyToOne(() => Tabla, (tabla) => tabla.detalles, { nullable: false })
  @JoinColumn({ name: 'id_tabla' })
  tabla: Tabla;

  @Column({ type: 'varchar', length: 10, nullable: false })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;
}
