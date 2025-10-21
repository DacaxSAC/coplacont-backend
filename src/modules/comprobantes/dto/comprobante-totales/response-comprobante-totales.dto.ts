import { Expose } from 'class-transformer';

export class ResponseComprobanteTotalesDto {
  @Expose()
  idTotal: string;
  @Expose()
  totalGravada?: number;
  @Expose()
  totalExonerada?: number;
  @Expose()
  totalInafecta?: number;
  @Expose()
  totalIgv?: number;
  @Expose()
  totalIsc?: number;
  @Expose()
  totalGeneral: number;
}
