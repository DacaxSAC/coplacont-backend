import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TablaDetalle } from './tabla-detalle.entity';

/**
 * Entidad que representa las tablas maestras del sistema
 * Basado en las tablas SUNAT de Perú (Tabla 1, Tabla 2, etc.)
 */
@Entity({ name: 'tabla' })
export class Tabla {
  @PrimaryGeneratedColumn()
  idTabla: number;

  @Column({ type: 'varchar', length: 10, unique: true, nullable: false })
  numeroTabla: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

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

  // Relación con los detalles de la tabla
  @OneToMany(() => TablaDetalle, (detalle) => detalle.tabla)
  detalles: TablaDetalle[];
}
