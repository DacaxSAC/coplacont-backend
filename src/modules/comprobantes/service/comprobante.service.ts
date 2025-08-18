import { Injectable } from "@nestjs/common";
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
        private readonly loteService: LoteService
    ) { }

    @Transactional()
    private async findOrCreateCorrelativo(tipoOperacion: TipoOperacion) {
        let correlativo = await this.correlativoRepository
            .createQueryBuilder('c')
            .setLock('pessimistic_write')
            .where('c.tipo = :tipo', { tipo: tipoOperacion })
            .getOne();

        if (!correlativo) {
            correlativo = this.correlativoRepository.create({
                tipo: tipoOperacion,
                ultimoNumero: 0,
            });
            await this.correlativoRepository.save(correlativo);
        }

        return correlativo;
    }

    @Transactional()
    async register(createComprobanteDto: CreateComprobanteDto): Promise<void> {
        console.log(`🔄 Iniciando registro de comprobante: Tipo=${createComprobanteDto.tipoOperacion}`);
        
        //Busca entidad dueña del idPersona
        const entidad = await this.personaService.findEntity(createComprobanteDto.idPersona);
        console.log('Entidad relacionada a comprobante:', entidad);
        // Crea instancia de comprobante
        const comprobante = this.comprobanteRepository.create(createComprobanteDto);
        comprobante.persona = entidad;
        // Asigna correlativo
        const correlativo = await this.findOrCreateCorrelativo(createComprobanteDto.tipoOperacion);
        correlativo.ultimoNumero += 1;
        await this.correlativoRepository.save(correlativo);
        comprobante.correlativo = `corr-${correlativo.ultimoNumero}`;
        //Guarda el comprobante
        const comprobanteSaved = await this.comprobanteRepository.save(comprobante);
        console.log(`✅ Comprobante creado: ID=${comprobanteSaved.idComprobante}, Correlativo=${comprobanteSaved.correlativo}`);
        
        let costosUnitarios: number[] = [];
        let precioYcantidadPorLote: {idLote: number, costoUnitarioDeLote: number, cantidad: number}[] = [];
        //Verifica si el comprobante tiene detalles
        if (await this.existDetails(createComprobanteDto)) {
            //Registra detalles
            const detallesSaved = await this.comprobanteDetalleService.register(comprobanteSaved.idComprobante, createComprobanteDto.detalles!);

            comprobanteSaved.detalles = detallesSaved;

            console.log(`✅ Detalles registrados: ${detallesSaved.length} detalles`);
            
            // Procesar lotes según el tipo de operación y método de valoración
            const metodoValoracion = MetodoValoracion.FIFO; // createComprobanteDto.metodoValoracion || MetodoValoracion.PROMEDIO;
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
                console.log(`✅ Lotes validados correctamente para compra ${comprobanteSaved.idComprobante}`);
            }
        }
        
        // Crear movimiento con costo promedio ponderado
        const movimientoDto = await this.movimientoFactory.createMovimientoFromComprobante(comprobanteSaved, costosUnitarios, precioYcantidadPorLote);
        this.movimientoService.create(movimientoDto);
        console.log(`✅ Movimiento creado para comprobante ${comprobanteSaved.idComprobante}`);
    }

    @Transactional()
    async getNextCorrelativo(tipoOperacion: TipoOperacion): Promise<{ correlativo: string }> {
        let correlativo = await this.findOrCreateCorrelativo(tipoOperacion);
        return { correlativo: `corr-${correlativo.ultimoNumero + 1}` };
    }

    async findAll(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({ relations: ['totales'] });
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
     * Obtiene todos los comprobantes de tipo COMPRA
     * @returns Lista de comprobantes de compra
     */
    async findCompras(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.COMPRA },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Obtiene todos los comprobantes de tipo VENTA
     * @returns Lista de comprobantes de venta
     */
    async findVentas(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.VENTA },
            relations: ['totales', 'persona']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

}