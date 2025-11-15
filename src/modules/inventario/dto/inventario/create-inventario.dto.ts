import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un nuevo registro de inventario
 * Contiene las validaciones necesarias para los datos de entrada
 */
export class CreateInventarioDto {
  /**
   * ID del almacén donde se encuentra el producto
   */
  @ApiProperty({
    description: 'ID del almacén',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del almacén debe ser un número' })
  @IsPositive({ message: 'El ID del almacén debe ser positivo' })
  @Type(() => Number)
  idAlmacen: number;

  /**
   * ID del producto en inventario
   */
  @ApiProperty({
    description: 'ID del producto',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID del producto debe ser un número' })
  @IsPositive({ message: 'El ID del producto debe ser positivo' })
  @Type(() => Number)
  idProducto: number;

  // stockActual eliminado - ahora se calcula dinámicamente a través de movimientos
}
