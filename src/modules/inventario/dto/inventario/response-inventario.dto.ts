import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ResponseAlmacenDto } from 'src/modules/almacen/dto';
import { ResponseProductoDto } from 'src/modules/productos/dto';

/**
 * DTO de respuesta para inventario
 * Define la estructura de datos que se devuelve al cliente
 */
export class ResponseInventarioDto {
  /**
   * ID único del registro de inventario
   */
  @ApiProperty({
    description: 'ID único del registro de inventario',
    example: 1,
  })
  @Expose()
  id: number;

  /**
   * Stock actual calculado dinámicamente basado en compras y ventas
   */
  @ApiProperty({
    description: 'Stock actual calculado dinámicamente',
    example: 150.5,
  })
  @Expose()
  stockActual: number;

  /**
   * Información del almacén
   */
  @ApiProperty({
    description: 'Información del almacén',
    type: ResponseAlmacenDto,
  })
  @Expose()
  @Type(() => ResponseAlmacenDto)
  almacen: ResponseAlmacenDto;

  /**
   * Información del producto
   */
  @ApiProperty({
    description: 'Información del producto',
    type: ResponseProductoDto,
  })
  @Expose()
  @Type(() => ResponseProductoDto)
  producto: ResponseProductoDto;

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
