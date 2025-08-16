import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Movimiento } from './movimiento.entity';
import { Inventario } from 'src/modules/inventario/entities';

/**
 * Entidad para detalles de movimientos de inventario
 */
@Entity('movimiento_detalles')
export class MovimientoDetalle {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'id_movimiento',
        comment: 'ID del movimiento padre'
    })
    idMovimiento: number;

    @Column({
        name: 'id_inventario',
        comment: 'ID del inventario'
    })
    idInventario: number;

    @Column({
        name: 'id_lote',
        nullable: true,
        comment: 'ID del lote (opcional)'
    })
    idLote?: number;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 4,
        comment: 'Cantidad del movimiento'
    })
    cantidad: number;

    @Column({
        name: 'costo_unitario',
        type: 'decimal',
        precision: 10,
        scale: 4,
        nullable: true,
        comment: 'Costo unitario del producto'
    })
    costoUnitario: number;

    @Column({
        name: 'costo_total',
        type: 'decimal',
        precision: 10,
        scale: 4,
        nullable: true,
        comment: 'Costo total (cantidad * costo unitario)'
    })
    costoTotal: number;

    @CreateDateColumn({
        name: 'fecha_creacion',
        comment: 'Fecha de creación del registro'
    })
    fechaCreacion: Date;

    @UpdateDateColumn({
        name: 'fecha_actualizacion',
        comment: 'Fecha de última actualización'
    })
    fechaActualizacion: Date;

    // Relaciones
    @ManyToOne(() => Movimiento, movimiento => movimiento.detalles)
    @JoinColumn({ name: 'id_movimiento' })
    movimiento: Movimiento;

    @ManyToOne(() => Inventario)
    @JoinColumn({ name: 'id_inventario' })
    inventario: Inventario;
}