import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ComprobanteDetalle } from "./comprobante-detalle";
import { ComprobanteTotales } from "./comprobante-totales";
import { Entidad } from "src/modules/entidades/entities";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { Moneda } from "../enum/tipo-moneda.enum";
import { TipoComprobante } from "../enum/tipo-comprobante.enum";

@Entity({ name: 'comprobante' })
export class Comprobante {

    @PrimaryGeneratedColumn()
    idComprobante: number;

    //Manual
    @Column({unique : true , nullable : false})
    correlativo : string;

    //Manual
    @ManyToOne(() => Entidad, { nullable: true })
    @JoinColumn({ name: 'id_persona' })
    persona: Entidad;

    //Manual
    @Column({
        type: 'enum',
        enum: TipoOperacion,
        nullable: false,
    })
    tipoOperacion: TipoOperacion;

    //Manual
    @Column({
        type: 'enum',
        enum: TipoComprobante,
        nullable: false,
    })
    tipoComprobante: TipoComprobante;

    //Manual
    @Column({ type: 'date' })
    fechaEmision: Date;

    //Manual
    @Column({
        type: 'enum',
        enum: Moneda,
        nullable: false,
    })
    moneda: Moneda;

    //Manual
    @Column('decimal', { precision: 10, scale: 4, nullable: true })
    tipoCambio: number;

    //manual
    @Column({ length: 5 , nullable: false})
    serie: string;

    //manual
    @Column({ length: 20, nullable: false })
    numero: string;

    //manual
    @Column({ type: 'date', nullable: false })
    fechaVencimiento: Date;

    @Column({ length: 6 , nullable: true })
    periodo: string;

    @Column({ name: 'car_sunat', length: 50, nullable: true })
    carSunat: string;

    @Column('decimal', { precision: 15, scale: 2, nullable: true })
    valorFobEmbarcado: number;

    @Column('decimal', { precision: 15, scale: 2, nullable: true })
    valorOpGratuitas: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fechaRegistro: Date;

    //manual
    @OneToMany(() => ComprobanteDetalle, (detalle) => detalle.comprobante)
    detalles: ComprobanteDetalle[];

    //manual
    @OneToOne(() => ComprobanteTotales, (totales) => totales.comprobante)
    totales: ComprobanteTotales;
}