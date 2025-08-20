import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Persona {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({nullable: true})
    primerNombre: string;
    @Column({nullable: true})
    segundoNombre: string;
    @Column({nullable: true})
    primerApellido: string;
    @Column({nullable: true})
    segundoApellido: string;
    @Column({nullable: true})
    fechaNacimiento: Date;
    @Column({nullable: true})
    telefono: string;
    @Column({nullable: true})
    dni: string;
    @Column({nullable: true, default: 'DNI'})
    tipoDocumento: string;
    @Column({nullable: true})
    direccion: string;
    @Column({nullable: true})
    createdAt : Date;
}