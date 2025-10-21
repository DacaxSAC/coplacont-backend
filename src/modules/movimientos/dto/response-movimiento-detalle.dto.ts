import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ResponseInventarioDto } from 'src/modules/inventario/dto';
import { ResponseDetalleSalidaDto } from './response-detalle-salida.dto';

/**
 * DTO de respuesta para detalle de movimiento
 */
export class ResponseMovimientoDetalleDto {
  /**
   * ID único del detalle
   */
  @ApiProperty({
    description: 'ID único del detalle',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Información del inventario
   */
  @ApiProperty({
    description: 'Información del inventario',
    type: ResponseInventarioDto,
  })
  @Expose()
  @Type(() => ResponseInventarioDto)
  inventario: ResponseInventarioDto;

  /**
   * Cantidad del movimiento
   */
  @ApiProperty({
    description: 'Cantidad del movimiento',
    example: 10.5,
  })
  @Expose()
  cantidad: number;

  // costoUnitario se calcula dinámicamente basado en el método de valoración

  /**
   * Costo total (cantidad * costo unitario)
   */
  @ApiProperty({
    description: 'Costo total del detalle',
    example: 267.75,
  })
  @Expose()
  costoTotal: number;

  /**
   * ID del lote relacionado
   */
  @ApiProperty({
    description: 'ID del lote relacionado',
    example: 1,
    required: false,
  })
  @Expose()
  idLote?: number;

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

  /**
   * Detalles de salida
   */
  @ApiProperty({
    description: 'Detalles de salida del movimiento',
    type: [ResponseDetalleSalidaDto],
    required: false,
  })
  @Expose()
  @Type(() => ResponseDetalleSalidaDto)
  detallesSalida?: ResponseDetalleSalidaDto[];
}
