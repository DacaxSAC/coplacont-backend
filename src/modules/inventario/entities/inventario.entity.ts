import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Almacen } from '../../almacen/entities/almacen.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { InventarioLote } from './inventario-lote.entity';

/**
 * Entidad Inventario
 * Representa el stock actual de un producto en un almacén específico
 * Relación entre almacén y producto con cantidad disponible
 */
@Entity('inventario')
export class Inventario {
  /**
   * Identificador único del registro de inventario
   */
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

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

  // Relaciones

  /**
   * Relación con Almacén
   * Un inventario pertenece a un almacén específico
   */
  @ManyToOne(() => Almacen, { eager: true })
  @JoinColumn({ name: 'id_almacen' })
  almacen: Almacen;

  /**
   * Relación con Producto
   * Un inventario corresponde a un producto específico
   */
  @ManyToOne(() => Producto, { eager: true })
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  /**
   * Relación con InventarioLote
   * Un inventario puede tener múltiples lotes
   */
  @OneToMany(
    () => InventarioLote,
    (inventarioLote) => inventarioLote.inventario,
  )
  lotes: InventarioLote[];
}
