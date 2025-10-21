import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { EntidadType } from '../enums/EntidadType.enum';

/**
 * DTO para crear una nueva entidad (cliente o proveedor)
 */
export class CreateEntidadDto {
  @ApiProperty({
    example: false,
    description: 'Indica si la entidad es un proveedor',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isProveedor debe ser un valor booleano' })
  esProveedor?: boolean = false;

  @ApiProperty({
    example: true,
    description: 'Indica si la entidad es un cliente',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isCliente debe ser un valor booleano' })
  esCliente?: boolean = false;

  @ApiProperty({
    example: EntidadType.NATURAL,
    description: 'Tipo de entidad: NATURAL o JURIDICA',
    enum: EntidadType,
  })
  @IsEnum(EntidadType, { message: 'El tipo debe ser NATURAL o JURIDICA' })
  tipo: EntidadType;

  @ApiProperty({
    example: '12345678',
    description: 'Número de documento (DNI para naturales, RUC para jurídicas)',
  })
  @IsString({ message: 'El número de documento debe ser una cadena' })
  numeroDocumento: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre (requerido para entidades naturales)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena' })
  nombre?: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido materno (requerido para entidades naturales)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El apellido materno debe ser una cadena' })
  apellidoMaterno?: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido paterno (requerido para entidades naturales)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El apellido paterno debe ser una cadena' })
  apellidoPaterno?: string;

  @ApiProperty({
    example: 'Empresa ABC S.A.C.',
    description: 'Razón social (requerido para entidades jurídicas)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La razón social debe ser una cadena' })
  razonSocial?: string;

  @ApiProperty({
    example: 'Av. Principal 123, Lima',
    description: 'Dirección de la entidad',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser una cadena' })
  @Length(5, 255, {
    message: 'La dirección debe tener entre 5 y 255 caracteres',
  })
  direccion?: string;

  @ApiProperty({
    example: '+51 987654321',
    description: 'Número de teléfono',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena' })
  @Matches(/^[0-9+\-\s()]{6,20}$/, {
    message: 'El número de teléfono no tiene un formato válido',
  })
  telefono?: string;
}
