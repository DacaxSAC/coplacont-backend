import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Comprobante } from './comprobante';

@Entity({ name: 'comprobante_totales' })
export class ComprobanteTotales {
  @PrimaryGeneratedColumn()
  idTotal: string;

  @OneToOne(() => Comprobante, (comprobante) => comprobante.totales)
  @JoinColumn({ name: 'id_comprobante' })
  comprobante: Comprobante;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalGravada: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalExonerada: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalInafecta: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalIgv: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  totalIsc: number;

  @Column('decimal', { precision: 15, scale: 2 })
  totalGeneral: number;
}
