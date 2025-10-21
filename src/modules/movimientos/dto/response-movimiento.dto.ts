import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TipoMovimiento } from '../enum/tipo-movimiento.enum';
import { MotivoMovimiento } from '../enum/motivo-movimiento.enum';
import { EstadoMovimiento } from '../enum/estado-movimiento.enum';
import { ResponseMovimientoDetalleDto } from './response-movimiento-detalle.dto';
import { ResponseComprobanteDto } from '../../comprobantes/dto/comprobante/response-comprobante.dto';

/**
 * DTO de respuesta para movimiento
 */
export class ResponseMovimientoDto {
  /**
   * ID único del movimiento
   */
  @ApiProperty({
    description: 'ID único del movimiento',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Tipo de movimiento
   */
  @ApiProperty({
    description: 'Tipo de movimiento',
    enum: TipoMovimiento,
    example: TipoMovimiento.ENTRADA,
  })
  @Expose()
  tipo: TipoMovimiento;

  /**
   * Motivo del movimiento
   */
  @ApiProperty({
    description: 'Motivo del movimiento',
    enum: MotivoMovimiento,
    example: MotivoMovimiento.COMPRA,
  })
  @Expose()
  motivo: MotivoMovimiento;

  /**
   * Fecha del movimiento
   */
  @ApiProperty({
    description: 'Fecha del movimiento',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  fecha: Date;

  /**
   * Número de documento relacionado
   */
  @ApiProperty({
    description: 'Número de documento relacionado',
    example: 'FAC-001-2024',
  })
  @Expose()
  numeroDocumento: string;

  /**
   * Observaciones del movimiento
   */
  @ApiProperty({
    description: 'Observaciones del movimiento',
    example: 'Compra de mercadería para stock',
  })
  @Expose()
  observaciones: string;

  /**
   * Estado del movimiento
   */
  @ApiProperty({
    description: 'Estado del movimiento',
    enum: EstadoMovimiento,
    example: EstadoMovimiento.PROCESADO,
  })
  @Expose()
  estado: EstadoMovimiento;

  /**
   * Información del comprobante relacionado
   */
  @ApiProperty({
    description: 'Comprobante relacionado',
    type: ResponseComprobanteDto,
    required: false,
  })
  @Expose()
  @Type(() => ResponseComprobanteDto)
  comprobante?: ResponseComprobanteDto;

  /**
   * Detalles del movimiento
   */
  @ApiProperty({
    description: 'Detalles del movimiento',
    type: [ResponseMovimientoDetalleDto],
  })
  @Expose()
  @Type(() => ResponseMovimientoDetalleDto)
  detalles: ResponseMovimientoDetalleDto[];

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
