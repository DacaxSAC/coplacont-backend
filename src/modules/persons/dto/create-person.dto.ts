import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsBoolean, Length, Matches } from 'class-validator';
import { PersonType } from '../enums/PersonType.enum';

/**
 * DTO para crear una nueva persona (cliente o proveedor)
 */
export class CreatePersonDto {
  @ApiProperty({
    example: false,
    description: 'Indica si la persona es un proveedor',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isProveedor debe ser un valor booleano' })
  isProveedor?: boolean = false;

  @ApiProperty({
    example: true,
    description: 'Indica si la persona es un cliente',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isCliente debe ser un valor booleano' })
  isCliente?: boolean = false;

  @ApiProperty({
    example: PersonType.NATURAL,
    description: 'Tipo de persona: NATURAL o JURIDICA',
    enum: PersonType
  })
  @IsEnum(PersonType, { message: 'El tipo debe ser NATURAL o JURIDICA' })
  type: PersonType;

  @ApiProperty({
    example: '12345678',
    description: 'Número de documento (DNI para naturales, RUC para jurídicas)'
  })
  @IsString({ message: 'El número de documento debe ser una cadena' })
  documentNumber: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre (requerido para personas naturales)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena' })
  firstName?: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido materno (requerido para personas naturales)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El apellido materno debe ser una cadena' })
  maternalSurname?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido paterno (requerido para personas naturales)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El apellido paterno debe ser una cadena' })
  paternalSurname?: string;

  @ApiProperty({
    example: 'Empresa ABC S.A.C.',
    description: 'Razón social (requerido para personas jurídicas)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La razón social debe ser una cadena' })
  businessName?: string;

  @ApiProperty({
    example: 'Av. Principal 123, Lima',
    description: 'Dirección de la persona',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena' })
  @Length(5, 255, { message: 'La dirección debe tener entre 5 y 255 caracteres' })
  address?: string;

  @ApiProperty({
    example: '+51 987654321',
    description: 'Número de teléfono',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena' })
  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'El número de teléfono no tiene un formato válido' })
  phone?: string;
}