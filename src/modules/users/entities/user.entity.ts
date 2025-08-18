import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Persona } from "./persona.entity";
import { UserRole } from "./user-role.entity";

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

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  @OneToOne(() => Persona)
  @JoinColumn()
  persona: Persona;

  @OneToMany(() => UserRole, userRole => userRole.user)
  userRoles: UserRole[];
  
}