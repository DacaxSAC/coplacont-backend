import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Comprobante } from '../entities/comprobante';
import { TipoOperacion } from '../enum/tipo-operacion.enum';
import { ResponseComprobanteDto } from '../dto/comprobante/response-comprobante.dto';

@Injectable()
export class ComprasService {

    constructor(
        @InjectRepository(Comprobante)
        private readonly comprobanteRepository: Repository<Comprobante>
    ) {}

    /**
     * Obtiene todos los comprobantes de tipo COMPRA filtrados por empresa
     * @param personaId ID de la empresa (Persona)
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes de compra
     */
    async findAll(personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository.find({
            where: { 
                tipoOperacion: TipoOperacion.COMPRA,
                persona: { id: personaId }
            },
            relations: [
                'totales', 
                'persona', 
                'detalles', 
                'detalles.inventario'
            ],
            order: { fechaRegistro: 'DESC' }
        });
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca un comprobante de compra por su ID filtrado por empresa
     * @param id - ID del comprobante
     * @param personaId - ID de la empresa (Persona)
     * @returns Promise<ResponseComprobanteDto | null> Comprobante encontrado o null
     */
    async findById(id: number, personaId: number): Promise<ResponseComprobanteDto | null> {
        const comprobante = await this.comprobanteRepository.findOne({
            where: { 
                idComprobante: id, 
                tipoOperacion: TipoOperacion.COMPRA,
                persona: { id: personaId }
            },
            relations: [
                'totales', 
                'persona', 
                'detalles', 
                'detalles.inventario'
            ]
        });
        
        if (!comprobante) {
            return null;
        }
        
        return plainToInstance(ResponseComprobanteDto, comprobante, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de compra por rango de fechas filtrados por empresa
     * @param fechaInicio - Fecha de inicio del rango
     * @param fechaFin - Fecha de fin del rango
     * @param personaId - ID de la empresa (Persona)
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes en el rango
     */
    async findByDateRange(fechaInicio: Date, fechaFin: Date, personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .leftJoinAndSelect('detalles.inventario', 'inventario')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.COMPRA })
            .andWhere('comprobante.fechaEmision >= :fechaInicio', { fechaInicio })
            .andWhere('comprobante.fechaEmision <= :fechaFin', { fechaFin })
            .andWhere('persona.id = :personaId', { personaId })
            .orderBy('comprobante.fechaRegistro', 'DESC')
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }

    /**
     * Busca comprobantes de compra por proveedor filtrados por empresa
     * @param proveedorId - ID del proveedor
     * @param personaId - ID de la empresa (Persona)
     * @returns Promise<ResponseComprobanteDto[]> Lista de comprobantes del proveedor
     */
    async findByProveedor(proveedorId: number, personaId: number): Promise<ResponseComprobanteDto[]> {
        const comprobantes = await this.comprobanteRepository
            .createQueryBuilder('comprobante')
            .leftJoinAndSelect('comprobante.totales', 'totales')
            .leftJoinAndSelect('comprobante.persona', 'persona')
            .leftJoinAndSelect('comprobante.entidad', 'entidad')
            .leftJoinAndSelect('comprobante.detalles', 'detalles')
            .leftJoinAndSelect('detalles.inventario', 'inventario')
            .where('comprobante.tipoOperacion = :tipo', { tipo: TipoOperacion.COMPRA })
            .andWhere('persona.id = :personaId', { personaId })
            .andWhere('entidad.id = :proveedorId', { proveedorId })
            .orderBy('comprobante.fechaRegistro', 'DESC')
            .getMany();
        
        return plainToInstance(ResponseComprobanteDto, comprobantes, {
            excludeExtraneousValues: true,
        });
    }
}