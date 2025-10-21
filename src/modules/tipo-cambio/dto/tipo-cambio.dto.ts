import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TipoCambioQueryDto {
  @ApiProperty({
    description: 'Fecha en formato YYYY-MM-DD',
    example: '2023-05-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class TipoCambioResponseDto {
  @ApiProperty({ description: 'Fecha del tipo de cambio' })
  fecha: string;

  @ApiProperty({ description: 'Precio de compra' })
  compra: number;

  @ApiProperty({ description: 'Precio de venta' })
  venta: number;

  @ApiProperty({ description: 'Fuente de los datos' })
  fuente: string;

  @ApiProperty({ description: 'Fecha de registro en la base de datos' })
  fechaRegistro: Date;
}

// Respuesta de API Externo
export interface SunatApiResponse {
  buy_price: string;
  sell_price: string;
  base_currency: string;
  quote_currency: string;
  date: string;
}

// Respuesta de error del API externo
export interface SunatApiError {
  message: string;
}
