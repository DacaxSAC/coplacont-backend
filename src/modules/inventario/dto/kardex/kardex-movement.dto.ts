import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class KardexMovementDto {
  @ApiProperty({
    description: 'ID del movimiento',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'Fecha del movimiento',
    example: '2024-01-15',
  })
  @Expose()
  fecha: Date;

  @ApiProperty({
    description: 'Tipo de operación (COMPRA/VENTA)',
    example: 'COMPRA',
  })
  @Expose()
  tipoOperacion: string;

  @ApiProperty({
    description: 'Número de comprobante',
    example: 'F001-00000123',
  })
  @Expose()
  numeroComprobante: string;

  @ApiProperty({
    description: 'Descripción del movimiento',
    example: 'Compra de mercadería',
  })
  @Expose()
  descripcion: string;

  @ApiProperty({
    description: 'Cantidad de entrada',
    example: 10.5,
  })
  @Expose()
  cantidadEntrada: number;

  @ApiProperty({
    description: 'Costo unitario de entrada',
    example: 25.5,
  })
  @Expose()
  costoUnitarioEntrada: number;

  @ApiProperty({
    description: 'Valor total de entrada',
    example: 267.75,
  })
  @Expose()
  valorTotalEntrada: number;

  @ApiProperty({
    description: 'Cantidad de salida',
    example: 5.0,
  })
  @Expose()
  cantidadSalida: number;

  @ApiProperty({
    description: 'Costo unitario de salida',
    example: 25.5,
  })
  @Expose()
  costoUnitarioSalida: number;

  @ApiProperty({
    description: 'Valor total de salida',
    example: 127.5,
  })
  @Expose()
  valorTotalSalida: number;

  @ApiProperty({
    description: 'Cantidad de saldo',
    example: 15.5,
  })
  @Expose()
  cantidadSaldo: number;

  @ApiProperty({
    description: 'Costo unitario promedio del saldo',
    example: 25.5,
  })
  @Expose()
  costoUnitarioSaldo: number;

  @ApiProperty({
    description: 'Valor total del saldo',
    example: 395.25,
  })
  @Expose()
  valorTotalSaldo: number;

  @ApiProperty({
    description: 'Información del producto',
  })
  @Expose()
  @Type(() => Object)
  producto: {
    id: number;
    codigo: string;
    nombre: string;
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
    description: 'Información del lote (si aplica)',
  })
  @Expose()
  @Type(() => Object)
  lote?: {
    id: number;
    numeroLote: string;
    fechaIngreso: Date;
    fechaVencimiento?: Date;
  };
}
