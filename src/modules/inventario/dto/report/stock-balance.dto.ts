import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StockBalanceDto {
  @ApiProperty({
    description: 'ID del inventario',
    example: 1,
  })
  @Expose()
  idInventario: number;

  @ApiProperty({
    description: 'Stock actual total',
    example: 150.5,
  })
  @Expose()
  stockActual: number;

  @ApiProperty({
    description: 'Costo unitario promedio',
    example: 25.75,
  })
  @Expose()
  costoUnitarioPromedio: number;

  @ApiProperty({
    description: 'Valor total del inventario',
    example: 3875.88,
  })
  @Expose()
  valorTotal: number;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  fechaActualizacion: Date;

  @ApiProperty({
    description: 'Información del producto',
  })
  @Expose()
  @Type(() => Object)
  producto: {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string;
    unidadMedida: string;
    categoria: string;
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
    ubicacion: string;
  };

  @ApiProperty({
    description: 'Detalles de lotes disponibles',
    type: 'array',
  })
  @Expose()
  @Type(() => Object)
  lotes: Array<{
    id: number;
    numeroLote: string;
    cantidadActual: number;
    costoUnitario: number;
    fechaIngreso: Date;
    fechaVencimiento?: Date;
    valorTotal: number;
  }>;
}

export class StockBalanceResponseDto {
  @ApiProperty({
    description: 'Lista de balances de stock',
    type: [StockBalanceDto],
  })
  @Expose()
  @Type(() => StockBalanceDto)
  data: StockBalanceDto[];

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

  @ApiProperty({
    description: 'Resumen de totales',
  })
  @Expose()
  summary: {
    totalItems: number;
    totalStockValue: number;
    totalQuantity: number;
  };
}
