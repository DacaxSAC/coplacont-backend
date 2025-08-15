import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Inventario } from './inventario.entity';

/**
 * Entidad que representa los lotes de inventario
 * Controla los lotes específicos de productos con fechas y costos
 */
@Entity({ name: 'inventario_lote' })
export class InventarioLote {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Fecha de ingreso del lote
     */
    @Column({ type: 'date', nullable: false })
    fechaIngreso: Date;

    /**
     * Cantidad inicial del lote
     */
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    cantidadInicial: number;

    /**
     * Cantidad actual disponible del lote
     */
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    cantidadActual: number;

    /**
     * Costo unitario del producto en este lote
     */
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    costoUnitario: number;

    /**
     * Fecha de vencimiento del lote (opcional)
     */
    @Column({ type: 'date', nullable: true })
    fechaVencimiento?: Date;

    /**
     * Número de lote (opcional)
     */
    @Column({ length: 50, nullable: true })
    numeroLote?: string;

    /**
     * Observaciones del lote (opcional)
     */
    @Column({ length: 255, nullable: true })
    observaciones?: string;

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
     * Relación muchos a uno con inventario
     */
    @ManyToOne(() => Inventario, (inventario) => inventario.inventarioLotes, { nullable: true })
    @JoinColumn({ name: 'id_inventario' })
    inventario: Inventario;
}