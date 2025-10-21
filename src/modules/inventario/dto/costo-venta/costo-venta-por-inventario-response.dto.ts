import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para los datos de un inventario específico en el reporte
 */
export class CostoVentaInventarioDto {
  @ApiProperty({
    example: 1,
    description: 'ID del inventario',
  })
  idInventario: number;

  @ApiProperty({
    example: 'Producto A - Almacén Central',
    description: 'Nombre del producto y almacén',
  })
  nombreProductoAlmacen: string;

  @ApiProperty({
    example: 'Producto A',
    description: 'Nombre del producto',
  })
  nombreProducto: string;

  @ApiProperty({
    example: 'Almacén Central',
    description: 'Nombre del almacén',
  })
  nombreAlmacen: string;

  @ApiProperty({
    example: '15000.50',
    description: 'Total de compras/entradas en el año',
  })
  entradasTotales: string;

  @ApiProperty({
    example: '12000.75',
    description: 'Total de salidas en el año',
  })
  salidasTotales: string;

  @ApiProperty({
    example: '3000.25',
    description: 'Inventario final al cierre del año',
  })
  inventarioFinal: string;
}

/**
 * DTO para las sumatorias totales del reporte por inventario
 */
export class CostoVentaInventarioSumatoriaDto {
  @ApiProperty({
    example: '150000.50',
    description: 'Total de entradas de todos los inventarios',
  })
  totalEntradasAnual: string;

  @ApiProperty({
    example: '120000.75',
    description: 'Total de salidas de todos los inventarios',
  })
  totalSalidasAnual: string;

  @ApiProperty({
    example: '30000.25',
    description: 'Total del inventario final de todos los inventarios',
  })
  totalInventarioFinalAnual: string;

  @ApiProperty({
    example: 25,
    description: 'Cantidad total de inventarios incluidos en el reporte',
  })
  cantidadInventarios: number;
}

/**
 * DTO de respuesta para el reporte de costo de venta por inventario
 */
export class CostoVentaPorInventarioResponseDto {
  @ApiProperty({
    example: 2024,
    description: 'Año del reporte',
  })
  año: number;

  @ApiProperty({
    example: 'Almacén Central',
    description: 'Nombre del almacén filtrado (opcional)',
    required: false,
  })
  almacen?: string;

  @ApiProperty({
    example: 'Producto A',
    description: 'Nombre del producto filtrado (opcional)',
    required: false,
  })
  producto?: string;

  @ApiProperty({
    type: [CostoVentaInventarioDto],
    description: 'Datos de cada inventario individual',
  })
  @Type(() => CostoVentaInventarioDto)
  datosInventarios: CostoVentaInventarioDto[];

  @ApiProperty({
    type: CostoVentaInventarioSumatoriaDto,
    description: 'Sumatorias totales del reporte',
  })
  @Type(() => CostoVentaInventarioSumatoriaDto)
  sumatorias: CostoVentaInventarioSumatoriaDto;

  @ApiProperty({
    example: '2024-08-17T13:30:00.000Z',
    description: 'Fecha y hora de generación del reporte',
  })
  fechaGeneracion: Date;
}
