import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Comprobante } from '../entities/comprobante';
import { TipoOperacion } from '../enum/tipo-operacion.enum';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

/**
 * Servicio especializado para el manejo de comprobantes de compra
 * Proporciona métodos específicos para operaciones relacionadas con compras
 */
@Injectable()
export class ComprasService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>
    ) {}

    /**
     * Obtiene todos los comprobantes de tipo COMPRA
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes de compra
     */
    async findAll(): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { tipoOperacion: TipoOperacion.COMPRA },
            relations: ['totales', 'persona', 'detalles']
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca un comprobante de compra por su ID
     * @param id - ID del comprobante
     * @returns Promise<ResponseComprobanteDto | null> Comprobante encontrado o null
     */
    async findById(id: number): Promise<ResponseComprobanteDto | null> {
        const comprobante = await this.comprobanteRepository.findOne({
            where: { 
                idComprobante: id,
                tipoOperacion: TipoOperacion.COMPRA 
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
     * Busca comprobantes de compra por rango de fechas
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
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.COMPRA })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de compra por proveedor
     * @param personaId - ID del proveedor
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes del proveedor
     */
    async findByProveedor(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.COMPRA })
            .andWhere('persona.id = :personaId', { personaId })
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }
}