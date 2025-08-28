import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { Persona } from "../../users/entities/persona.entity";

/**
 * Entidad para manejar correlativos por persona y tipo de operación
 * Cada persona tiene sus propios correlativos independientes
 */
@Entity({ name: 'correlativos' })
export class Correlativo {
    @PrimaryColumn()
    tipo: TipoOperacion; // 'compra', 'venta', etc.

    @PrimaryColumn({ nullable: false })
    personaId: number;

    @Column({ default: 0 })
    ultimoNumero: number;

    @ManyToOne(() => Persona, { nullable: true })
    @JoinColumn({ name: 'personaId' })
    persona: Persona;
}