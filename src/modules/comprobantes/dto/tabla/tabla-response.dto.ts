import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TablaDetalleResponseDto } from './tabla-detalle-response.dto';

export class TablaResponseDto {
  @ApiProperty({
    description: 'ID de la tabla',
    example: 1,
  })
  @Expose()
  idTabla: number;

  @ApiProperty({
    description: 'Número de la tabla según SUNAT',
    example: '12',
  })
  @Expose()
  numeroTabla: string;

  @ApiProperty({
    description: 'Nombre de la tabla',
    example: 'Tipos de Operación',
  })
  @Expose()
  nombre: string;

  @ApiProperty({
    description: 'Descripción de la tabla',
    example: 'Catálogo de tipos de operaciones según SUNAT',
    required: false,
  })
  @Expose()
  descripcion?: string;

  @ApiProperty({
    description: 'Estado activo de la tabla',
    example: true,
  })
  @Expose()
  activo: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  fechaCreacion: Date;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  fechaActualizacion: Date;

  @ApiProperty({
    description: 'Detalles de la tabla',
    type: [TablaDetalleResponseDto],
  })
  @Expose()
  @Type(() => TablaDetalleResponseDto)
  detalles: TablaDetalleResponseDto[];
}
