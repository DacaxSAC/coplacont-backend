import { Expose, Type } from 'class-transformer';
import { Moneda } from '../../enum/tipo-moneda.enum';
import { ResponseComprobanteTotalesDto } from '../comprobante-totales/response-comprobante-totales.dto';
import { EntidadResponseDto } from '../../../entidades/dto/entidad-response.dto';
import { ResponseComprobanteDetalleDto } from '../comprobante-detalle/response-comprobante-detalle.dto';
import { PersonaResponseDto } from 'src/modules/users/dto/persona/persona-response-dto';
import { TablaDetalleResponseDto } from '../tabla/tabla-detalle-response.dto';

export class ResponseComprobanteDto {
  @Expose()
  idComprobante: number;
  @Expose()
  correlativo: string;
  @Expose()
  @Type(() => TablaDetalleResponseDto)
  tipoOperacion: TablaDetalleResponseDto;
  @Expose()
  @Type(() => TablaDetalleResponseDto)
  tipoComprobante: TablaDetalleResponseDto;
  @Expose()
  fechaEmision: Date;
  @Expose()
  moneda: Moneda;
  @Expose()
  tipoCambio?: number;
  @Expose()
  serie: string;
  @Expose()
  numero: string;
  @Expose()
  fechaVencimiento: Date;
  @Expose()
  @Type(() => ResponseComprobanteTotalesDto)
  totales: ResponseComprobanteTotalesDto;

  @Expose()
  @Type(() => EntidadResponseDto)
  persona?: PersonaResponseDto;

  @Expose()
  @Type(() => EntidadResponseDto)
  entidad?: EntidadResponseDto;

  @Expose()
  @Type(() => ResponseComprobanteDetalleDto)
  detalles?: ResponseComprobanteDetalleDto[];
}
