import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoOperacion } from '../../../comprobantes/enum/tipo-operacion.enum';

export class KardexFilterDto {
  @ApiPropertyOptional({
    description: 'ID del producto para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  idProducto?: number;

  @ApiPropertyOptional({
    description: 'ID del almacén para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  idAlmacen?: number;

  @ApiPropertyOptional({
    description: 'ID del inventario específico',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  idInventario?: number;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({
    description: 'Tipo de operación para filtrar',
    enum: TipoOperacion,
  })
  @IsOptional()
  @IsEnum(TipoOperacion)
  tipoOperacion?: TipoOperacion;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}