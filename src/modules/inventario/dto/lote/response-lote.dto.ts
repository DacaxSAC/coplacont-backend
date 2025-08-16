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

    @Expose()
    cantidadActual: number;

    @Expose()
    costoUnitario: number;

    @Expose()
    fechaVencimiento?: Date;

    @Expose()
    observaciones?: string;

    @Expose()
    @Transform(({ obj }) => ({
        id: obj.inventario?.id,
        producto: obj.inventario?.producto?.nombre,
        almacen: obj.inventario?.almacen?.nombre
    }))
    inventario: {
        id: number;
        producto: string;
        almacen: string;
    };
}