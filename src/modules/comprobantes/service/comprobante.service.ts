import { Injectable, BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Comprobante } from "../entities/comprobante";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateComprobanteDto } from "../dto/comprobante/create-comprobante.dto";
import { EntidadService } from "src/modules/entidades/services";
import { Transactional } from "typeorm-transactional";
import { ComprobanteDetalleService } from "./comprobante-detalle.service";
import { ResponseComprobanteDto } from "../dto/comprobante/response-comprobante.dto";
import { plainToInstance } from "class-transformer";
import { TipoOperacion } from "../enum/tipo-operacion.enum";
import { MetodoValoracion } from "../enum/metodo-valoracion.enum";
import { Correlativo } from "../entities/correlativo";
import { MovimientosService } from "src/modules/movimientos";
import { MovimientoFactory } from "src/modules/movimientos/factory/MovimientoFactory";
import { LoteService } from "src/modules/inventario/service/lote.service";
import { PeriodoContableService } from "src/modules/periodos/service";

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
        private readonly loteService: LoteService,
        private readonly periodoContableService: PeriodoContableService
    ) { }

    /**
     * Busca o crea un correlativo para una persona y tipo de operación específicos
     * @param tipoOperacion - Tipo de operación (COMPRA, VENTA, etc.)
     * @param personaId - ID de la persona/empresa
     * @returns Correlativo encontrado o creado
     */
    @Transactional()
    private async findOrCreateCorrelativo(tipoOperacion: TipoOperacion, personaId: number) {
        console.log(`🔍 Buscando correlativo para tipo: ${tipoOperacion}, persona: ${personaId}`);
        
        let correlativo = await this.correlativoRepository
            .createQueryBuilder('c')
            .setLock('pessimistic_write')
            .where('c.tipo = :tipo AND c.personaId = :personaId', { 
                tipo: tipoOperacion, 
                personaId: personaId 
            })
            .getOne();

        if (!correlativo) {
            console.log(`📝 Creando nuevo correlativo para tipo: ${tipoOperacion}, persona: ${personaId}`);
            correlativo = this.correlativoRepository.create({
                tipo: tipoOperacion,
                personaId: personaId,
                ultimoNumero: 0,
            });
            await this.correlativoRepository.save(correlativo);
            console.log(`✅ Correlativo creado con ultimoNumero: ${correlativo.ultimoNumero}`);
        } else {
            console.log(`🔄 Correlativo encontrado con ultimoNumero: ${correlativo.ultimoNumero}`);
        }

        return correlativo;
    }

    @Transactional()
    async register(createComprobanteDto: CreateComprobanteDto, personaId: number): Promise<void> {
        console.log(`🔄 Iniciando registro de comprobante: Tipo=${createComprobanteDto.tipoOperacion}`);
        
        // Validar que la fecha de emisión esté dentro del período activo
        await this.validarPeriodoActivo(personaId, createComprobanteDto.fechaEmision);
        
        //Busca entidad cliente/proveedor
        const entidad = await this.personaService.findEntity(createComprobanteDto.idPersona);

        // Crea instancia de comprobante
        const comprobante = this.comprobanteRepository.create(createComprobanteDto);
        comprobante.entidad = entidad;
        comprobante.persona = { id: personaId } as any; // Se asignará la Persona completa por TypeORM

        // Asigna correlativo (genera automáticamente si no se proporciona)
        if (!createComprobanteDto.correlativo) {
            console.log(`🎯 Generando correlativo automático para ${createComprobanteDto.tipoOperacion}`);
            const correlativo = await this.findOrCreateCorrelativo(createComprobanteDto.tipoOperacion, personaId);
            console.log(`📊 Correlativo antes del incremento: ${correlativo.ultimoNumero}`);
            correlativo.ultimoNumero += 1;
            console.log(`📈 Correlativo después del incremento: ${correlativo.ultimoNumero}`);
            await this.correlativoRepository.save(correlativo);
            console.log(`💾 Correlativo guardado en BD`);
            comprobante.correlativo = `corr-${correlativo.ultimoNumero}`;
            console.log(`🏷️ Correlativo asignado al comprobante: ${comprobante.correlativo}`);
        } else {
            console.log(`📝 Usando correlativo manual: ${createComprobanteDto.correlativo}`);
            comprobante.correlativo = createComprobanteDto.correlativo;
        }

        //Guarda el comprobante
        const comprobanteSaved = await this.comprobanteRepository.save(comprobante);
        
        let costosUnitarios: number[] = [];
        let precioYcantidadPorLote: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];

        //Verifica si el comprobante tiene detalles
        if (await this.existDetails(createComprobanteDto)) {
            //Registra detalles
            const detallesSaved = await this.comprobanteDetalleService.register(comprobanteSaved.idComprobante, createComprobanteDto.detalles!);

            comprobanteSaved.detalles = detallesSaved;
            
            // Obtener método de valoración desde la configuración del período
            const configuracionPeriodo = await this.periodoContableService.obtenerConfiguracion(personaId);
            const metodoValoracion = createComprobanteDto.metodoValoracion || configuracionPeriodo.metodoCalculoCosto;
            const {costoUnitario, lotes} = await this.loteService.procesarLotesComprobante(detallesSaved, createComprobanteDto.tipoOperacion, metodoValoracion);
            costosUnitarios = costoUnitario;
            precioYcantidadPorLote = lotes;
            
            // Validar que los lotes se crearon correctamente para compras
            if (createComprobanteDto.tipoOperacion === TipoOperacion.COMPRA) {
                console.log(`🔍 Validando lotes para compra ${comprobanteSaved.idComprobante}`);
                const lotesValidos = await this.loteService.validarLotesCompra(detallesSaved);
                if (!lotesValidos) {
                    throw new Error('Error al crear los lotes para la compra. Verifique los logs para más detalles.');
                }
            }
        }
        
        // Crear movimiento con costo promedio ponderado
        const movimientoDto = await this.movimientoFactory.createMovimientoFromComprobante(comprobanteSaved, costosUnitarios, precioYcantidadPorLote);
        this.movimientoService.create(movimientoDto);
        console.log(`✅ Movimiento creado para comprobante ${comprobanteSaved.idComprobante}`);
    }

    /**
     * Obtiene el siguiente correlativo para una persona y tipo de operación
     * @param tipoOperacion - Tipo de operación
     * @param personaId - ID de la persona/empresa
     * @returns Siguiente correlativo disponible
     */
    @Transactional()
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
     * Valida que la fecha esté dentro del período contable activo
     * @param personaId ID de la persona/empresa
     * @param fechaEmision Fecha de emisión del comprobante
     * @throws BadRequestException si la fecha no está en período activo
     */
    private async validarPeriodoActivo(personaId: number, fechaEmision: Date): Promise<void> {
        const validacion = await this.periodoContableService.validarFechaEnPeriodoActivo(
            personaId,
            fechaEmision
        );

        if (!validacion.valida) {
            throw new BadRequestException(
                validacion.mensaje || 'La fecha de emisión del comprobante no está dentro del período contable activo.'
            );
        }
    }

    /**
     * Valida que se puedan realizar movimientos retroactivos
     * @param personaId ID de la persona/empresa
     * @param fechaEmision Fecha de emisión del comprobante
     * @throws BadRequestException si no se permiten movimientos retroactivos
     */
    private async validarMovimientoRetroactivo(personaId: number, fechaEmision: Date): Promise<void> {
        const puedeHacerMovimientoRetroactivo = await this.periodoContableService.validarMovimientoRetroactivo(
            personaId,
            fechaEmision
        );

        if (!puedeHacerMovimientoRetroactivo) {
            throw new BadRequestException(
                'No se pueden registrar comprobantes con fechas retroactivas más allá del límite configurado. ' +
                'Contacte al administrador para ajustar la configuración de períodos.'
            );
        }
    }

    /**
     * Obtiene el período contable activo para una persona
     * @param personaId ID de la persona/empresa
     * @returns Período contable activo o null si no existe
     */
    async obtenerPeriodoActivo(personaId: number) {
        return await this.periodoContableService.obtenerPeriodoActivo(personaId);
    }

    /**
     * Valida que un comprobante pueda ser registrado en la fecha especificada
     * @param personaId ID de la persona/empresa
     * @param fechaEmision Fecha de emisión del comprobante
     * @returns true si el comprobante puede ser registrado
     */
    async validarRegistroComprobante(personaId: number, fechaEmision: Date): Promise<boolean> {
        try {
            await this.validarPeriodoActivo(personaId, fechaEmision);
            
            // Si la fecha es retroactiva, validar también los límites
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaComparar = new Date(fechaEmision);
            fechaComparar.setHours(0, 0, 0, 0);
            
            if (fechaComparar < hoy) {
                await this.validarMovimientoRetroactivo(personaId, fechaEmision);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

}