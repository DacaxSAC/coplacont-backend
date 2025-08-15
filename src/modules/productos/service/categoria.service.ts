import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Categoria } from '../entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto, ResponseCategoriaDto } from '../dto';
import { TipoCategoria } from '../enum/tipo-categoria.enum';

/**
 * Servicio para gestionar las operaciones CRUD de categorías
 * Maneja la lógica de negocio relacionada con las categorías de productos
 */
@Injectable()
export class CategoriaService {

    constructor(
        @InjectRepository(Categoria)
        private readonly categoriaRepository: Repository<Categoria>
    ) {}

    /**
     * Crear una nueva categoría
     * @param createCategoriaDto - Datos para crear la categoría
     * @returns Promise<ResponseCategoriaDto> - Categoría creada
     */
    async create(createCategoriaDto: CreateCategoriaDto): Promise<ResponseCategoriaDto> {
        // Verificar si ya existe una categoría con el mismo nombre
        const existingCategoria = await this.categoriaRepository.findOne({
            where: { nombre: createCategoriaDto.nombre }
        });

        if (existingCategoria) {
            throw new ConflictException('Ya existe una categoría con este nombre');
        }

        // Crear nueva categoría
        const categoria = this.categoriaRepository.create({
            ...createCategoriaDto,
            tipo: createCategoriaDto.tipo ?? TipoCategoria.PRODUCTO,
            estado: createCategoriaDto.estado ?? true
        });

        const savedCategoria = await this.categoriaRepository.save(categoria);
        return plainToClass(ResponseCategoriaDto, savedCategoria, { excludeExtraneousValues: true });
    }

    /**
     * Obtener todas las categorías
     * @param includeInactive - Incluir categorías inactivas (opcional)
     * @returns Promise<ResponseCategoriaDto[]> - Lista de categorías
     */
    async findAll(includeInactive: boolean = false): Promise<ResponseCategoriaDto[]> {
        const queryBuilder = this.categoriaRepository.createQueryBuilder('categoria');

        if (!includeInactive) {
            queryBuilder.where('categoria.estado = :estado', { estado: true });
        }

        queryBuilder.orderBy('categoria.nombre', 'ASC');

        const categorias = await queryBuilder.getMany();
        return categorias.map(categoria => 
            plainToClass(ResponseCategoriaDto, categoria, { excludeExtraneousValues: true })
        );
    }

    /**
     * Obtener una categoría por ID
     * @param id - ID de la categoría
     * @returns Promise<ResponseCategoriaDto> - Categoría encontrada
     */
    async findOne(id: number): Promise<ResponseCategoriaDto> {
        const categoria = await this.categoriaRepository.findOne({
            where: { id }
        });

        if (!categoria) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        }

        return plainToClass(ResponseCategoriaDto, categoria, { excludeExtraneousValues: true });
    }

    /**
     * Actualizar una categoría
     * @param id - ID de la categoría a actualizar
     * @param updateCategoriaDto - Datos para actualizar
     * @returns Promise<ResponseCategoriaDto> - Categoría actualizada
     */
    async update(id: number, updateCategoriaDto: UpdateCategoriaDto): Promise<ResponseCategoriaDto> {
        const categoria = await this.categoriaRepository.findOne({
            where: { id }
        });

        if (!categoria) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        }

        // Verificar si el nuevo nombre ya existe (si se está cambiando)
        if (updateCategoriaDto.nombre && updateCategoriaDto.nombre !== categoria.nombre) {
            const existingCategoria = await this.categoriaRepository.findOne({
                where: { nombre: updateCategoriaDto.nombre }
            });

            if (existingCategoria) {
                throw new ConflictException('Ya existe una categoría con este nombre');
            }
        }

        // Actualizar categoría
        Object.assign(categoria, updateCategoriaDto);
        const updatedCategoria = await this.categoriaRepository.save(categoria);

        return plainToClass(ResponseCategoriaDto, updatedCategoria, { excludeExtraneousValues: true });
    }

    /**
     * Eliminar una categoría (soft delete)
     * @param id - ID de la categoría a eliminar
     * @returns Promise<void>
     */
    async remove(id: number): Promise<void> {
        const categoria = await this.categoriaRepository.findOne({
            where: { id },
            relations: ['productos']
        });

        if (!categoria) {
            throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
        }

        // Verificar si la categoría tiene productos asociados
        if (categoria.productos && categoria.productos.length > 0) {
            throw new ConflictException('No se puede eliminar la categoría porque tiene productos asociados');
        }

        // Soft delete - cambiar estado a false
        categoria.estado = false;
        await this.categoriaRepository.save(categoria);
    }

    /**
     * Buscar categorías por nombre
     * @param nombre - Nombre a buscar
     * @returns Promise<ResponseCategoriaDto[]> - Categorías encontradas
     */
    async findByName(nombre: string): Promise<ResponseCategoriaDto[]> {
        const categorias = await this.categoriaRepository
            .createQueryBuilder('categoria')
            .where('categoria.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
            .andWhere('categoria.estado = :estado', { estado: true })
            .orderBy('categoria.nombre', 'ASC')
            .getMany();

        return categorias.map(categoria => 
            plainToClass(ResponseCategoriaDto, categoria, { excludeExtraneousValues: true })
        );
    }
}