import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { RolEnum } from '../enums/RoleEnum';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RolEnum,
    unique: true,
  })
  nombre: RolEnum;
}
