import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * DTO para un movimiento individual en el reporte Kardex
 */
export class KardexMovementReportDto {
  @ApiProperty({ description: 'Fecha del movimiento' })
  @Expose()
  fecha: Date;

  @ApiProperty({ description: 'Tipo de movimiento (Entrada/Salida)' })
  @Expose()
  tipo: string;

  @ApiProperty({ description: 'Tipo de comprobante' })
  @Expose()
  tipoComprobante: string;

  @ApiProperty({ description: 'Número de comprobante' })
  @Expose()
  numeroComprobante: string;

  @ApiProperty({ description: 'Cantidad del movimiento' })
  @Expose()
  cantidad: number;

  @ApiProperty({ description: 'Saldo acumulado después del movimiento' })
  @Expose()
  saldo: number;

  @ApiProperty({ description: 'Costo unitario' })
  @Expose()
  costoUnitario: number;

  @ApiProperty({ description: 'Costo total del movimiento' })
  @Expose()
  costoTotal: number;
}

/**
 * DTO para el resumen final del Kardex
 */
export class KardexSummaryDto {
  @ApiProperty({ description: 'Cantidad actual en stock' })
  @Expose()
  cantidadActual: number;

  @ApiProperty({ description: 'Saldo actual en stock' })
  @Expose()
  saldoActual: number;

  @ApiProperty({ description: 'Costo final promedio' })
  @Expose()
  costoFinal: number;
}

/**
 * DTO principal para el reporte Kardex completo
 */
export class KardexReportDto {
  @ApiProperty({
    description: 'Lista de movimientos del Kardex',
    type: [KardexMovementReportDto],
  })
  @Expose()
  @Type(() => KardexMovementReportDto)
  movimientos: KardexMovementReportDto[];

  @ApiProperty({
    description: 'Resumen final del Kardex',
    type: KardexSummaryDto,
  })
  @Expose()
  @Type(() => KardexSummaryDto)
  resumen: KardexSummaryDto;

  @ApiProperty({ description: 'Información de paginación' })
  @Expose()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
