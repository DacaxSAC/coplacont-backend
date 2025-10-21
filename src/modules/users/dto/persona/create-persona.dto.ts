import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO para crear una nueva empresa (persona)
 */
export class CreatePersonaDto {
  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Empresa ABC S.A.C.',
  })
  @IsString()
  nombreEmpresa: string;

  @ApiProperty({
    description: 'RUC de la empresa',
    example: '20123456789',
  })
  @IsString()
  ruc: string;

  @ApiProperty({
    description: 'Razón social de la empresa',
    example: 'EMPRESA ABC SOCIEDAD ANONIMA CERRADA',
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
    example: 'Av. Principal 123, Lima, Perú',
    required: false,
  })
  @IsOptional()
  @IsString()
  direccion?: string;
}
