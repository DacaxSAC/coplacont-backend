import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * DTO de respuesta para almacén
 * Define la estructura de datos que se devuelve al cliente
 */
export class ResponseAlmacenDto {
  /**
   * ID único del almacén
   */
  @ApiProperty({
    description: 'ID único del almacén',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Nombre del almacén
   */
  @ApiProperty({
    description: 'Nombre del almacén',
    example: 'Almacén Central',
  })
  @Expose()
  nombre: string;

  /**
   * Ubicación del almacén
   */
  @ApiProperty({
    description: 'Ubicación del almacén',
    example: 'Av. Industrial 123, Lima',
  })
  @Expose()
  ubicacion: string;

  /**
   * Descripción del almacén
   */
  @ApiProperty({
    description: 'Descripción del almacén',
    example: 'Almacén principal para productos terminados',
    required: false,
  })
  @Expose()
  descripcion?: string;

  /**
   * Capacidad máxima del almacén
   */
  @ApiProperty({
    description: 'Capacidad máxima del almacén en m²',
    example: 1000,
    required: false,
  })
  @Expose()
  capacidadMaxima?: number;

  /**
   * Responsable del almacén
   */
  @ApiProperty({
    description: 'Nombre del responsable del almacén',
    example: 'Juan Pérez',
    required: false,
  })
  @Expose()
  responsable?: string;

  /**
   * Teléfono de contacto
   */
  @ApiProperty({
    description: 'Teléfono de contacto del almacén',
    example: '+51 999 888 777',
    required: false,
  })
  @Expose()
  telefono?: string;

  /**
   * Estado del almacén
   */
  @ApiProperty({
    description: 'Estado del almacén',
    example: true,
  })
  @Expose()
  estado: boolean;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Fecha de creación del almacén',
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
