import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';
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
        example: 1
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
        example: 1
    })
    @IsNumber({}, { message: 'El ID del producto debe ser un número' })
    @IsPositive({ message: 'El ID del producto debe ser positivo' })
    @Type(() => Number)
    idProducto: number;

    /**
     * Stock actual del producto en el almacén
     */
    @ApiProperty({
        description: 'Stock actual del producto',
        example: 100.5,
        default: 0
    })
    @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El stock debe ser un número con máximo 4 decimales' })
    @Min(0, { message: 'El stock no puede ser negativo' })
    @Type(() => Number)
    stockActual: number;
}