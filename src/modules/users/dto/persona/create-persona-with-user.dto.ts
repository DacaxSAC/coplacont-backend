import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
} from 'class-validator';

/**
 * DTO para crear una nueva empresa junto con su usuario principal
 */
export class CreatePersonaWithUserDto {
  // Datos de la empresa
  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Nueva Empresa S.A.C.',
  })
  @IsString()
  nombreEmpresa: string;

  @ApiProperty({
    description: 'RUC de la empresa',
    example: '20987654321',
  })
  @IsString()
  ruc: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'NUEVA EMPRESA SOCIEDAD ANONIMA CERRADA',
  })
  @IsString()
  razonSocial: string;

  @ApiProperty({
    description: 'Teléfono de la empresa',
    example: '+51 999 888 777',
    required: false,
  })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({
    description: 'Dirección de la empresa',
    example: 'Av. Empresarial 456, Lima, Perú',
    required: false,
  })
  @IsOptional()
  @IsString()
  direccion?: string;

  // Datos del usuario principal
  @ApiProperty({
    description: 'Nombre completo del usuario principal',
    example: 'Carlos Administrador',
  })
  @IsString()
  nombreUsuario: string;

  @ApiProperty({
    description: 'Email del usuario principal',
    example: 'admin@nuevaempresa.com',
  })
  @IsEmail()
  emailUsuario: string;

  @ApiProperty({
    description: 'ID del rol para el usuario principal',
    example: 1,
  })
  @IsNumber()
  idRol: number;

  @ApiProperty({
    description: 'Indica si es el usuario principal de la empresa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean = true;
}
