import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO para actualizar datos de una empresa (persona)
 */
export class UpdatePersonaDto {
  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Empresa ABC S.A.C.',
    required: false,
  })
  @IsOptional()
  @IsString()
  nombreEmpresa?: string;

  @ApiProperty({
    description: 'RUC de la empresa',
    example: '20123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'EMPRESA ABC SOCIEDAD ANONIMA CERRADA',
    required: false,
  })
  @IsOptional()
  @IsString()
  razonSocial?: string;

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
    example: 'Av. Principal 123, Lima, Perú',
    required: false,
  })
  @IsOptional()
  @IsString()
  direccion?: string;
}
