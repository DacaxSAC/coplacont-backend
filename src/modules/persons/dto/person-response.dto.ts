import { ApiProperty } from '@nestjs/swagger';
import { PersonType } from '../enums/PersonType.enum';

/**
 * DTO de respuesta para la entidad Person
 */
export class PersonResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la persona'
  })
  id: number;

  @ApiProperty({
    example: false,
    description: 'Indica si la persona es un proveedor'
  })
  isProveedor: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si la persona es un cliente'
  })
  isCliente: boolean;

  @ApiProperty({
    example: PersonType.NATURAL,
    description: 'Tipo de persona: NATURAL o JURIDICA',
    enum: PersonType
  })
  type: PersonType;

  @ApiProperty({
    example: '12345678',
    description: 'Número de documento (DNI para naturales, RUC para jurídicas)'
  })
  documentNumber: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre (para personas naturales)',
    nullable: true
  })
  firstName?: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido materno (para personas naturales)',
    nullable: true
  })
  maternalSurname?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido paterno (para personas naturales)',
    nullable: true
  })
  paternalSurname?: string;

  @ApiProperty({
    example: 'Empresa ABC S.A.C.',
    description: 'Razón social (para personas jurídicas)',
    nullable: true
  })
  businessName?: string;

  @ApiProperty({
    example: true,
    description: 'Estado activo/inactivo de la persona'
  })
  active: boolean;

  @ApiProperty({
    example: 'Av. Principal 123, Lima',
    description: 'Dirección de la persona',
    nullable: true
  })
  address?: string;

  @ApiProperty({
    example: '+51 987654321',
    description: 'Número de teléfono',
    nullable: true
  })
  phone?: string;

  @ApiProperty({
    example: 'Juan Pérez García',
    description: 'Nombre completo para mostrar'
  })
  displayName: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación'
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de última actualización'
  })
  updatedAt: Date;
}