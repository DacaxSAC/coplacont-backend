import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { TipoCategoria } from '../enum';

/**
 * DTO para crear una nueva categoría
 * Contiene las validaciones necesarias para los datos de entrada
 */
export class CreateCategoriaDto {
  /**
   * Nombre de la categoría
   */
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Electrónicos',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  /**
   * Descripción de la categoría (opcional)
   */
  @ApiProperty({
    description: 'Descripción de la categoría',
    example: 'Productos electrónicos y tecnológicos',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres' })
  descripcion?: string;

  /**
   * Tipo de categoría
   */
  @ApiProperty({
    description: 'Tipo de categoría',
    enum: TipoCategoria,
    example: TipoCategoria.PRODUCTO,
    required: false,
    default: TipoCategoria.PRODUCTO,
  })
  @IsOptional()
  @IsEnum(TipoCategoria, { message: 'El tipo debe ser PRODUCTO o SERVICIO' })
  tipo?: TipoCategoria;

  /**
   * Estado de la categoría (opcional, por defecto true)
   */
  @ApiProperty({
    description: 'Estado de la categoría',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
