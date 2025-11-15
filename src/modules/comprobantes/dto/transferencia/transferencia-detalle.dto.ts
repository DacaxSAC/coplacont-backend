import {
  IsInt,
  Min,
  IsString,
  Length,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class TransferenciaDetalleDto {
  @IsInt()
  @Min(1)
  idProducto!: number;

  @IsNumber()
  @Min(0.0001)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descripcion?: string;
}
