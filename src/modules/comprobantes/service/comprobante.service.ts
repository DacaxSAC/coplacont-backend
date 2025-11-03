import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Comprobante } from '../entities/comprobante';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateComprobanteDto } from '../dto/comprobante/create-comprobante.dto';
import { EntidadService } from 'src/modules/entidades/services';
import { ComprobanteDetalleService } from './comprobante-detalle.service';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';
import { plainToInstance } from 'class-transformer';
import { TablaDetalle } from '../entities/tabla-detalle.entity';
import { Correlativo } from '../entities/correlativo';
import { MovimientosService } from 'src/modules/movimientos';
import { MovimientoFactory } from 'src/modules/movimientos/factory/MovimientoFactory';
import { LoteCreationService } from 'src/modules/inventario/service/lote-creation.service';
import { PeriodoContableService } from 'src/modules/periodos/service';
import { PersonaService } from 'src/modules/users/services/person.service';

@Injectable()
export class ComprobanteService {
  constructor(
    @InjectRepository(Comprobante)
    private readonly comprobanteRepository: Repository<Comprobante>,
    @InjectRepository(Correlativo)
    private readonly correlativoRepository: Repository<Correlativo>,
    @InjectRepository(TablaDetalle)
    private readonly tablaDetalleRepository: Repository<TablaDetalle>,
    private readonly comprobanteDetalleService: ComprobanteDetalleService,
    private readonly personaService: PersonaService,
    private readonly entidadService: EntidadService,
    private readonly movimientoService: MovimientosService,
    private readonly movimientoFactory: MovimientoFactory,
    private readonly loteCreationService: LoteCreationService,
    private readonly periodoContableService: PeriodoContableService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Busca o crea un correlativo para una persona y tipo de operación específicos
   * @param idTipoOperacion - ID del tipo de operación en TablaDetalle
   * @param personaId - ID de la persona/empresa
   * @param manager - EntityManager de la transacción (opcional)
   * @returns Correlativo encontrado o creado
   */
  private async findOrCreateCorrelativo(
    idTipoOperacion: number,
    personaId: number,
    manager?: any,
  ) {
    const repository = manager
      ? manager.getRepository(Correlativo)
      : this.correlativoRepository;
    const queryBuilder = repository.createQueryBuilder('c');

    if (manager) {
      queryBuilder.setLock('pessimistic_write');
    }

    let correlativo = await queryBuilder
      .where('c.tipo = :tipo AND c.personaId = :personaId', {
        tipo: idTipoOperacion.toString(),
        personaId: personaId,
      })
      .getOne();

    if (!correlativo) {
      correlativo = repository.create({
        tipo: idTipoOperacion.toString(),
        personaId: personaId,
        ultimoNumero: 0,
      });
      await repository.save(correlativo);
    }
    return correlativo;
  }

  /**
   * Registra un nuevo comprobante con sus detalles y movimientos asociados
   * @param createComprobanteDto - Datos del comprobante a crear
   * @param personaId - ID de la persona/empresa propietaria
   */
  async register(
    createComprobanteDto: CreateComprobanteDto,
    personaId: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //Verificar que comprobante este dentro del PERIODO
      const periodoActivoDto =
        await this.periodoContableService.obtenerPeriodoActivo(personaId);
      const periodoActicoDePersona =
        await this.periodoContableService.obtenerPorId(periodoActivoDto.id);

      const fechaEmisionFinal = new Date(createComprobanteDto.fechaEmision);

      if (
        fechaEmisionFinal < new Date(periodoActicoDePersona.fechaInicio) ||
        fechaEmisionFinal > new Date(periodoActicoDePersona.fechaFin)
      ) {
        throw new Error(
          'Fecha de emision del comprobante no esta dentro del periodo contable de la persona',
        );
      }

      // Obtener METODO DE VALUACION CONFIGURADO
      const configuracionPeriodo =
        await this.periodoContableService.obtenerConfiguracion(personaId);
      const metodoValoracionFinal = configuracionPeriodo.metodoCalculoCosto;

      // CLIENTE/PROVEEDOR relacionado al comprobante
      const entidad = await this.entidadService.findEntity(
        createComprobanteDto.idPersona,
      );

      // PERSONA quien crea el comprobante
      const persona = await this.personaService.findById(personaId);
      if (!persona) {
        throw new Error(`Persona con ID ${personaId} no encontrada`);
      }

      // Obtener las entidades TablaDetalle para las relaciones
      const tipoOperacion = await this.tablaDetalleRepository.findOne({
        where: { idTablaDetalle: createComprobanteDto.idTipoOperacion }
      });
      if (!tipoOperacion) {
        throw new Error(`Tipo de operación con ID ${createComprobanteDto.idTipoOperacion} no encontrado`);
      }

      const tipoComprobante = await this.tablaDetalleRepository.findOne({
        where: { idTablaDetalle: createComprobanteDto.idTipoComprobante }
      });
      if (!tipoComprobante) {
        throw new Error(`Tipo de comprobante con ID ${createComprobanteDto.idTipoComprobante} no encontrado`);
      }

      // Asignación de CORRELATIVO
      const correlativo = await this.findOrCreateCorrelativo(
        createComprobanteDto.idTipoOperacion,
        personaId,
        queryRunner.manager,
      );
      correlativo.ultimoNumero += 1;
      await queryRunner.manager.save(correlativo);

      // Crea instancia de COMPROBANTE
      const comprobante = queryRunner.manager.create(Comprobante, {
        fechaEmision: createComprobanteDto.fechaEmision,
        moneda: createComprobanteDto.moneda,
        tipoCambio: createComprobanteDto.tipoCambio,
        serie: createComprobanteDto.serie,
        numero: createComprobanteDto.numero,
        fechaVencimiento: createComprobanteDto.fechaVencimiento,
      });

      //Asignamos ENTIDAD, PERSONA, RELACIONES y CORRELATIVO
      comprobante.periodoContable = periodoActicoDePersona;
      comprobante.entidad = entidad;
      comprobante.persona = persona;
      comprobante.tipoOperacion = tipoOperacion;
      comprobante.tipoComprobante = tipoComprobante;
      comprobante.correlativo = `CORR-${correlativo.ultimoNumero}`;

      // Guarda el COMPROBANTE
      const comprobanteSaved = await queryRunner.manager.save(comprobante);

      let costosUnitarios: number[] = [];
      let precioYcantidadPorLote: {
        idLote: number;
        costoUnitarioDeLote: number;
        cantidad: number;
      }[] = [];

      //verificamos DETALLES
      if (await this.existDetails(createComprobanteDto)) {
        // Registra DETALLES DE COMPROBANTE
        const detallesSaved = await this.comprobanteDetalleService.register(
          comprobanteSaved.idComprobante,
          createComprobanteDto.detalles!,
          queryRunner.manager,
        );
        comprobanteSaved.detalles = detallesSaved;

        /**
         * HASTA ESTE PUNTO TODO ESTA FUNCIONAL
         */

        // Obtener el tipo de operación para usar su descripción
        const tipoOperacionDetalle = await this.tablaDetalleRepository.findOne({
          where: { idTablaDetalle: createComprobanteDto.idTipoOperacion }
        });

        const { costoUnitario, lotes } =
          await this.loteCreationService.procesarLotesComprobante(
            detallesSaved,
            tipoOperacionDetalle?.descripcion || 'DESCONOCIDO',
            metodoValoracionFinal,
            fechaEmisionFinal,
          );

        //Hay que ver si aun son necesarios
        costosUnitarios = costoUnitario;
        precioYcantidadPorLote = lotes;

        // Validar que los lotes se crearon correctamente para compras
        // Obtener el tipo de operación para validar si es compra (código "02")
        const tipoOperacion = await this.tablaDetalleRepository.findOne({
          where: { idTablaDetalle: createComprobanteDto.idTipoOperacion }
        });
        
        if (tipoOperacion && tipoOperacion.codigo === '02') { // Código "02" para COMPRA
          const lotesValidos =
            await this.loteCreationService.validarLotesCompra(detallesSaved);
          if (!lotesValidos) {
            throw new Error(
              'Error al crear los lotes para la compra. Verifique los logs para más detalles.',
            );
          }
        }
      }

      // Cargar las relaciones necesarias para el MovimientoFactory DESPUÉS de guardar los detalles
      const comprobanteConRelaciones = await queryRunner.manager.findOne(Comprobante, {
        where: { idComprobante: comprobanteSaved.idComprobante },
        relations: ['tipoOperacion', 'tipoComprobante', 'detalles', 'detalles.inventario', 'detalles.inventario.producto']
      });
      
      if (!comprobanteConRelaciones) {
        throw new Error('Error al cargar el comprobante con sus relaciones');
      }

      // Crear movimiento
      console.log('🔍 DEBUG - Iniciando creación de movimiento');
      console.log('🔍 DEBUG - comprobanteConRelaciones.tipoOperacion:', comprobanteConRelaciones.tipoOperacion);
      console.log('🔍 DEBUG - comprobanteConRelaciones.detalles.length:', comprobanteConRelaciones.detalles?.length || 0);
      console.log('🔍 DEBUG - costosUnitarios:', costosUnitarios);
      console.log('🔍 DEBUG - precioYcantidadPorLote:', precioYcantidadPorLote);
      console.log('🔍 DEBUG - Verificando si tipoOperacion es COMPRA:', comprobanteConRelaciones.tipoOperacion?.descripcion === 'COMPRA');
      
      try {
        const movimientoDto =
          await this.movimientoFactory.createMovimientoFromComprobante(
            comprobanteConRelaciones,
            costosUnitarios,
            precioYcantidadPorLote,
          );
        
        console.log('🔍 DEBUG - movimientoDto creado:', JSON.stringify(movimientoDto, null, 2));
        
        const movimientoCreado = await this.movimientoService.createWithManager(
          movimientoDto,
          queryRunner.manager,
        );
        
        console.log('🔍 DEBUG - movimientoCreado:', movimientoCreado);
      } catch (movimientoError) {
        console.error('🚨 ERROR en creación de movimiento:', movimientoError);
        throw movimientoError;
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene el siguiente correlativo para una persona y tipo de operación
   * @param idTipoOperacion - ID del tipo de operación en TablaDetalle
   * @param personaId - ID de la persona/empresa
   * @returns Siguiente correlativo disponible
   */
  async getNextCorrelativo(
    idTipoOperacion: number,
    personaId: number,
  ): Promise<{ correlativo: string }> {
    const correlativo = await this.findOrCreateCorrelativo(
      idTipoOperacion,
      personaId,
    );
    return { correlativo: `corr-${correlativo.ultimoNumero + 1}` };
  }

  /**
   * Obtiene todos los comprobantes filtrados por empresa
   * @param personaId ID de la empresa (Persona)
   * @returns Lista de comprobantes de la empresa
   */
  async findAll(personaId: number): Promise<ResponseComprobanteDto[]> {
    const comprobantes = await this.comprobanteRepository.find({
      where: { persona: { id: personaId } },
      relations: ['totales', 'persona', 'tipoOperacion', 'tipoComprobante'],
    });
    return plainToInstance(ResponseComprobanteDto, comprobantes, {
      excludeExtraneousValues: true,
    });
  }

  async existDetails(
    createComprobanteDto: CreateComprobanteDto,
  ): Promise<boolean> {
    return (
      createComprobanteDto.detalles !== undefined &&
      createComprobanteDto.detalles !== null &&
      Array.isArray(createComprobanteDto.detalles) &&
      createComprobanteDto.detalles.length > 0
    );
  }

  /**
   * Obtiene el período contable activo para una persona
   * @param personaId ID de la persona/empresa
   * @returns Período contable activo o null si no existe
   */
  async obtenerPeriodoActivo(personaId: number) {
    return await this.periodoContableService.obtenerPeriodoActivo(personaId);
  }
}
