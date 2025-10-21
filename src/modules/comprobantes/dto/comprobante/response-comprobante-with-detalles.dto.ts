import { Expose, Type } from 'class-transformer';
import { ResponseComprobanteDto } from './response-comprobante.dto';
import { ResponseComprobanteDetalleDto } from '../comprobante-detalle/response-comprobante-detalle.dto';

export class ResponseComprobanteWithDetallesDto extends ResponseComprobanteDto {
  @Expose()
  @Type(() => ResponseComprobanteDetalleDto)
  declare detalles?: ResponseComprobanteDetalleDto[];
}
