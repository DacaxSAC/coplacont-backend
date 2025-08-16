import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Categoria } from '../../categoria/entities';
import { TipoProducto } from '../enum/tipo-producto.enum';

/**
 * Entidad que representa un producto en el sistema
 * Contiene información básica del producto y su relación con categoría
 */
@Entity({ name: 'producto' })
export class Producto {

    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Nombre del producto
     */
    @Column({ length: 255, nullable: true })
    nombre?: string;

    /**
     * Relación muchos a uno con categoría
     */
    @ManyToOne(() => Categoria, (categoria) => categoria.productos)
    @JoinColumn({ name: 'id_categoria' })
    categoria: Categoria;

    /**
     * Tipo del registro (producto o servicio)
     */
    @Column({ type: 'enum', enum: TipoProducto, default: TipoProducto.PRODUCTO })
    tipo: TipoProducto;

    /**
     * Descripción del producto
     */
    @Column({ length: 255, nullable: false })
    descripcion: string;

    /**
     * Unidad de medida del producto (kg, unidad, litro, etc.)
     */
    @Column({ length: 50, nullable: false })
    unidadMedida: string;

    /**
     * Estado del producto (activo/inactivo)
     */
    @Column({ default: true })
    estado: boolean;

    /**
     * Código único del producto (opcional)
     */
    @Column({ length: 50, nullable: true, unique: true })
    codigo: string;

    /**
     * Precio unitario del producto
     */
    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    precio: number;

    /**
     * Stock mínimo requerido
     */
    @Column({ nullable: true, default: 0 })
    stockMinimo: number;

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
}