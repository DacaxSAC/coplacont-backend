import { Entity, PrimaryColumn, Column } from "typeorm";
import { TipoOperacion } from "../enum/tipo-operacion.enum";

@Entity({ name: 'correlativos' })
export class Correlativo {
    @PrimaryColumn()
    tipo: TipoOperacion; // 'compra', 'venta', etc.

    @Column()
    ultimoNumero: number;
}