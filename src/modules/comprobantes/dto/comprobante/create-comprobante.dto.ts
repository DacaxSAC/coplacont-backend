import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  ValidateNested,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoOperacion } from '../../enum/tipo-operacion.enum';
import { TipoComprobante } from '../../enum/tipo-comprobante.enum';
import { Moneda } from '../../enum/tipo-moneda.enum';
import { MetodoValoracion } from '../../enum/metodo-valoracion.enum';
import { CreateComprobanteDetalleDto } from '../comprobante-detalle/create-comprobante-detalle.dto';

export class CreateComprobanteDto {
  @ApiPropertyOptional({
    description: 'Correlativo único del comprobante (se genera automáticamente si no se proporciona)',
    example: 'CORR-12345',
  })
  @IsString()
  @IsOptional()
  correlativo?: string;

  @ApiProperty({
    description: 'Referencia a la persona (id)',
    example: 1,
  })
  @IsNotEmpty()
  idPersona: number;

  @ApiProperty({ enum: TipoOperacion })
  @IsEnum(TipoOperacion)
  @IsNotEmpty()
  tipoOperacion: TipoOperacion;

  @ApiProperty({ enum: TipoComprobante })
  @IsEnum(TipoComprobante)
  @IsNotEmpty()
  tipoComprobante: TipoComprobante;

  @ApiProperty({
    description: 'Fecha de emisión del comprobante',
    example: '2025-08-10',
  })
  @IsDateString()
  @IsNotEmpty()
  @Type(() => Date)
  fechaEmision: Date;

  @ApiProperty({ enum: Moneda })
  @IsEnum(Moneda)
  @IsNotEmpty()
  moneda: Moneda;

  @ApiPropertyOptional({
    description: 'Tipo de cambio aplicado',
    example: 3.75,
  })
  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @ApiPropertyOptional({
    description: 'Serie del comprobante',
    example: 'F001',
  })
  @IsString()
  @Length(0, 5)
  serie?: string;

  @ApiPropertyOptional({
    description: 'Número del comprobante',
    example: '1234567890',
  })
  @IsString()
  @Length(0, 20)
  numero?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento',
    example: '2025-08-20',
  })
  @IsDateString()
  @Type(() => Date)
  fechaVencimiento?: Date;

  @ApiPropertyOptional({
    description: 'Detalles del comprobante',
    type: [CreateComprobanteDetalleDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateComprobanteDetalleDto)
  detalles?: CreateComprobanteDetalleDto[];

  @ApiPropertyOptional({
    description: 'Método de valoración de inventario',
    enum: MetodoValoracion,
    example: MetodoValoracion.FIFO,
  })
  @IsOptional()
  @IsEnum(MetodoValoracion)
  metodoValoracion?: MetodoValoracion;
}
