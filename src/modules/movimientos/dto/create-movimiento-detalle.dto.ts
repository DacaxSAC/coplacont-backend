import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear detalle de movimiento
 */
export class CreateMovimientoDetalleDto {

    /**
     * ID del inventario
     */
    @ApiProperty({
        description: 'ID del inventario',
        example: 1
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
        example: 10.5
    })
    @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad debe ser un número con máximo 4 decimales' })
    @IsPositive({ message: 'La cantidad debe ser positiva' })
    @Type(() => Number)
    cantidad: number;

    /**
     * Costo unitario (opcional)
     */
    @ApiProperty({
        description: 'Costo unitario del producto',
        example: 25.50,
        required: false
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El costo debe ser un número con máximo 4 decimales' })
    @Min(0, { message: 'El costo no puede ser negativo' })
    @Type(() => Number)
    costoUnitario?: number;

    /**
     * ID del lote (opcional)
     */
    @ApiProperty({
        description: 'ID del lote relacionado',
        example: 1,
        required: false
    })
    @IsOptional()
    @IsNumber({}, { message: 'El ID del lote debe ser un número' })
    @IsPositive({ message: 'El ID del lote debe ser positivo' })
    @Type(() => Number)
    idLote?: number;
}