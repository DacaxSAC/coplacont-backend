import { Expose, Type } from "class-transformer";
import { TipoComprobante } from "../../enum/tipo-comprobante.enum";
import { Moneda } from "../../enum/tipo-moneda.enum";
import { TipoOperacion } from "../../enum/tipo-operacion.enum";
import { ResponseComprobanteTotalesDto } from "../comprobante-totales/response-comprobante-totales.dto";
import { EntidadResponseDto } from "../../../entidades/dto/entidad-response.dto";
import { ResponseComprobanteDetalleDto } from "../comprobante-detalle/response-comprobante-detalle.dto";
import { PersonaResponseDto } from "src/modules/users/dto/persona/persona-response-dto";

export class ResponseComprobanteDto {
  @Expose()
    idComprobante: number;
    @Expose()
    correlativo: string;
    @Expose()
    tipoOperacion: TipoOperacion;
    @Expose()
    tipoComprobante: TipoComprobante;
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
    totales : ResponseComprobanteTotalesDto;
    
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
  