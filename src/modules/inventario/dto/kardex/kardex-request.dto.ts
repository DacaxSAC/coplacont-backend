import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class KardexRequestDto {
  /**
   * ID de la persona/empresa propietaria (se asigna automáticamente desde el usuario autenticado)
   */
  @ApiProperty({
    description:
      'ID de la persona/empresa propietaria (se asigna automáticamente)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID de la persona debe ser un número' })
  @IsPositive({ message: 'El ID de la persona debe ser positivo' })
  @Type(() => Number)
  personaId?: number;

  /**
   * ID del inventario (producto en almacén específico)
   */
  @ApiProperty({
    description: 'ID del inventario para generar el kardex',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del inventario debe ser un número' })
  @IsPositive({ message: 'El ID del inventario debe ser positivo' })
  @Type(() => Number)
  idInventario: number;

  /**
   * Fecha de inicio del reporte (opcional)
   */
  @ApiProperty({
    description: 'Fecha de inicio del reporte',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe tener formato válido' })
  fechaInicio?: string;

  /**
   * Fecha de fin del reporte (opcional)
   */
  @ApiProperty({
    description: 'Fecha de fin del reporte',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe tener formato válido' })
  fechaFin?: string;
}
