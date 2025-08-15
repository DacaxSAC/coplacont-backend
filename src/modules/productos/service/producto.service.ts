import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Producto } from '../entities/producto.entity';
import { Categoria } from '../entities/categoria.entity';
import { CreateProductoDto, UpdateProductoDto, ResponseProductoDto } from '../dto';
import { TipoProducto } from '../enum/tipo-producto.enum';

/**
 * Servicio para gestionar las operaciones CRUD de productos
 * Maneja la lógica de negocio relacionada con los productos
 */
@Injectable()
export class ProductoService {

    constructor(
        @InjectRepository(Producto)
        private readonly productoRepository: Repository<Producto>,
        @InjectRepository(Categoria)
        private readonly categoriaRepository: Repository<Categoria>
    ) {}

    /**
     * Crear un nuevo producto
     * @param createProductoDto - Datos para crear el producto
     * @returns Promise<ResponseProductoDto> - Producto creado
     */
    async create(createProductoDto: CreateProductoDto): Promise<ResponseProductoDto> {
        // Verificar que la categoría existe y está activa
        const categoria = await this.categoriaRepository.findOne({
            where: { id: createProductoDto.idCategoria, estado: true }
        });

        if (!categoria) {
            throw new BadRequestException('La categoría especificada no existe o está inactiva');
        }

        let codigo = createProductoDto.codigo;

        // Autogenerar código si no se proporciona
        if (!codigo) {
            codigo = await this.generateProductCode(categoria.nombre, createProductoDto.tipo);
        } else {
            // Verificar si ya existe un producto con el mismo código (si se proporciona)
            const existingProducto = await this.productoRepository.findOne({
                where: { codigo }
            });

            if (existingProducto) {
                throw new ConflictException('Ya existe un producto con este código');
            }
        }

        // Crear nuevo producto
        const producto = this.productoRepository.create({
            ...createProductoDto,
            codigo,
            categoria,
            estado: createProductoDto.estado ?? true,
            stockMinimo: createProductoDto.stockMinimo ?? 0
        });

        const savedProducto = await this.productoRepository.save(producto);
        
        // Cargar el producto con la relación de categoría
        const productoWithCategoria = await this.productoRepository.findOne({
            where: { id: savedProducto.id },
            relations: ['categoria']
        });

        return plainToClass(ResponseProductoDto, productoWithCategoria, { excludeExtraneousValues: true });
    }

    /**
     * Obtener todos los productos
     * @param includeInactive - Incluir productos inactivos (opcional)
     * @param tipo - Filtrar por tipo de ítem (PRODUCTO | SERVICIO)
     * @returns Promise<ResponseProductoDto[]> - Lista de productos
     */
    async findAll(includeInactive: boolean = false, tipo?: TipoProducto): Promise<ResponseProductoDto[]> {
        const queryBuilder = this.productoRepository
            .createQueryBuilder('producto')
            .leftJoinAndSelect('producto.categoria', 'categoria');

        if (!includeInactive) {
            queryBuilder.where('producto.estado = :estado', { estado: true });
        }

        if (tipo) {
            queryBuilder.andWhere('producto.tipo = :tipo', { tipo });
        }

        queryBuilder.orderBy('producto.descripcion', 'ASC');

        const productos = await queryBuilder.getMany();
        return productos.map(producto => 
            plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true })
        );
    }

    /**
     * Obtener un producto por ID
     * @param id - ID del producto
     * @returns Promise<ResponseProductoDto> - Producto encontrado
     */
    async findOne(id: number): Promise<ResponseProductoDto> {
        const producto = await this.productoRepository.findOne({
            where: { id },
            relations: ['categoria']
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true });
    }

    /**
     * Actualizar un producto
     * @param id - ID del producto a actualizar
     * @param updateProductoDto - Datos para actualizar
     * @returns Promise<ResponseProductoDto> - Producto actualizado
     */
    async update(id: number, updateProductoDto: UpdateProductoDto): Promise<ResponseProductoDto> {
        const producto = await this.productoRepository.findOne({
            where: { id },
            relations: ['categoria']
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        // Verificar la categoría si se está cambiando
        if (updateProductoDto.idCategoria && updateProductoDto.idCategoria !== producto.categoria.id) {
            const categoria = await this.categoriaRepository.findOne({
                where: { id: updateProductoDto.idCategoria, estado: true }
            });

            if (!categoria) {
                throw new BadRequestException('La categoría especificada no existe o está inactiva');
            }

            producto.categoria = categoria;
        }

        // Verificar si el nuevo código ya existe (si se está cambiando)
        if (updateProductoDto.codigo && updateProductoDto.codigo !== producto.codigo) {
            const existingProducto = await this.productoRepository.findOne({
                where: { codigo: updateProductoDto.codigo }
            });

            if (existingProducto) {
                throw new ConflictException('Ya existe un producto con este código');
            }
        }

        // Actualizar producto (excluyendo idCategoria ya que se maneja por separado)
        const { idCategoria, ...updateData } = updateProductoDto;
        Object.assign(producto, updateData);
        
        const updatedProducto = await this.productoRepository.save(producto);

        // Recargar con relaciones
        const productoWithCategoria = await this.productoRepository.findOne({
            where: { id: updatedProducto.id },
            relations: ['categoria']
        });

        return plainToClass(ResponseProductoDto, productoWithCategoria, { excludeExtraneousValues: true });
    }

    /**
     * Eliminar un producto (soft delete)
     * @param id - ID del producto a eliminar
     * @returns Promise<void>
     */
    async remove(id: number): Promise<void> {
        const producto = await this.productoRepository.findOne({
            where: { id }
        });

        if (!producto) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        // Soft delete - cambiar estado a false
        producto.estado = false;
        await this.productoRepository.save(producto);
    }

    /**
     * Buscar productos por descripción
     * @param descripcion - Descripción a buscar
     * @param tipo - Filtrar por tipo de ítem (PRODUCTO | SERVICIO)
     * @returns Promise<ResponseProductoDto[]> - Productos encontrados
     */
    async findByDescription(descripcion: string, tipo?: TipoProducto): Promise<ResponseProductoDto[]> {
        const queryBuilder = this.productoRepository
            .createQueryBuilder('producto')
            .leftJoinAndSelect('producto.categoria', 'categoria')
            .where('producto.descripcion ILIKE :descripcion', { descripcion: `%${descripcion}%` })
            .andWhere('producto.estado = :estado', { estado: true });

        if (tipo) {
            queryBuilder.andWhere('producto.tipo = :tipo', { tipo });
        }

        const productos = await queryBuilder
            .orderBy('producto.descripcion', 'ASC')
            .getMany();

        return productos.map(producto => 
            plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true })
        );
    }

    /**
     * Buscar productos por nombre
     * @param nombre - Nombre a buscar
     * @param tipo - Filtrar por tipo de ítem (PRODUCTO | SERVICIO)
     * @returns Promise<ResponseProductoDto[]> - Productos encontrados
     */
    async findByName(nombre: string, tipo?: TipoProducto): Promise<ResponseProductoDto[]> {
        const queryBuilder = this.productoRepository
            .createQueryBuilder('producto')
            .leftJoinAndSelect('producto.categoria', 'categoria')
            .where('producto.nombre IS NOT NULL')
            .andWhere('producto.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
            .andWhere('producto.estado = :estado', { estado: true });

        if (tipo) {
            queryBuilder.andWhere('producto.tipo = :tipo', { tipo });
        }

        const productos = await queryBuilder
            .orderBy('producto.nombre', 'ASC')
            .getMany();

        return productos.map(producto => 
            plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true })
        );
    }

    /**
     * Buscar productos por categoría
     * @param categoriaId - ID de la categoría
     * @param tipo - Filtrar por tipo de ítem (PRODUCTO | SERVICIO)
     * @returns Promise<ResponseProductoDto[]> - Productos de la categoría
     */
    async findByCategory(categoriaId: number, tipo?: TipoProducto): Promise<ResponseProductoDto[]> {
        const queryBuilder = this.productoRepository
            .createQueryBuilder('producto')
            .leftJoinAndSelect('producto.categoria', 'categoria')
            .where('categoria.id = :categoriaId', { categoriaId })
            .andWhere('producto.estado = :estado', { estado: true });

        if (tipo) {
            queryBuilder.andWhere('producto.tipo = :tipo', { tipo });
        }

        const productos = await queryBuilder
            .orderBy('producto.descripcion', 'ASC')
            .getMany();

        return productos.map(producto => 
            plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true })
        );
    }

    /**
     * Buscar productos con stock bajo
     * @param tipo - Filtrar por tipo de ítem (PRODUCTO | SERVICIO)
     * @returns Promise<ResponseProductoDto[]> - Productos con stock bajo
     */
    async findLowStock(tipo?: TipoProducto): Promise<ResponseProductoDto[]> {
        const queryBuilder = this.productoRepository
            .createQueryBuilder('producto')
            .leftJoinAndSelect('producto.categoria', 'categoria')
            .where('producto.stockMinimo > 0')
            .andWhere('producto.estado = :estado', { estado: true });

        if (tipo) {
            queryBuilder.andWhere('producto.tipo = :tipo', { tipo });
        }

        const productos = await queryBuilder
            .orderBy('producto.descripcion', 'ASC')
            .getMany();

        return productos.map(producto => 
            plainToClass(ResponseProductoDto, producto, { excludeExtraneousValues: true })
        );
    }

    /**
     * Genera un código único para el producto
     * Formato: [PREFIJO_CATEGORIA]-[TIPO]-[NUMERO_SECUENCIAL]
     */
    private async generateProductCode(categoriaNombre: string, tipo: TipoProducto): Promise<string> {
        // Crear prefijo de categoría (primeras 3 letras en mayúsculas)
        const categoriaPrefix = categoriaNombre
            .replace(/[^a-zA-Z]/g, '') // Remover caracteres especiales
            .substring(0, 3)
            .toUpperCase()
            .padEnd(3, 'X'); // Rellenar con X si es menor a 3 caracteres

        // Prefijo de tipo
        const tipoPrefix = tipo === TipoProducto.PRODUCTO ? 'PROD' : 'SERV';

        // Buscar el último número secuencial para esta combinación
        const lastProduct = await this.productoRepository
            .createQueryBuilder('producto')
            .where('producto.codigo LIKE :pattern', { 
                pattern: `${categoriaPrefix}-${tipoPrefix}-%` 
            })
            .orderBy('producto.codigo', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastProduct && lastProduct.codigo) {
            // Extraer el número del último código
            const match = lastProduct.codigo.match(/-([0-9]+)$/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        // Formatear número con ceros a la izquierda (4 dígitos)
        const formattedNumber = nextNumber.toString().padStart(4, '0');

        return `${categoriaPrefix}-${tipoPrefix}-${formattedNumber}`;
    }
}