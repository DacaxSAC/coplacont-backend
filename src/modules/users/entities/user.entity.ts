import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Persona } from "./persona.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  contrasena: string;

  @Column({ default: true })
  habilitado: boolean;

  @OneToOne(() => Persona)
  @JoinColumn()
  persona: Persona;
  
}