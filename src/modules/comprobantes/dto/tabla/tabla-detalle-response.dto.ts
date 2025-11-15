import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TablaDetalleResponseDto {
  @ApiProperty({
    description: 'ID del detalle de tabla',
    example: 1,
  })
  @Expose()
  idTablaDetalle: number;

  @ApiProperty({
    description: 'Código del registro en la tabla',
    example: '01',
  })
  @Expose()
  codigo: string;

  @ApiProperty({
    description: 'Descripción del registro',
    example: 'Venta',
  })
  @Expose()
  descripcion: string;

  @ApiProperty({
    description: 'Observaciones adicionales',
    example: 'Operación de venta de bienes o servicios',
    required: false,
  })
  @Expose()
  observaciones?: string;

  @ApiProperty({
    description: 'Estado activo del registro',
    example: true,
  })
  @Expose()
  activo: boolean;
}
