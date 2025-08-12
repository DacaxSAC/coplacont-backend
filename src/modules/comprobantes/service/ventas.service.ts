import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Comprobante } from '../entities/comprobante';
import { TipoOperacion } from '../enum/tipo-operacion.enum';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

@Injectable()
export class VentasService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>
    ) {}

    /**
     * Obtiene todos los comprobantes de tipo VENTA
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes de venta
     */
    async findAll(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.VENTA },
            relations: ['totales', 'persona', 'detalles']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca un comprobante de venta por su ID
     * @param id - ID del comprobante
     * @returns Promise<ResponseComprobanteDto | null> Comprobante encontrado o null
     */
    async findById(id: number): Promise<ResponseComprobanteDto | null> {
        const comprobante = await this.comprobanteRepository.findOne({
            where: { 
                idComprobante: id,
                tipoOperacion: TipoOperacion.VENTA 
            },
            relations: ['totales', 'persona', 'detalles']
        });
        
        if (!comprobante) {
            return null;
        }
        
        return plainToInstance(ResponseComprobanteDto, comprobante, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de venta por rango de fechas
     * @param fechaInicio - Fecha de inicio del rango
     * @param fechaFin - Fecha de fin del rango
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes en el rango
     */
    async findByDateRange(fechaInicio: Date, fechaFin: Date): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de venta por cliente
     * @param personaId - ID del cliente
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes del cliente
     */
    async findByCliente(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('persona.id = :personaId', { personaId })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Obtiene el total de ventas en un rango de fechas
     * @param fechaInicio - Fecha de inicio del rango
     * @param fechaFin - Fecha de fin del rango
     * @returns Promise<number> Total de ventas en el período
     */
    async getTotalVentasByDateRange(fechaInicio: Date, fechaFin: Date): Promise<number> {
        const result = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoin('comprobante.totales', 'totales')
            .select('SUM(totales.totalVenta)', 'total')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.VENTA })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .getRawOne();
        
        return parseFloat(result.total) || 0;
    }
}