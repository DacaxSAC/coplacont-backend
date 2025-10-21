import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MetodoValoracion } from 'src/modules/comprobantes/enum/metodo-valoracion.enum';

export class ValuationItemDto {
  @ApiProperty({
    description: 'ID del inventario',
    example: 1,
  })
  @Expose()
  idInventario: number;

  @ApiProperty({
    description: 'Información del producto',
  })
  @Expose()
  @Type(() => Object)
  producto: {
    id: number;
    codigo: string;
    nombre: string;
    categoria: string;
    unidadMedida: string;
  };

  @ApiProperty({
    description: 'Información del almacén',
  })
  @Expose()
  @Type(() => Object)
  almacen: {
    id: number;
    nombre: string;
    codigo: string;
  };

  @ApiProperty({
    description: 'Cantidad actual en stock',
    example: 100.5,
  })
  @Expose()
  cantidadActual: number;

  @ApiProperty({
    description: 'Valoración usando método FIFO',
    example: 2550.75,
  })
  @Expose()
  valoracionFIFO: number;

  @ApiProperty({
    description: 'Costo unitario FIFO',
    example: 25.4,
  })
  @Expose()
  costoUnitarioFIFO: number;

  @ApiProperty({
    description: 'Valoración usando promedio ponderado',
    example: 2588.13,
  })
  @Expose()
  valoracionPromedio: number;

  @ApiProperty({
    description: 'Costo unitario promedio ponderado',
    example: 25.77,
  })
  @Expose()
  costoUnitarioPromedio: number;

  @ApiProperty({
    description: 'Diferencia entre FIFO y Promedio',
    example: -37.38,
  })
  @Expose()
  diferencia_FIFO_Promedio: number;
}

export class ValuationReportDto {
  @ApiProperty({
    description: 'Fecha del reporte',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  fechaReporte: Date;

  @ApiProperty({
    description: 'Método de valoración principal usado',
    enum: MetodoValoracion,
  })
  @Expose()
  metodoValoracion: MetodoValoracion;

  @ApiProperty({
    description: 'Lista de items valorados',
    type: [ValuationItemDto],
  })
  @Expose()
  @Type(() => ValuationItemDto)
  items: ValuationItemDto[];

  @ApiProperty({
    description: 'Resumen de totales por método',
  })
  @Expose()
  resumen: {
    totalFIFO: number;
    totalPromedio: number;
    diferenciaTotalFIFO_Promedio: number;
    cantidadTotalItems: number;
    valorTotalInventario: number;
  };

  @ApiProperty({
    description: 'Información de paginación',
  })
  @Expose()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
