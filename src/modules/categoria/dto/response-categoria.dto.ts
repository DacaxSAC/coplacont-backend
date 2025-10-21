import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { TipoCategoria } from '../enum';

/**
 * DTO de respuesta para categoría
 * Define la estructura de datos que se devuelve al cliente
 */
export class ResponseCategoriaDto {
  /**
   * ID único de la categoría
   */
  @ApiProperty({
    description: 'ID único de la categoría',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Nombre de la categoría
   */
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Electrónicos',
  })
  @Expose()
  nombre: string;

  /**
   * Descripción de la categoría
   */
  @ApiProperty({
    description: 'Descripción de la categoría',
    example: 'Productos electrónicos y tecnológicos',
    required: false,
  })
  @Expose()
  descripcion?: string;

  /**
   * Tipo de categoría
   */
  @ApiProperty({
    description: 'Tipo de categoría',
    enum: TipoCategoria,
    example: TipoCategoria.PRODUCTO,
  })
  @Expose()
  tipo: TipoCategoria;

  /**
   * Estado de la categoría
   */
  @ApiProperty({
    description: 'Estado de la categoría',
    example: true,
  })
  @Expose()
  estado: boolean;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Fecha de creación de la categoría',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  fechaCreacion: Date;

  /**
   * Fecha de última actualización
   */
  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  fechaActualizacion: Date;
}
