import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class CreateComprobanteTotalesDto {
  @IsOptional()
  totalGravada?: number;

  @IsOptional()
  @Type(() => Number)
  totalExonerada?: number;

  @IsOptional()
  @Type(() => Number)
  totalInafecta?: number;

  @IsOptional()
  @Type(() => Number)
  totalIgv?: number;

  @IsOptional()
  @Type(() => Number)
  totalIsc?: number;

  @Type(() => Number)
  totalGeneral: number;
}
