import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para los datos mensuales del reporte de costo de venta
 */
export class CostoVentaMensualDto {
  /**
   * Mes (1-12)
   */
  @ApiProperty({
    description: 'Número del mes',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  mes: number;

  /**
   * Nombre del mes
   */
  @ApiProperty({
    description: 'Nombre del mes',
    example: 'Enero',
  })
  nombreMes: string;

  /**
   * Total de compras del mes
   */
  @ApiProperty({
    description: 'Total de compras del mes',
    example: '15000.00',
  })
  comprasTotales: string;

  /**
   * Total de salidas del mes
   */
  @ApiProperty({
    description: 'Total de salidas del mes',
    example: '12000.00',
  })
  salidasTotales: string;

  /**
   * Inventario final del mes
   */
  @ApiProperty({
    description: 'Inventario final del mes',
    example: '8000.00',
  })
  inventarioFinal: string;
}

/**
 * DTO para las sumatorias anuales del reporte de costo de venta
 */
export class CostoVentaSumatoriaDto {
  /**
   * Sumatoria total de compras del año
   */
  @ApiProperty({
    description: 'Sumatoria total de compras del año',
    example: '180000.00',
  })
  totalComprasAnual: string;

  /**
   * Sumatoria total de salidas del año
   */
  @ApiProperty({
    description: 'Sumatoria total de salidas del año',
    example: '144000.00',
  })
  totalSalidasAnual: string;

  /**
   * Inventario final del año
   */
  @ApiProperty({
    description: 'Inventario final del año',
    example: '96000.00',
  })
  inventarioFinalAnual: string;
}

/**
 * DTO para la respuesta del reporte de Estado de Costo de Venta
 */
export class CostoVentaResponseDto {
  /**
   * Año del reporte
   */
  @ApiProperty({
    description: 'Año del reporte',
    example: 2024,
  })
  año: number;

  /**
   * Nombre del almacén (si se filtró por almacén)
   */
  @ApiProperty({
    description: 'Nombre del almacén',
    example: 'Almacén Principal',
    required: false,
  })
  almacen?: string;

  /**
   * Nombre del producto (si se filtró por producto)
   */
  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Producto A',
    required: false,
  })
  producto?: string;

  /**
   * Datos mensuales del reporte
   */
  @ApiProperty({
    description: 'Datos mensuales del reporte',
    type: [CostoVentaMensualDto],
  })
  datosMensuales: CostoVentaMensualDto[];

  /**
   * Sumatorias anuales
   */
  @ApiProperty({
    description: 'Sumatorias anuales',
    type: CostoVentaSumatoriaDto,
  })
  sumatorias: CostoVentaSumatoriaDto;

  /**
   * Fecha de generación del reporte
   */
  @ApiProperty({
    description: 'Fecha de generación del reporte',
    example: '2024-01-15T10:30:00.000Z',
  })
  fechaGeneracion: Date;
}
