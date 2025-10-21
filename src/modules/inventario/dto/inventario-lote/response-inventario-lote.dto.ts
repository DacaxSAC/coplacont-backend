import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ResponseInventarioDto } from '../inventario/response-inventario.dto';

/**
 * DTO de respuesta para lote de inventario
 * Define la estructura de datos que se devuelve al cliente
 */
export class ResponseInventarioLoteDto {
  /**
   * ID único del lote
   */
  @ApiProperty({
    description: 'ID único del lote',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Fecha de ingreso del lote
   */
  @ApiProperty({
    description: 'Fecha de ingreso del lote',
    example: '2024-01-15',
  })
  @Expose()
  fechaIngreso: Date;

  /**
   * Fecha de vencimiento del lote
   */
  @ApiProperty({
    description: 'Fecha de vencimiento del lote',
    example: '2024-12-31',
    required: false,
  })
  @Expose()
  fechaVencimiento?: Date;

  /**
   * Cantidad inicial del lote
   */
  @ApiProperty({
    description: 'Cantidad inicial del lote',
    example: 50.25,
  })
  @Expose()
  cantidadInicial: number;

  // cantidadActual se calcula dinámicamente y se incluye cuando es necesario

  /**
   * Costo unitario del lote
   */
  @ApiProperty({
    description: 'Costo unitario del producto en este lote',
    example: 15.75,
  })
  @Expose()
  costoUnitario: number;

  /**
   * Número de lote
   */
  @ApiProperty({
    description: 'Número de lote o referencia',
    example: 'LOTE-2024-001',
    required: false,
  })
  @Expose()
  numeroLote?: string;

  /**
   * Observaciones del lote
   */
  @ApiProperty({
    description: 'Observaciones adicionales del lote',
    example: 'Lote en perfectas condiciones',
    required: false,
  })
  @Expose()
  observaciones?: string;

  /**
   * Estado del lote
   */
  @ApiProperty({
    description: 'Estado del lote',
    example: true,
  })
  @Expose()
  estado: boolean;

  /**
   * Información del inventario relacionado
   */
  @ApiProperty({
    description: 'Información del inventario',
    type: ResponseInventarioDto,
  })
  @Expose()
  @Type(() => ResponseInventarioDto)
  inventario: ResponseInventarioDto;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Fecha de creación del lote',
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
