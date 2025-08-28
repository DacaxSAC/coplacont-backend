import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Comprobante } from '../entities/comprobante';
import { TipoOperacion } from '../enum/tipo-operacion.enum';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';
import { ResponseComprobanteWithDetallesDto } from '../dto/comprobante/response-comprobante-with-detalles.dto';

@Injectable()
export class VentasService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>
    ) {}

    /**
     * Obtiene todos los comprobantes de tipo VENTA para una empresa específica
     * @param personaId - ID de la empresa
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes de venta
     */
    async findAll(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { 
                tipoOperacion: TipoOperacion.VENTA,
                persona: { id: personaId }
            },
            relations: ['totales', 'persona', 'detalles'],
            order: { fechaRegistro: 'DESC' }
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca un comprobante de venta por su ID para una empresa específica
     * @param id - ID del comprobante
     * @param personaId - ID de la empresa
     * @returns Promise<ResponseComprobanteWithDetallesDto | null> Comprobante encontrado o null
     */
    async findById(id: number, personaId: number): Promise<ResponseComprobanteWithDetallesDto | null> {
        const comprobante = await this.comprobanteRepository.findOne({
            where: { 
                idComprobante: id,
                tipoOperacion: TipoOperacion.VENTA,
                persona: { id: personaId }
            },
            relations: ['totales', 'persona', 'detalles', 'detalles.producto']
        });
        
        if (!comprobante) {
            return null;
        }
        
        return plainToInstance(ResponseComprobanteWithDetallesDto, comprobante, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de venta por rango de fechas para una empresa específica
     * @param fechaInicio - Fecha de inicio del rango
     * @param fechaFin - Fecha de fin del rango
     * @param personaId - ID de la empresa
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes en el rango
     */
    async findByDateRange(fechaInicio: Date, fechaFin: Date, personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('persona.id = :personaId', { personaId })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de venta por cliente para una empresa específica
     * @param clienteId - ID del cliente
     * @param personaId - ID de la empresa
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes del cliente
     */
    async findByCliente(clienteId: number, personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .leftJoinAndSelect('comprobante.entidad', 'entidad')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('persona.id = :personaId', { personaId })
            .andWhere('entidad.id = :clienteId', { clienteId })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Obtiene el total de ventas en un rango de fechas para una empresa específica
     * @param fechaInicio - Fecha de inicio del rango
     * @param fechaFin - Fecha de fin del rango
     * @param personaId - ID de la empresa
     * @returns Promise<number> Total de ventas en el período
     */
    async getTotalVentasByDateRange(fechaInicio: Date, fechaFin: Date, personaId: number): Promise<number> {
        const result = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoin('comprobante.totales', 'totales')
            .leftJoin('comprobante.persona', 'persona')
            .select('SUM(totales.totalGeneral)', 'total')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('persona.id = :personaId', { personaId })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .getRawOne();
        
        return parseFloat(result.total) || 0;
    }
}