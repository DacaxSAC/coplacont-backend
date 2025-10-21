import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from '../enum/tipo-producto.enum';

/**
 * DTO para crear un nuevo producto
 * Contiene las validaciones necesarias para los datos de entrada
 */
export class CreateProductoDto {
  /**
   * ID de la categoría a la que pertenece el producto
   */
  @ApiProperty({
    description: 'ID de la categoría del producto',
    example: 1,
  })
  @IsNumber({}, { message: 'El ID de categoría debe ser un número' })
  @IsPositive({ message: 'El ID de categoría debe ser positivo' })
  @Type(() => Number)
  idCategoria: number;

  /**
   * Nombre del producto
   */
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Laptop HP Pavilion',
    required: false,
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  nombre?: string;

  /**
   * Tipo del ítem (producto o servicio)
   */
  @ApiProperty({
    description: 'Tipo del ítem',
    enum: TipoProducto,
    example: TipoProducto.PRODUCTO,
  })
  @IsEnum(TipoProducto)
  tipo: TipoProducto;

  /**
   * Descripción del producto
   */
  @ApiProperty({
    description: 'Descripción del producto',
    example: 'Laptop HP Pavilion 15.6"',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @MinLength(3, { message: 'La descripción debe tener al menos 3 caracteres' })
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres' })
  descripcion: string;

  /**
   * Unidad de medida del producto
   */
  @ApiProperty({
    description: 'Unidad de medida del producto',
    example: 'unidad',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50, {
    message: 'La unidad de medida no puede exceder 50 caracteres',
  })
  unidadMedida: string;

  /**
   * Código único del producto (opcional)
   */
  @ApiProperty({
    description: 'Código único del producto',
    example: 'PROD-001',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El código no puede exceder 50 caracteres' })
  codigo?: string;

  /**
   * Precio unitario del producto (opcional)
   */
  @ApiProperty({
    description: 'Precio unitario del producto',
    example: 899.99,
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe ser un número con máximo 2 decimales' },
  )
  @IsPositive({ message: 'El precio debe ser positivo' })
  @Type(() => Number)
  precio?: number;

  /**
   * Stock mínimo requerido (opcional)
   */
  @ApiProperty({
    description: 'Stock mínimo requerido',
    example: 10,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El stock mínimo debe ser un número' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  @Type(() => Number)
  stockMinimo?: number;

  /**
   * Estado del producto (opcional, por defecto true)
   */
  @ApiProperty({
    description: 'Estado del producto',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
