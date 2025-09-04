import { Injectable } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { Comprobante } from "../entities/comprobante";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { EntidadService } from "src/modules/entidades/services";
import { ComprobanteDetalleService } from "./comprobante-detalle.service";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";
import { plainToInstance } from "class-transformer";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { MetodoValoracion } from "../enum/metodo-valoracion.enum";
import { Correlativo } from "../entities/correlativo";
import { MovimientosService } from "src/modules/movimientos";
import { MovimientoFactory } from "src/modules/movimientos/factory/MovimientoFactory";
import { LoteCreationService } from "src/modules/inventario/service/lote-creation.service";
import { PeriodoContableService } from "src/modules/periodos/service";
import { KardexService } from "src/modules/inventario/service/kardex.service";
import { StockCacheService } from "src/modules/inventario/service/stock-cache.service";

@Injectable()
export class ComprobanteService {
    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>,
        @InjectRepository(Correlativo)
        private readonly correlativoRepository: Repository<Correlativo>,
        private readonly comprobanteDetalleService: ComprobanteDetalleService,
        private readonly personaService: EntidadService,
        private readonly movimientoService : MovimientosService,
        private readonly movimientoFactory : MovimientoFactory,
        private readonly loteCreationService: LoteCreationService,
        private readonly periodoContableService: PeriodoContableService,
        private readonly kardexService: KardexService,
        private readonly stockCacheService: StockCacheService,
        private readonly dataSource: DataSource
    ) { }

    /**
     * Busca o crea un correlativo para una persona y tipo de operación específicos
     * @param tipoOperacion - Tipo de operación (COMPRA, VENTA, etc.)
     * @param personaId - ID de la persona/empresa
     * @param manager - EntityManager de la transacción (opcional)
     * @returns Correlativo encontrado o creado
     */
    private async findOrCreateCorrelativo(tipoOperacion: TipoOperacion, personaId: number, manager?: any) {
        console.log(`🔍 Buscando correlativo para tipo: ${tipoOperacion}, persona: ${personaId}`);
        
        const repository = manager ? manager.getRepository(Correlativo) : this.correlativoRepository;
        const queryBuilder = repository.createQueryBuilder('c');
        
        if (manager) {
            queryBuilder.setLock('pessimistic_write');
        }
        
        let correlativo = await queryBuilder
            .where('c.tipo = :tipo AND c.personaId = :personaId', { 
                tipo: tipoOperacion, 
                personaId: personaId 
            })
            .getOne();

        if (!correlativo) {
            console.log(`📝 Creando nuevo correlativo para tipo: ${tipoOperacion}, persona: ${personaId}`);
            correlativo = repository.create({
                tipo: tipoOperacion,
                personaId: personaId,
                ultimoNumero: 0,
            });
            await repository.save(correlativo);
            console.log(`✅ Correlativo creado con ultimoNumero: ${correlativo.ultimoNumero}`);
        } else {
            console.log(`🔄 Correlativo encontrado con ultimoNumero: ${correlativo.ultimoNumero}`);
        }

        return correlativo;
    }

    /**
     * Registra un nuevo comprobante con sus detalles y movimientos asociados
     * @param createComprobanteDto - Datos del comprobante a crear
     * @param personaId - ID de la persona/empresa propietaria
     */
    async register(createComprobanteDto: CreateComprobanteDto, personaId: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            // Busca entidad cliente/proveedor
            const entidad = await this.personaService.findEntity(createComprobanteDto.idPersona);

            // Crea instancia de comprobante
            const comprobante = queryRunner.manager.create(Comprobante, createComprobanteDto);
            comprobante.entidad = entidad;
            comprobante.persona = { id: personaId } as any;

            // Asigna correlativo (genera automáticamente si no se proporciona)
            if (!createComprobanteDto.correlativo) {
                const correlativo = await this.findOrCreateCorrelativo(createComprobanteDto.tipoOperacion, personaId, queryRunner.manager);
                correlativo.ultimoNumero += 1;
                await queryRunner.manager.save(correlativo);
                comprobante.correlativo = `CORR-${correlativo.ultimoNumero}`;
            } else {
                comprobante.correlativo = createComprobanteDto.correlativo;
            }

            // Guarda el comprobante
            const comprobanteSaved = await queryRunner.manager.save(comprobante);
        
            let costosUnitarios: number[] = [];
        let precioYcantidadPorLote: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];
        let metodoValoracionFinal: MetodoValoracion;
        let fechaEmisionFinal: Date;

            // Obtener método de valoración desde la configuración del período
            const configuracionPeriodo = await this.periodoContableService.obtenerConfiguracion(personaId);
            console.log('Metodo de valoracion:',configuracionPeriodo);
            metodoValoracionFinal = createComprobanteDto.metodoValoracion || configuracionPeriodo.metodoCalculoCosto;
            
            // Convertir fechaEmision a Date si es string
            fechaEmisionFinal = typeof createComprobanteDto.fechaEmision === 'string' 
                ? new Date(createComprobanteDto.fechaEmision) 
                : createComprobanteDto.fechaEmision;

            // Verifica si el comprobante tiene detalles
            if (await this.existDetails(createComprobanteDto)) {
                // Registra detalles
                const detallesSaved = await this.comprobanteDetalleService.register(comprobanteSaved.idComprobante, createComprobanteDto.detalles!, queryRunner.manager);
                comprobanteSaved.detalles = detallesSaved;
                
                const {costoUnitario, lotes} = await this.loteCreationService.procesarLotesComprobante(detallesSaved, createComprobanteDto.tipoOperacion, metodoValoracionFinal, fechaEmisionFinal);
                costosUnitarios = costoUnitario;
                precioYcantidadPorLote = lotes;
                
                // Validar que los lotes se crearon correctamente para compras
                if (createComprobanteDto.tipoOperacion === TipoOperacion.COMPRA) {
                    const lotesValidos = await this.loteCreationService.validarLotesCompra(detallesSaved);
                    if (!lotesValidos) {
                        throw new Error('Error al crear los lotes para la compra. Verifique los logs para más detalles.');
                    }
                }
            }
            
            // Crear movimiento
            const movimientoDto = await this.movimientoFactory.createMovimientoFromComprobante(comprobanteSaved, costosUnitarios, precioYcantidadPorLote);
            const movimientoCreado = await this.movimientoService.createWithManager(movimientoDto, queryRunner.manager);
            
            // Verificar si es un movimiento retroactivo y ejecutar recálculo automático
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaMovimiento = new Date(fechaEmisionFinal);
            fechaMovimiento.setHours(0, 0, 0, 0);
            const esMovimientoRetroactivo = fechaMovimiento < hoy;
            
            await queryRunner.commitTransaction();
            
            if (esMovimientoRetroactivo) {
                console.log(`🔄 Detectado movimiento retroactivo. Ejecutando recálculo automático para fecha: ${fechaMovimiento.toISOString().split('T')[0]}`);
                try {
                    // Ejecutar recálculo automático para movimientos retroactivos
                    await this.kardexService.procesarMovimientoRetroactivo(
                        personaId,
                        fechaMovimiento,
                        movimientoCreado.id,
                        metodoValoracionFinal
                    );
                    console.log(`✅ Recálculo automático completado exitosamente`);
                    
                    // Invalidar caché de stock para todos los inventarios afectados
                    // Esto es necesario porque el cálculo dinámico usa caché y los movimientos retroactivos
                    // pueden afectar el stock calculado de fechas posteriores
                    const inventariosAfectados = new Set<number>();
                    
                    // Recopilar todos los inventarios afectados de los detalles
                    if (createComprobanteDto.detalles) {
                        for (const detalle of createComprobanteDto.detalles) {
                            if (detalle.idInventario) {
                                inventariosAfectados.add(detalle.idInventario);
                            }
                        }
                    }
                    
                    // Invalidar caché para cada inventario afectado
                     // Esto forzará el recálculo dinámico en las próximas consultas
                     for (const idInventario of inventariosAfectados) {
                         this.stockCacheService.invalidateInventario(idInventario);
                         console.log(`🗑️ Caché invalidado para inventario: ${idInventario}`);
                     }
                } catch (error) {
                    console.error(`❌ Error en recálculo automático:`, error.message);
                    // No lanzamos el error para no afectar el registro del comprobante
                    // El recálculo se puede ejecutar manualmente si es necesario
                }
            }
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Obtiene el siguiente correlativo para una persona y tipo de operación
     * @param tipoOperacion - Tipo de operación
     * @param personaId - ID de la persona/empresa
     * @returns Siguiente correlativo disponible
     */
    async getNextCorrelativo(tipoOperacion: TipoOperacion, personaId: number): Promise<{ correlativo: string }> {
        let correlativo = await this.findOrCreateCorrelativo(tipoOperacion, personaId);
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
            relations: ['totales', 'persona'] 
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    async existDetails(createComprobanteDto: CreateComprobanteDto): Promise<boolean> {
        return (
            createComprobanteDto.detalles !== undefined &&
            createComprobanteDto.detalles !== null &&
            Array.isArray(createComprobanteDto.detalles) &&
            createComprobanteDto.detalles.length > 0
        );
    }

    /**
     * Obtiene todos los comprobantes de tipo COMPRA filtrados por empresa
     * @param personaId ID de la empresa (Persona)
     * @returns Lista de comprobantes de compra de la empresa
     */
    async findCompras(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { 
                tipoOperacion: TipoOperacion.COMPRA,
                persona: { id: personaId }
            },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Obtiene todos los comprobantes de tipo VENTA filtrados por empresa
     * @param personaId ID de la empresa (Persona)
     * @returns Lista de comprobantes de venta de la empresa
     */
    async findVentas(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { 
                tipoOperacion: TipoOperacion.VENTA,
                persona: { id: personaId }
            },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
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