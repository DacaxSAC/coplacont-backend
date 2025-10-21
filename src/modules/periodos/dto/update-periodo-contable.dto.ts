import { IsOptional, IsBoolean, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para actualizar un período contable
 */
export class UpdatePeriodoContableDto {
  /**
   * Fecha de inicio del período
   */
  @ApiProperty({
    description: 'Fecha de inicio del período',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  fechaInicio?: string;

  /**
   * Fecha de fin del período
   */
  @ApiProperty({
    description: 'Fecha de fin del período',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  fechaFin?: string;

  /**
   * Estado activo del período
   */
  @ApiProperty({
    description: 'Indica si el período está activo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;

  /**
   * Observaciones del período
   */
  @ApiProperty({
    description: 'Observaciones del período',
    example: 'Período contable 2024 - Actualizado',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;
}
