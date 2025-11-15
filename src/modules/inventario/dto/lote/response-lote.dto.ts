import { Expose, Transform } from 'class-transformer';

export class ResponseLoteDto {
  @Expose()
  id: number;

  @Expose()
  numeroLote: string;

  @Expose()
  fechaIngreso: Date;

  @Expose()
  cantidadInicial: number;

  // cantidadActual se calcula dinámicamente
  // costoUnitario se mantiene como campo persistido en la entidad

  @Expose()
  fechaVencimiento?: Date;

  @Expose()
  observaciones?: string;

  @Expose()
  @Transform(({ obj }) => {
    const o = obj as {
      inventario?: {
        id?: number;
        producto?: { nombre?: string };
        almacen?: { nombre?: string };
      };
    };
    return {
      id: o.inventario?.id as number,
      producto: o.inventario?.producto?.nombre as string,
      almacen: o.inventario?.almacen?.nombre as string,
    };
  })
  inventario: {
    id: number;
    producto: string;
    almacen: string;
  };
}
