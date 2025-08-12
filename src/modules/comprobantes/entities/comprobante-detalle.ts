import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Comprobante } from "./comprobante";

@Entity({ name: 'comprobante_detalle' })
export class ComprobanteDetalle {
  @PrimaryGeneratedColumn()
  idDetalle: number;

  @ManyToOne(() => Comprobante, (comprobante) => comprobante.detalles)
  @JoinColumn({ name: 'id_comprobante' })
  comprobante: Comprobante;

  @Column('decimal', { precision: 15, scale: 4 })
  cantidad: number;

  @Column({ length: 10 })
  unidadMedida: string;

  @Column('decimal', { precision: 15, scale: 4 })
  precioUnitario: number;

  @Column('decimal', { precision: 15, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  igv: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  isc: number;

  @Column('decimal', { precision: 15, scale: 2 })
  total: number;

  @Column({ length: 255 })
  descripcion: string;
}
