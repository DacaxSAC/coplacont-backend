import { Expose, Transform } from 'class-transformer';

export class ResponseComprobanteDetalleDto {
  @Expose()
  idDetalle: number;

  // Id del inventario asociado al detalle
  @Expose()
  @Transform(
    ({ obj }) => {
      const o = obj as { inventario?: { id?: number } };
      return o.inventario?.id;
    },
    { toClassOnly: true },
  )
  idInventario?: number;

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
