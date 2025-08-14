import { Expose, Transform } from "class-transformer";

export class ResponseComprobanteDetalleDto {
  @Expose()
  idDetalle: number;

  // Id del producto asociado al detalle
  @Expose()
  @Transform(({ obj }) => obj?.producto?.id, { toClassOnly: true })
  idProducto?: number;

  @Expose()
  cantidad: number;

  @Expose()
  unidadMedida: string;

  @Expose()
  precioUnitario: number;

  @Expose()
  subtotal: number;

  @Expose()
  igv?: number;

  @Expose()
  isc?: number;

  @Expose()
  total: number;

  @Expose()
  descripcion: string;
}