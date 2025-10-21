import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para detalle de salida de lote
 */
export class CreateDetalleSalidaDto {
  /**
   * ID del lote
   */
  @ApiProperty({
    description: 'ID del lote',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del lote debe ser un número' })
  @IsPositive({ message: 'El ID del lote debe ser positivo' })
  @Type(() => Number)
  idLote: number;

  /**
   * Costo unitario del lote
   */
  @ApiProperty({
    description: 'Costo unitario del lote',
    example: 25.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'El costo unitario debe ser un número con máximo 4 decimales' },
  )
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  @Type(() => Number)
  costoUnitarioDeLote: number;

  /**
   * Cantidad del lote
   */
  @ApiProperty({
    description: 'Cantidad del lote',
    example: 10.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'La cantidad debe ser un número con máximo 4 decimales' },
  )
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  @Type(() => Number)
  cantidad: number;
}

/**
 * DTO para crear detalle de movimiento
 */
export class CreateMovimientoDetalleDto {
  /**
   * ID del inventario
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
   * Cantidad del movimiento
   */
  @ApiProperty({
    description: 'Cantidad del movimiento',
    example: 10.5,
  })
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'La cantidad debe ser un número con máximo 4 decimales' },
  )
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  @Type(() => Number)
  cantidad: number;

  // costoUnitario se calcula dinámicamente basado en el método de valoración

  /**
   * ID del lote (opcional)
   */
  @ApiProperty({
    description: 'ID del lote relacionado',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID del lote debe ser un número' })
  @IsPositive({ message: 'El ID del lote debe ser positivo' })
  @Type(() => Number)
  idLote?: number;

  /**
   * Detalles de salida por lote (opcional, solo para movimientos de salida)
   */
  @ApiProperty({
    description: 'Detalles de salida por lote',
    type: [CreateDetalleSalidaDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los detalles de salida deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleSalidaDto)
  detallesSalida?: CreateDetalleSalidaDto[];
}
