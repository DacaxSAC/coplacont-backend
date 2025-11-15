import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un nuevo lote de inventario
 * Contiene las validaciones necesarias para los datos de entrada
 */
export class CreateInventarioLoteDto {
  /**
   * ID del inventario al que pertenece el lote
   */
  @ApiProperty({
    description: 'ID del inventario',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del inventario debe ser un número' })
  @IsPositive({ message: 'El ID del inventario debe ser positivo' })
  @Type(() => Number)
  idInventario: number;

  /**
   * Fecha de ingreso del lote
   */
  @ApiProperty({
    description: 'Fecha de ingreso del lote',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'La fecha de ingreso debe ser una fecha válida' },
  )
  fechaIngreso: string;

  /**
   * Fecha de vencimiento del lote (opcional)
   */
  @ApiProperty({
    description: 'Fecha de vencimiento del lote',
    example: '2024-12-31',
    required: false,
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe ser una fecha válida' },
  )
  fechaVencimiento?: string;

  /**
   * Cantidad inicial del lote
   */
  @ApiProperty({
    description: 'Cantidad inicial del lote',
    example: 50.25,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    {
      message: 'La cantidad inicial debe ser un número con máximo 4 decimales',
    },
  )
  @IsPositive({ message: 'La cantidad inicial debe ser positiva' })
  @Type(() => Number)
  cantidadInicial: number;

  // cantidadActual se calcula dinámicamente basado en movimientos

  /**
   * Costo unitario del lote
   */
  @ApiProperty({
    description: 'Costo unitario del producto en este lote',
    example: 15.75,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El costo unitario debe ser un número con máximo 4 decimales' },
  )
  @IsPositive({ message: 'El costo unitario debe ser positivo' })
  @Type(() => Number)
  costoUnitario: number;

  /**
   * Número de lote (opcional)
   */
  @ApiProperty({
    description: 'Número de lote o referencia',
    example: 'LOTE-2024-001',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, {
    message: 'El número de lote no puede exceder 50 caracteres',
  })
  numeroLote?: string;

  /**
   * Observaciones del lote (opcional)
   */
  @ApiProperty({
    description: 'Observaciones adicionales del lote',
    example: 'Lote en perfectas condiciones',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  /**
   * Estado del lote (opcional, por defecto true)
   */
  @ApiProperty({
    description: 'Estado del lote',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
