import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('tipo_cambio')
export class TipoCambio {
  @PrimaryColumn({ type: 'date' })
  fecha: Date;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  compra: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  venta: number;

  @Column({ type: 'varchar', length: 50, default: 'SUNAT' })
  fuente: string;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;
}
