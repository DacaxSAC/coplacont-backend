import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Almacen } from '../../almacen/entities/almacen.entity';
import { Producto } from '../../productos/entities/producto.entity';
import { InventarioLote } from './inventario-lote.entity';

/**
 * Entidad que representa el inventario de productos en almacenes
 * Controla el stock actual de cada producto en cada almacén
 */
@Entity({ name: 'inventario' })
export class Inventario {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Stock actual del producto en el almacén
     */
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    stockActual: number;

    /**
     * Fecha de creación del registro
     */
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaCreacion: Date;

    /**
     * Fecha de última actualización
     */
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    fechaActualizacion: Date;

    /**
     * Relación muchos a uno con almacén
     */
    @ManyToOne(() => Almacen, { nullable: false })
    @JoinColumn({ name: 'id_almacen' })
    almacen: Almacen;

    /**
     * Relación muchos a uno con producto
     */
    @ManyToOne(() => Producto, { nullable: false })
    @JoinColumn({ name: 'id_producto' })
    producto: Producto;

    /**
     * Relación uno a muchos con lotes de inventario
     */
    @OneToMany(() => InventarioLote, (inventarioLote: InventarioLote) => inventarioLote.inventario)
    inventarioLotes: InventarioLote[];
}