import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateInventarioDto, UpdateInventarioDto, ResponseInventarioDto } from '../dto';
import { InventarioRepository } from '../repository';
import { Inventario } from '../entities/inventario.entity';

@Injectable()
export class InventarioService {

    constructor(
        private readonly inventarioRepository: InventarioRepository
    ) {}


    async create(createInventarioDto: CreateInventarioDto): Promise<ResponseInventarioDto> {
        const { idAlmacen, idProducto, stockActual } = createInventarioDto;

        await this.validateAlmacenExists(idAlmacen);
        await this.validateProductoExists(idProducto);
        await this.validateInventarioNotExists(idAlmacen, idProducto);

        const almacen = await this.inventarioRepository.findAlmacenById(idAlmacen);
        const producto = await this.inventarioRepository.findProductoById(idProducto);

        const inventario = await this.inventarioRepository.create({
            stockActual,
            almacen: almacen!,
            producto: producto!
        });

        return this.mapToResponseDto(inventario);
    }


    async findAll(): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioRepository.findAll();
        return inventarios.map(inventario => this.mapToResponseDto(inventario));
    }


    async findOne(id: number): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioRepository.findById(id);
        if (!inventario) {
            throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
        }
        return this.mapToResponseDto(inventario);
    }


    async findByAlmacen(idAlmacen: number): Promise<ResponseInventarioDto[]> {
        await this.validateAlmacenExists(idAlmacen);
        const inventarios = await this.inventarioRepository.findByAlmacen(idAlmacen);
        return inventarios.map(inventario => this.mapToResponseDto(inventario));
    }


    async findByProducto(idProducto: number): Promise<ResponseInventarioDto[]> {
        await this.validateProductoExists(idProducto);
        const inventarios = await this.inventarioRepository.findByProducto(idProducto);
        return inventarios.map(inventario => this.mapToResponseDto(inventario));
    }

    async findByAlmacenAndProducto(idAlmacen: number, idProducto: number): Promise<ResponseInventarioDto> {
        const inventario = await this.inventarioRepository.findByAlmacenAndProducto(idAlmacen, idProducto);
        if (!inventario) {
            throw new NotFoundException(`No se encontró inventario para el producto ${idProducto} en el almacén ${idAlmacen}`);
        }
        return this.mapToResponseDto(inventario);
    }


    async findLowStock(idAlmacen?: number): Promise<ResponseInventarioDto[]> {
        const inventarios = await this.inventarioRepository.findLowStock(idAlmacen);
        return inventarios.map(inventario => this.mapToResponseDto(inventario));
    }


    async update(id: number, updateInventarioDto: UpdateInventarioDto): Promise<ResponseInventarioDto> {
        const inventario = await this.getInventarioById(id);
        const { idAlmacen, idProducto, stockActual } = updateInventarioDto;

        await this.validateUpdateData(inventario, idAlmacen, idProducto, id);

        if (idAlmacen && idAlmacen !== inventario.almacen.id) {
            const almacen = await this.inventarioRepository.findAlmacenById(idAlmacen);
            inventario.almacen = almacen!;
        }

        if (idProducto && idProducto !== inventario.producto.id) {
            const producto = await this.inventarioRepository.findProductoById(idProducto);
            inventario.producto = producto!;
        }

        if (stockActual !== undefined) {
            this.validateStockValue(stockActual);
            inventario.stockActual = stockActual;
        }

        const updatedInventario = await this.inventarioRepository.update(inventario);
        return this.mapToResponseDto(updatedInventario);
    }

    async updateStock(id: number, cantidad: number): Promise<ResponseInventarioDto> {
        const inventario = await this.getInventarioById(id);
        const nuevoStock = inventario.stockActual + cantidad;

        if (nuevoStock < 0) {
            throw new BadRequestException(
                `No hay suficiente stock. Stock actual: ${inventario.stockActual}, cantidad solicitada: ${Math.abs(cantidad)}`
            );
        }

        inventario.stockActual = nuevoStock;
        const updatedInventario = await this.inventarioRepository.update(inventario);
        return this.mapToResponseDto(updatedInventario);
    }

    async remove(id: number): Promise<{ message: string }> {
        const inventario = await this.getInventarioById(id);
        
        if (inventario.inventarioLotes && inventario.inventarioLotes.length > 0) {
            throw new BadRequestException('No se puede eliminar el inventario porque tiene lotes asociados');
        }

        await this.inventarioRepository.remove(inventario);
        return { message: `Inventario con ID ${id} eliminado correctamente` };
    }

 
    async getResumenByAlmacen(idAlmacen: number): Promise<any> {
        const inventarios = await this.inventarioRepository.findByAlmacen(idAlmacen);
        
        const totalProductos = inventarios.length;
        const stockBajo = inventarios.filter(inv => inv.stockActual <= inv.producto.stockMinimo).length;
        const sinStock = inventarios.filter(inv => inv.stockActual === 0).length;
        const valorTotal = inventarios.reduce((total, inv) => {
            return total + (inv.stockActual * (inv.producto.precio || 0));
        }, 0);

        return {
            almacen: inventarios[0]?.almacen || null,
            totalProductos,
            stockBajo,
            sinStock,
            valorTotal: parseFloat(valorTotal.toFixed(2))
        };
    }

    private async validateAlmacenExists(idAlmacen: number): Promise<void> {
        const almacen = await this.inventarioRepository.findAlmacenById(idAlmacen);
        if (!almacen) {
            throw new NotFoundException(`Almacén con ID ${idAlmacen} no encontrado o inactivo`);
        }
    }

    private async validateProductoExists(idProducto: number): Promise<void> {
        const producto = await this.inventarioRepository.findProductoById(idProducto);
        if (!producto) {
            throw new NotFoundException(`Producto con ID ${idProducto} no encontrado o inactivo`);
        }
    }

    private async validateInventarioNotExists(idAlmacen: number, idProducto: number): Promise<void> {
        const exists = await this.inventarioRepository.existsByAlmacenAndProducto(idAlmacen, idProducto);
        if (exists) {
            throw new ConflictException(
                `Ya existe un registro de inventario para el producto ${idProducto} en el almacén ${idAlmacen}`
            );
        }
    }

    private async getInventarioById(id: number): Promise<Inventario> {
        const inventario = await this.inventarioRepository.findById(id);
        if (!inventario) {
            throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
        }
        return inventario;
    }

    private async validateUpdateData(
        inventario: Inventario, 
        idAlmacen?: number, 
        idProducto?: number, 
        excludeId?: number
    ): Promise<void> {
        if (idAlmacen && idAlmacen !== inventario.almacen.id) {
            await this.validateAlmacenExists(idAlmacen);
        }

        if (idProducto && idProducto !== inventario.producto.id) {
            await this.validateProductoExists(idProducto);
        }

        if ((idAlmacen && idAlmacen !== inventario.almacen.id) || 
            (idProducto && idProducto !== inventario.producto.id)) {
            const finalAlmacenId = idAlmacen || inventario.almacen.id;
            const finalProductoId = idProducto || inventario.producto.id;
            
            const exists = await this.inventarioRepository.existsByAlmacenAndProductoExcludingId(
                finalAlmacenId, 
                finalProductoId, 
                excludeId!
            );
            
            if (exists) {
                throw new ConflictException(
                    'Ya existe un registro de inventario para esta combinación de almacén y producto'
                );
            }
        }
    }

    private validateStockValue(stock: number): void {
        if (stock < 0) {
            throw new BadRequestException('El stock no puede ser negativo');
        }
    }

    private mapToResponseDto(inventario: Inventario): ResponseInventarioDto {
        return plainToInstance(ResponseInventarioDto, inventario, {
            excludeExtraneousValues: true
        });
    }
}