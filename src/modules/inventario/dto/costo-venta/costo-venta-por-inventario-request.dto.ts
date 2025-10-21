import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO de request para el reporte de costo de venta por inventario
 */
export class CostoVentaPorInventarioRequestDto {
  @ApiProperty({
    example: 2024,
    description: 'Año para el cual generar el reporte',
    minimum: 2000,
    maximum: 2030,
  })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2000, { message: 'El año debe ser mayor o igual a 2000' })
  @Max(2030, { message: 'El año debe ser menor o igual a 2030' })
  @Type(() => Number)
  año: number;

  @ApiProperty({
    example: 1,
    description:
      'ID del almacén para filtrar (opcional, si no se especifica incluye todos los almacenes)',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El ID del almacén debe ser un número entero' })
  @Min(1, { message: 'El ID del almacén debe ser mayor a 0' })
  @Type(() => Number)
  idAlmacen?: number;

  @ApiProperty({
    example: 1,
    description:
      'ID del producto para filtrar (opcional, si no se especifica incluye todos los productos)',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El ID del producto debe ser un número entero' })
  @Min(1, { message: 'El ID del producto debe ser mayor a 0' })
  @Type(() => Number)
  idProducto?: number;
}
