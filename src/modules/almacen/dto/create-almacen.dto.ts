import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un nuevo almacén
 * Contiene las validaciones necesarias para los datos de entrada
 */
export class CreateAlmacenDto {
  /**
   * Nombre del almacén
   */
  @ApiProperty({
    description: 'Nombre del almacén',
    example: 'Almacén Central',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  nombre: string;

  /**
   * Ubicación del almacén
   */
  @ApiProperty({
    description: 'Ubicación del almacén',
    example: 'Av. Industrial 123, Lima',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255, { message: 'La ubicación no puede exceder 255 caracteres' })
  ubicacion: string;

  /**
   * Descripción del almacén (opcional)
   */
  @ApiProperty({
    description: 'Descripción del almacén',
    example: 'Almacén principal para productos terminados',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  descripcion?: string;

  /**
   * Capacidad máxima del almacén (opcional)
   */
  @ApiProperty({
    description: 'Capacidad máxima del almacén en m²',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'La capacidad debe ser un número con máximo 2 decimales' },
  )
  @IsPositive({ message: 'La capacidad debe ser positiva' })
  @Type(() => Number)
  capacidadMaxima?: number;

  /**
   * Responsable del almacén (opcional)
   */
  @ApiProperty({
    description: 'Nombre del responsable del almacén',
    example: 'Juan Pérez',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'El nombre del responsable no puede exceder 100 caracteres',
  })
  responsable?: string;

  /**
   * Teléfono de contacto (opcional)
   */
  @ApiProperty({
    description: 'Teléfono de contacto del almacén',
    example: '+51 999 888 777',
    required: false,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  telefono?: string;

  /**
   * Estado del almacén (opcional, por defecto true)
   */
  @ApiProperty({
    description: 'Estado del almacén',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
