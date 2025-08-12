import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateComprobanteDetalleDto {
  @ApiProperty({
    description: 'Cantidad del producto o servicio',
    example: 10.5,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cantidad: number;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'KG',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  unidadMedida: string;

  @ApiProperty({
    description: 'Precio unitario',
    example: 25.50,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  precioUnitario: number;

  @ApiProperty({
    description: 'Subtotal del detalle',
    example: 267.75,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  subtotal: number;

  @ApiProperty({
    description: 'IGV aplicado',
    example: 48.20,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  igv: number;

  @ApiProperty({
    description: 'ISC aplicado',
    example: 0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  isc: number;

  @ApiProperty({
    description: 'Total del detalle',
    example: 315.95,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  total: number;

  @ApiPropertyOptional({
    description: 'Descripción del producto o servicio',
    example: 'Caja de manzanas verdes',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;
}