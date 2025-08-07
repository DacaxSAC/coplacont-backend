import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Persona {
    @PrimaryGeneratedColumn()
    id: number;
    primerNombre: string;
    segundoNombre: string;
    primerApellido: string;
    segundoApellido: string;
    fechaNacimiento: Date;
    telefono: string;
    dni: string;
    createdAt : Date;
}