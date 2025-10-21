import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { EntidadType } from '../enums/EntidadType.enum';
import { Persona } from '../../users/entities/persona.entity';

/**
 * Entidad que representa una persona que puede ser cliente o proveedor
 * Puede ser persona natural (individual) o jurídica (empresa)
 */
@Entity('entidades')
@Unique(['numeroDocumento', 'persona'])
export class Entidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  esProveedor: boolean;

  @Column({ default: false })
  esCliente: boolean;

  @Column({
    type: 'enum',
    enum: EntidadType,
    nullable: false,
  })
  tipo: EntidadType;

  @Column({ nullable: false })
  numeroDocumento: string;

  @Column({ nullable: true })
  nombre?: string;

  @Column({ nullable: true })
  apellidoMaterno?: string;

  @Column({ nullable: true })
  apellidoPaterno?: string;

  @Column({ nullable: true })
  razonSocial?: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true, length: 255 })
  direccion?: string;

  @Column({ nullable: true, length: 20 })
  telefono?: string;

  /**
   * Relación con Persona (empresa propietaria de la entidad)
   * Una entidad (cliente/proveedor) pertenece a una empresa específica
   */
  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Validaciones antes de registrar
  @BeforeInsert()
  validateBeforeInsert() {
    this.validateDocument();
    this.validateRequiredFields();
    this.validateAddress();
    this.validatePhone();
  }

  // Validaciones antes de actualizar
  @BeforeUpdate()
  validateBeforeUpdate() {
    this.validateDocument();
    this.validateRequiredFields();
    this.validateAddress();
    this.validatePhone();
  }

  // Valida el formato del número de documento según el tipo de persona
  private validateDocument() {
    if (!this.numeroDocumento) {
      throw new Error('El número de documento es requerido');
    }

    if (this.tipo === EntidadType.NATURAL) {
      if (!/^\d{8}$/.test(this.numeroDocumento)) {
        throw new Error('El DNI debe tener 8 dígitos');
      }
    } else if (this.tipo === EntidadType.JURIDICA) {
      if (!/^\d{11}$/.test(this.numeroDocumento)) {
        throw new Error('El RUC debe tener 11 dígitos');
      }
    }
  }

  // Valida los campos requeridos según el tipo de persona
  private validateRequiredFields() {
    if (this.tipo === EntidadType.NATURAL) {
      if (!this.nombre) {
        throw new Error('El nombre es requerido para personas naturales');
      }
      if (!this.apellidoMaterno) {
        throw new Error(
          'El apellido materno es requerido para personas naturales',
        );
      }
      if (!this.apellidoPaterno) {
        throw new Error(
          'El apellido paterno es requerido para personas naturales',
        );
      }
    } else if (this.tipo === EntidadType.JURIDICA) {
      if (!this.razonSocial) {
        throw new Error('La razón social es requerida para personas jurídicas');
      }
    }
  }

  // Valida el formato de la dirección
  private validateAddress() {
    if (
      this.direccion &&
      (this.direccion.length < 5 || this.direccion.length > 255)
    ) {
      throw new Error('La dirección debe tener entre 5 y 255 caracteres');
    }
  }

  // Valida el formato del número de teléfono
  private validatePhone() {
    if (this.telefono && !/^[0-9+\-\s()]{6,20}$/.test(this.telefono)) {
      throw new Error('El número de teléfono no tiene un formato válido');
    }
  }

  // Obtiene el nombre completo para personas naturales
  get nombreCompleto(): string {
    if (this.tipo === EntidadType.NATURAL) {
      return `${this.nombre} ${this.apellidoPaterno} ${this.apellidoMaterno}`.trim();
    }
    return this.razonSocial || '';
  }

  // Obtiene el nombre para mostrar según el tipo de persona
  get nombreCompletoMostrado(): string {
    return this.tipo === EntidadType.NATURAL
      ? this.nombreCompleto
      : this.razonSocial || '';
  }
}
