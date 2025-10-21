import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { EntidadType } from '../enums';

/**
 * DTO de respuesta para la entidad Entidad
 */
export class EntidadResponseDto {
  @ApiProperty({
    example: 1,
    description: 'ID único de la entidad',
  })
  @Expose()
  id: number;

  @ApiProperty({
    example: false,
    description: 'Indica si la entidad es un proveedor',
  })
  @Expose()
  esProveedor: boolean;

  @ApiProperty({
    example: true,
    description: 'Indica si la entidad es un cliente',
  })
  @Expose()
  esCliente: boolean;

  @ApiProperty({
    example: EntidadType.NATURAL,
    description: 'Tipo de entidad: NATURAL o JURIDICA',
    enum: EntidadType,
  })
  @Expose()
  tipo: EntidadType;

  @ApiProperty({
    example: '12345678',
    description: 'Número de documento (DNI para naturales, RUC para jurídicas)',
  })
  @Expose()
  numeroDocumento: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre (para personas naturales)',
    nullable: true,
  })
  @Expose()
  nombre?: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido materno (para personas naturales)',
    nullable: true,
  })
  @Expose()
  apellidoMaterno?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido paterno (para personas naturales)',
    nullable: true,
  })
  @Expose()
  apellidoPaterno?: string;

  @ApiProperty({
    example: 'Empresa ABC S.A.C.',
    description: 'Razón social (para personas jurídicas)',
    nullable: true,
  })
  @Expose()
  razonSocial?: string;

  @ApiProperty({
    example: true,
    description: 'Estado activo/inactivo de la entidad',
  })
  @Expose()
  activo: boolean;

  @ApiProperty({
    example: 'Av. Principal 123, Lima',
    description: 'Dirección de la entidad',
    nullable: true,
  })
  @Expose()
  direccion?: string;

  @ApiProperty({
    example: '+51 987654321',
    description: 'Número de teléfono',
    nullable: true,
  })
  @Expose()
  telefono?: string;

  @ApiProperty({
    example: 'Juan Pérez García',
    description: 'Nombre completo para mostrar',
  })
  @Expose()
  nombreCompleto: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de creación',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Fecha de última actualización',
  })
  @Expose()
  updatedAt: Date;
}
