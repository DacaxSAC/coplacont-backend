import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * DTO de respuesta para detalle de salida
 */
export class ResponseDetalleSalidaDto {
  /**
   * ID único del detalle de salida
   */
  @ApiProperty({
    description: 'ID único del detalle de salida',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * ID del lote
   */
  @ApiProperty({
    description: 'ID del lote',
    example: 1,
  })
  @Expose()
  idLote: number;

  /**
   * Costo unitario del lote
   */
  @ApiProperty({
    description: 'Costo unitario del lote',
    example: 25.5,
  })
  @Expose()
  costoUnitarioDeLote: number;

  /**
   * Cantidad del lote
   */
  @ApiProperty({
    description: 'Cantidad del lote',
    example: 10.5,
  })
  @Expose()
  cantidad: number;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Fecha de creación del registro',
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
