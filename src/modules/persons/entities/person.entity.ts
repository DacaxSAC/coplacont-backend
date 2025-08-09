import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { PersonType } from '../enums/PersonType.enum';

/**
 * Entidad que representa una persona que puede ser cliente o proveedor
 * Puede ser persona natural (individual) o jurídica (empresa)
 */
@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isProveedor: boolean;

  @Column({ default: false })
  isCliente: boolean;

  @Column({
    type: 'enum',
    enum: PersonType,
    nullable: false
  })
  type: PersonType;

  @Column({ unique: true, nullable: false })
  documentNumber: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  maternalSurname?: string;

  @Column({ nullable: true })
  paternalSurname?: string;

  @Column({ nullable: true })
  businessName?: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

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
    if (!this.documentNumber) {
      throw new Error('El número de documento es requerido');
    }

    if (this.type === PersonType.NATURAL) {
      if (!/^\d{8}$/.test(this.documentNumber)) {
        throw new Error('El DNI debe tener 8 dígitos');
      }
    } else if (this.type === PersonType.JURIDICA) {
      if (!/^\d{11}$/.test(this.documentNumber)) {
        throw new Error('El RUC debe tener 11 dígitos');
      }
    }
  }

  // Valida los campos requeridos según el tipo de persona
  private validateRequiredFields() {
    if (this.type === PersonType.NATURAL) {
      if (!this.firstName) {
        throw new Error('El nombre es requerido para personas naturales');
      }
      if (!this.maternalSurname) {
        throw new Error('El apellido materno es requerido para personas naturales');
      }
      if (!this.paternalSurname) {
        throw new Error('El apellido paterno es requerido para personas naturales');
      }
    } else if (this.type === PersonType.JURIDICA) {
      if (!this.businessName) {
        throw new Error('La razón social es requerida para personas jurídicas');
      }
    }
  }

  // Valida el formato de la dirección
  private validateAddress() {
    if (this.address && (this.address.length < 5 || this.address.length > 255)) {
      throw new Error('La dirección debe tener entre 5 y 255 caracteres');
    }
  }

  // Valida el formato del número de teléfono
  private validatePhone() {
    if (this.phone && !/^[0-9+\-\s()]{6,20}$/.test(this.phone)) {
      throw new Error('El número de teléfono no tiene un formato válido');
    }
  }

  // Obtiene el nombre completo para personas naturales
  get fullName(): string {
    if (this.type === PersonType.NATURAL) {
      return `${this.firstName} ${this.paternalSurname} ${this.maternalSurname}`.trim();
    }
    return this.businessName || '';
  }

  // Obtiene el nombre para mostrar según el tipo de persona
  get displayName(): string {
    return this.type === PersonType.NATURAL ? this.fullName : this.businessName || '';
  }
}