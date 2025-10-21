import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para la solicitud del reporte de Estado de Costo de Venta
 */
export class CostoVentaRequestDto {
  /**
   * Año para el cual se generará el reporte
   */
  @ApiProperty({
    description: 'Año para el reporte de costo de venta',
    example: 2024,
    minimum: 2000,
  })
  @IsNotEmpty({ message: 'El año es requerido' })
  @IsNumber({}, { message: 'El año debe ser un número' })
  @Min(2000, { message: 'El año debe ser mayor a 2000' })
  @Type(() => Number)
  año: number;

  /**
   * ID del almacén (opcional, si no se especifica incluye todos los almacenes)
   */
  @ApiProperty({
    description: 'ID del almacén (opcional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID del almacén debe ser un número' })
  @Type(() => Number)
  idAlmacen?: number;

  /**
   * ID del producto (opcional, si no se especifica incluye todos los productos)
   */
  @ApiProperty({
    description: 'ID del producto (opcional)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID del producto debe ser un número' })
  @Type(() => Number)
  idProducto?: number;
}
