import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMovimientoDetalleDto } from './create-movimiento-detalle.dto';
import { TipoMovimiento } from '../enum/tipo-movimiento.enum';
import { EstadoMovimiento } from '../enum/estado-movimiento.enum';

/**
 * DTO para crear un nuevo movimiento de inventario
 */
export class CreateMovimientoDto {
  /**
   * Tipo de movimiento (ENTRADA, SALIDA, AJUSTE)
   */
  @ApiProperty({
    description: 'Tipo de movimiento',
    enum: TipoMovimiento,
    example: TipoMovimiento.ENTRADA,
  })
  @IsEnum(TipoMovimiento, {
    message: 'El tipo debe ser ENTRADA, SALIDA o AJUSTE',
  })
  tipo: TipoMovimiento;

  /**
   * Motivo del movimiento
   */

  /**
   * Fecha del movimiento
   */
  @ApiProperty({
    description: 'Fecha del movimiento',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString({}, { message: 'La fecha debe tener formato válido' })
  fecha: Date;

  /**
   * Número de documento relacionado (opcional)
   */
  @ApiProperty({
    description: 'Número de documento relacionado',
    example: 'FAC-001-2024',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser texto' })
  numeroDocumento?: string;

  /**
   * Observaciones adicionales (opcional)
   */
  @ApiProperty({
    description: 'Observaciones del movimiento',
    example: 'Compra de mercadería para stock',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;

  /**
   * Estado del movimiento
   */
  @ApiProperty({
    description: 'Estado del movimiento',
    enum: EstadoMovimiento,
    example: EstadoMovimiento.PROCESADO,
  })
  @IsOptional()
  @IsEnum(EstadoMovimiento, { message: 'Estado de movimiento inválido' })
  estado?: EstadoMovimiento = EstadoMovimiento.PROCESADO;

  /**
   * ID del comprobante relacionado (opcional)
   */
  @ApiProperty({
    description: 'ID del comprobante relacionado',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El ID del comprobante debe ser un número' })
  @IsPositive({ message: 'El ID del comprobante debe ser positivo' })
  @Type(() => Number)
  idComprobante?: number;

  /**
   * Detalles del movimiento
   */
  @ApiProperty({
    description: 'Detalles del movimiento',
    type: [CreateMovimientoDetalleDto],
  })
  @IsArray({ message: 'Los detalles deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => CreateMovimientoDetalleDto)
  detalles: CreateMovimientoDetalleDto[];
}
