import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities';
import { TipoCategoria } from '../enum/tipo-categoria.enum';
import { Persona } from '../../users/entities/persona.entity';

/**
 * Entidad que representa una categoría de productos
 * Utilizada para clasificar y organizar los productos del sistema
 */
@Entity({ name: 'categoria' })
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Nombre descriptivo de la categoría
   */
  @Column({ length: 100, nullable: false })
  nombre: string;

  /**
   * Descripción detallada de la categoría
   */
  @Column({ length: 255, nullable: true })
  descripcion?: string;

  /**
   * Tipo de categoría (PRODUCTO o SERVICIO)
   */
  @Column({
    type: 'enum',
    enum: TipoCategoria,
    default: TipoCategoria.PRODUCTO,
  })
  tipo: TipoCategoria;

  /**
   * Estado de la categoría (activo/inactivo)
   */
  @Column({ default: true })
  estado: boolean;

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

  /**
   * Relación con Persona (empresa propietaria de la categoría)
   * Una categoría pertenece a una empresa específica
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  /**
   * Relación uno a muchos con productos
   */
  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}
