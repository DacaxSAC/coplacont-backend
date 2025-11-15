import { Expose, Type } from 'class-transformer';
import { ResponseComprobanteDto } from '../comprobante/response-comprobante.dto';

export class ResponseTransferenciaDto {
  @Expose()
  @Type(() => ResponseComprobanteDto)
  comprobanteSalida!: ResponseComprobanteDto;

  @Expose()
  @Type(() => ResponseComprobanteDto)
  comprobanteEntrada!: ResponseComprobanteDto;
}
