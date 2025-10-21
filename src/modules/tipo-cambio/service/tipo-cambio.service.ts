import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TipoCambio } from '../entities/tipo-cambio.entity';
import {
  TipoCambioResponseDto,
  SunatApiResponse,
} from '../dto/tipo-cambio.dto';
import { ApiResponseDto } from '../../entidades/dto/api-response.dto';

/**
 * Servicio para gestionar tipos de cambio de SUNAT
 */
@Injectable()
export class TipoCambioService {
  private readonly logger = new Logger(TipoCambioService.name);
  private readonly sunatApiUrl =
    'https://api.decolecta.com/v1/tipo-cambio/sunat';

  constructor(
    @InjectRepository(TipoCambio)
    private readonly tipoCambioRepository: Repository<TipoCambio>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene el tipo de cambio para una fecha específica
   * Primero consulta la base de datos, si no existe consulta el API externo
   */
  async obtenerTipoCambio(
    fecha?: string,
  ): Promise<ApiResponseDto<TipoCambioResponseDto>> {
    try {
      const fechaConsulta = fecha ? new Date(fecha) : new Date();
      const fechaString = fechaConsulta.toISOString().split('T')[0];

      // Validar que la fecha no sea futura
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaConsulta.setHours(0, 0, 0, 0);

      if (fechaConsulta > hoy) {
        return ApiResponseDto.error(
          'No se puede consultar el tipo de cambio para fechas futuras',
        );
      }

      // Primero consultar la base de datos
      const tipoCambioExistente = await this.tipoCambioRepository.findOne({
        where: { fecha: fechaConsulta },
      });

      if (tipoCambioExistente) {
        console.log(
          `Tipo de cambio encontrado en BD para fecha: ${fechaString}`,
        );
        return ApiResponseDto.success(
          'Tipo de cambio obtenido desde base de datos',
          this.mapearRespuesta(tipoCambioExistente),
        );
      }

      // Si no existe en BD, consultar API externo
      console.log(`Consultando API externo para fecha: ${fechaString}`);
      const resultadoApi = await this.consultarApiSunat(fechaString);

      if (!resultadoApi.success || !resultadoApi.data) {
        return ApiResponseDto.error(
          resultadoApi.message || 'Error al obtener datos de SUNAT',
        );
      }

      // Guardar en base de datos
      const nuevoTipoCambio = this.tipoCambioRepository.create({
        fecha: fechaConsulta,
        compra: parseFloat(resultadoApi.data.buy_price),
        venta: parseFloat(resultadoApi.data.sell_price),
        fuente: 'SUNAT',
      });

      const tipoCambioGuardado =
        await this.tipoCambioRepository.save(nuevoTipoCambio);

      this.logger.log(
        `Tipo de cambio guardado en BD para fecha: ${fechaString}`,
      );
      return ApiResponseDto.success(
        'Tipo de cambio obtenido desde SUNAT y guardado en base de datos',
        this.mapearRespuesta(tipoCambioGuardado),
      );
    } catch (error) {
      this.logger.error('Error al obtener tipo de cambio:', error);
      return ApiResponseDto.error('Error interno al obtener tipo de cambio');
    }
  }

  /**
   * Consulta el API externo de SUNAT
   */
  private async consultarApiSunat(
    fecha: string,
  ): Promise<ApiResponseDto<SunatApiResponse>> {
    const token = this.configService.get<string>('SUNAT_API_TOKEN');

    if (!token) {
      return ApiResponseDto.error('Token de API de SUNAT no configurado');
    }

    try {
      const response: { data: SunatApiResponse } = await axios.get(
        `${this.sunatApiUrl}?date=${fecha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      return ApiResponseDto.success(
        'Datos obtenidos exitosamente desde SUNAT',
        response.data,
      );
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          const errorData = error.response.data;
          return ApiResponseDto.error(
            `No se encontraron datos para la fecha ${fecha}: ${errorData.message || 'Fecha no válida'}`,
          );
        }

        if (error.response.status === 401) {
          return ApiResponseDto.error('Token de API de SUNAT inválido');
        }

        return ApiResponseDto.error(
          `Error al consultar API de SUNAT: ${error.message}`,
        );
      }

      return ApiResponseDto.error(
        'Error de conectividad al consultar API de SUNAT',
      );
    }
  }

  /**
   * Obtiene el tipo de cambio del día actual y lo guarda en BD
   * Usado por el job programado
   */
  async actualizarTipoCambioDiario(): Promise<
    ApiResponseDto<TipoCambioResponseDto>
  > {
    const hoy = new Date().toISOString().split('T')[0];
    const resultado = await this.obtenerTipoCambio(hoy);

    if (resultado.success) {
      this.logger.log('Tipo de cambio diario actualizado correctamente');
    } else {
      this.logger.error(
        'Error al actualizar tipo de cambio diario:',
        resultado.message,
      );
    }

    return resultado;
  }

  /**
   * Mapea la entidad a DTO de respuesta
   */
  private mapearRespuesta(tipoCambio: TipoCambio): TipoCambioResponseDto {
    // Manejar el caso donde fecha puede ser Date o string
    let fechaString: string;
    if (tipoCambio.fecha instanceof Date) {
      fechaString = tipoCambio.fecha.toISOString().split('T')[0];
    } else {
      // Si es string, asumimos que ya está en formato YYYY-MM-DD
      fechaString = String(tipoCambio.fecha);
    }

    return {
      fecha: fechaString,
      compra: Number(tipoCambio.compra),
      venta: Number(tipoCambio.venta),
      fuente: tipoCambio.fuente,
      fechaRegistro: tipoCambio.fechaRegistro,
    };
  }

  /**
   * Obtiene todos los tipos de cambio almacenados (para propósitos administrativos)
   */
  async obtenerTodos(): Promise<ApiResponseDto<TipoCambioResponseDto[]>> {
    try {
      const tiposCambio = await this.tipoCambioRepository.find({
        order: { fecha: 'DESC' },
      });

      return ApiResponseDto.success(
        `Se encontraron ${tiposCambio.length} registros de tipo de cambio`,
        tiposCambio.map((tc) => this.mapearRespuesta(tc)),
      );
    } catch (error) {
      this.logger.error('Error al obtener todos los tipos de cambio:', error);
      return ApiResponseDto.error(
        'Error al obtener los tipos de cambio desde la base de datos',
      );
    }
  }
}
