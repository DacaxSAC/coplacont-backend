import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MovimientosRepository } from '../repository/movimientos.repository';
import { CreateMovimientoDto } from '../dto/create-movimiento.dto';
import { ResponseMovimientoDto } from '../dto/response-movimiento.dto';
import { TipoMovimiento } from '../enum/tipo-movimiento.enum';
import { EstadoMovimiento } from '../enum/estado-movimiento.enum';

/**
 * Servicio para la gestión de movimientos de inventario
 */
@Injectable()
export class MovimientosService {
  private readonly logger = new Logger(MovimientosService.name);

  constructor(private readonly movimientosRepository: MovimientosRepository) {}

  /**
   * Crear un nuevo movimiento
   */
  async create(
    createMovimientoDto: CreateMovimientoDto,
  ): Promise<ResponseMovimientoDto> {
    this.logger.log(
      `🔄 [RECALCULO-TRACE] Iniciando creación de movimiento: Tipo=${String(createMovimientoDto.tipo)}, Fecha=${new Date(createMovimientoDto.fecha).toISOString()}, ComprobanteId=${String(createMovimientoDto.idComprobante)}`,
    );

    // Verificar si es un movimiento retroactivo
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaMovimiento = new Date(createMovimientoDto.fecha);
    fechaMovimiento.setHours(0, 0, 0, 0);
    const esMovimientoRetroactivo = fechaMovimiento < hoy;

    this.logger.log(
      `🔍 [RECALCULO-TRACE] Verificación movimiento retroactivo: ${esMovimientoRetroactivo ? 'SÍ' : 'NO'} (Fecha movimiento: ${fechaMovimiento.toISOString().split('T')[0]}, Hoy: ${hoy.toISOString().split('T')[0]})`,
    );

    // Log detalles del movimiento
    this.logger.log(
      `📋 [RECALCULO-TRACE] Detalles del movimiento: ${createMovimientoDto.detalles.length} productos, Estado=${createMovimientoDto.estado}`,
    );

    if (esMovimientoRetroactivo) {
      this.logger.warn(
        `⚠️ [RECALCULO-TRACE] MOVIMIENTO RETROACTIVO DETECTADO - Este movimiento puede activar recálculo automático de Kardex`,
      );
    }

    // Validar que existan los productos y almacenes
    this.logger.log(
      `🔍 [RECALCULO-TRACE] Validando existencia de inventarios y lotes`,
    );
    await this.validateDetalles(createMovimientoDto.detalles);
    this.logger.log(`✅ [RECALCULO-TRACE] Validación de detalles completada`);

    // Crear el movimiento
    this.logger.log(`💾 [RECALCULO-TRACE] Creando movimiento en base de datos`);
    const movimiento =
      await this.movimientosRepository.create(createMovimientoDto);
    this.logger.log(
      `✅ [RECALCULO-TRACE] Movimiento creado exitosamente con ID=${movimiento.id}`,
    );

    if (esMovimientoRetroactivo) {
      this.logger.log(
        `🔄 [RECALCULO-TRACE] NOTA: El movimiento retroactivo ID=${movimiento.id} ha sido creado - El sistema debería procesar recálculo automático si está configurado`,
      );
    }

    return this.mapToResponseDto(movimiento);
  }

  /**
   * Crear un nuevo movimiento usando un EntityManager específico
   * Útil para transacciones anidadas
   */
  async createWithManager(
    createMovimientoDto: CreateMovimientoDto,
    manager: any,
  ): Promise<ResponseMovimientoDto> {
    this.logger.log(
      `🔄 [RECALCULO-TRACE] Iniciando creación de movimiento con EntityManager: Tipo=${String(createMovimientoDto.tipo)}, Fecha=${new Date(createMovimientoDto.fecha).toISOString()}, ComprobanteId=${String(createMovimientoDto.idComprobante)}`,
    );

    // Verificar si es un movimiento retroactivo
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaMovimiento = new Date(createMovimientoDto.fecha);
    fechaMovimiento.setHours(0, 0, 0, 0);
    const esMovimientoRetroactivo = fechaMovimiento < hoy;

    this.logger.log(
      `🔍 [RECALCULO-TRACE] Verificación movimiento retroactivo: ${esMovimientoRetroactivo ? 'SÍ' : 'NO'} (Fecha movimiento: ${fechaMovimiento.toISOString().split('T')[0]}, Hoy: ${hoy.toISOString().split('T')[0]})`,
    );

    // Log detalles del movimiento
    this.logger.log(
      `📋 [RECALCULO-TRACE] Detalles del movimiento: ${createMovimientoDto.detalles.length} productos, Estado=${createMovimientoDto.estado}`,
    );

    if (esMovimientoRetroactivo) {
      this.logger.warn(
        `⚠️ [RECALCULO-TRACE] MOVIMIENTO RETROACTIVO DETECTADO - Este movimiento puede activar recálculo automático de Kardex`,
      );
    }

    // Validar que existan los productos y almacenes
    this.logger.log(
      `🔍 [RECALCULO-TRACE] Validando existencia de inventarios y lotes`,
    );
    await this.validateDetalles(createMovimientoDto.detalles);
    this.logger.log(`✅ [RECALCULO-TRACE] Validación de detalles completada`);

    // Crear el movimiento usando el EntityManager proporcionado
    this.logger.log(
      `💾 [RECALCULO-TRACE] Creando movimiento en base de datos con EntityManager`,
    );
    const movimiento = await this.movimientosRepository.createWithManager(
      createMovimientoDto,
      manager,
    );
    this.logger.log(
      `✅ [RECALCULO-TRACE] Movimiento creado exitosamente con ID=${movimiento.id}`,
    );

    if (esMovimientoRetroactivo) {
      this.logger.log(
        `🔄 [RECALCULO-TRACE] NOTA: El movimiento retroactivo ID=${movimiento.id} ha sido creado - El sistema debería procesar recálculo automático si está configurado`,
      );
    }

    return this.mapToResponseDto(movimiento);
  }

  /**
   * Buscar todos los movimientos
   */
  async findAll(personaId?: number): Promise<ResponseMovimientoDto[]> {
    const movimientos = await this.movimientosRepository.findAll(personaId);
    return movimientos.map((movimiento) => this.mapToResponseDto(movimiento));
  }

  /**
   * Buscar movimiento por ID
   */
  async findOne(id: number): Promise<ResponseMovimientoDto> {
    const movimiento = await this.movimientosRepository.findById(id);
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(movimiento);
  }

  /**
   * Buscar movimientos por tipo
   */
  async findByTipo(
    tipo: TipoMovimiento,
    personaId?: number,
  ): Promise<ResponseMovimientoDto[]> {
    const movimientos = await this.movimientosRepository.findByTipo(
      tipo,
      personaId,
    );
    return movimientos.map((movimiento) => this.mapToResponseDto(movimiento));
  }

  /**
   * Buscar movimientos por estado
   */
  async findByEstado(
    estado: EstadoMovimiento,
    personaId?: number,
  ): Promise<ResponseMovimientoDto[]> {
    const movimientos = await this.movimientosRepository.findByEstado(
      estado,
      personaId,
    );
    return movimientos.map((movimiento) => this.mapToResponseDto(movimiento));
  }

  /**
   * Buscar movimientos por comprobante
   */
  async findByComprobante(
    idComprobante: number,
  ): Promise<ResponseMovimientoDto[]> {
    const movimientos =
      await this.movimientosRepository.findByComprobante(idComprobante);
    return movimientos.map((movimiento) => this.mapToResponseDto(movimiento));
  }

  /**
   * Actualizar estado del movimiento
   */
  async updateEstado(
    id: number,
    estado: EstadoMovimiento,
  ): Promise<ResponseMovimientoDto> {
    const movimiento = await this.movimientosRepository.findById(id);
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    const updatedMovimiento = await this.movimientosRepository.updateEstado(
      id,
      estado,
    );
    return this.mapToResponseDto(updatedMovimiento);
  }

  /**
   * Cancelar movimiento
   */
  async cancelarMovimiento(id: number): Promise<ResponseMovimientoDto> {
    const movimiento = await this.movimientosRepository.findById(id);
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    if (movimiento.estado === EstadoMovimiento.PROCESADO) {
      throw new BadRequestException(
        'No se puede cancelar un movimiento ya procesado',
      );
    }

    const cancelledMovimiento = await this.movimientosRepository.updateEstado(
      id,
      EstadoMovimiento.CANCELADO,
    );
    return this.mapToResponseDto(cancelledMovimiento);
  }

  /**
   * Eliminar movimiento
   */
  async remove(id: number): Promise<void> {
    const movimiento = await this.movimientosRepository.findById(id);
    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    if (movimiento.estado === EstadoMovimiento.PROCESADO) {
      throw new BadRequestException(
        'No se puede eliminar un movimiento ya procesado',
      );
    }

    await this.movimientosRepository.remove(id);
  }

  /**
   * Validar que existan los inventarios en los detalles
   */
  private async validateDetalles(detalles: any[]): Promise<void> {
    for (const detalle of detalles) {
      // Validar inventario
      const inventario = await this.movimientosRepository.findInventarioById(
        detalle.idInventario,
      );
      if (!inventario) {
        throw new NotFoundException(
          `Inventario con ID ${detalle.idInventario} no encontrado`,
        );
      }

      // Validar lote si se especifica
      if (detalle.idLote) {
        const lote = await this.movimientosRepository.findLoteById(
          detalle.idLote,
        );
        if (!lote) {
          throw new NotFoundException(
            `Lote con ID ${detalle.idLote} no encontrado`,
          );
        }
      }
    }
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(movimiento: any): ResponseMovimientoDto {
    return plainToInstance(ResponseMovimientoDto, movimiento, {
      excludeExtraneousValues: true,
    });
  }
}
