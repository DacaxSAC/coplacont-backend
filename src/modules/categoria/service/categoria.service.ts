import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Categoria } from '../entities';
import {
  CreateCategoriaDto,
  UpdateCategoriaDto,
  ResponseCategoriaDto,
} from '../dto';
import { TipoCategoria } from '../enum';

/**
 * Servicio para gestionar las operaciones CRUD de categorías
 * Maneja la lógica de negocio relacionada con las categorías de productos
 */
@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  /**
   * Crear una nueva categoría
   * @param createCategoriaDto - Datos para crear la categoría
   * @param personaId - ID de la persona/empresa propietaria
   * @returns Promise<ResponseCategoriaDto> - Categoría creada
   */
  async create(
    createCategoriaDto: CreateCategoriaDto,
    personaId: number,
  ): Promise<ResponseCategoriaDto> {
    // Verificar si ya existe una categoría con el mismo nombre para esta persona
    const existingCategoria = await this.categoriaRepository.findOne({
      where: {
        nombre: createCategoriaDto.nombre,
        persona: { id: personaId },
      },
    });

    if (existingCategoria) {
      throw new ConflictException(
        'Ya existe una categoría con este nombre para esta empresa',
      );
    }

    // Crear nueva categoría
    const categoria = this.categoriaRepository.create({
      ...createCategoriaDto,
      tipo: createCategoriaDto.tipo ?? TipoCategoria.PRODUCTO,
      estado: createCategoriaDto.estado ?? true,
      persona: { id: personaId },
    });

    const savedCategoria = await this.categoriaRepository.save(categoria);
    return plainToClass(ResponseCategoriaDto, savedCategoria, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Obtener todas las categorías de una persona/empresa
   * @param personaId - ID de la persona/empresa
   * @param includeInactive - Si es true, incluye categorías inactivas. Por defecto false (solo activas)
   * @returns Promise<ResponseCategoriaDto[]> - Lista de categorías
   */
  async findAll(
    personaId: number,
    includeInactive: boolean = false,
  ): Promise<ResponseCategoriaDto[]> {
    const queryBuilder = this.categoriaRepository
      .createQueryBuilder('categoria')
      .where('categoria.persona.id = :personaId', { personaId });

    if (!includeInactive) {
      queryBuilder.andWhere('categoria.estado = :estado', { estado: true });
    }

    queryBuilder.orderBy('categoria.nombre', 'ASC');

    const categorias = await queryBuilder.getMany();
    return categorias.map((categoria) =>
      plainToClass(ResponseCategoriaDto, categoria, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Obtener una categoría por ID y persona
   * @param id - ID de la categoría
   * @param personaId - ID de la persona/empresa propietaria
   * @returns Promise<ResponseCategoriaDto> - Categoría encontrada
   */
  async findOne(id: number, personaId: number): Promise<ResponseCategoriaDto> {
    const categoria = await this.categoriaRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${id} no encontrada para esta empresa`,
      );
    }

    return plainToClass(ResponseCategoriaDto, categoria, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Actualizar una categoría
   * @param id - ID de la categoría a actualizar
   * @param updateCategoriaDto - Datos para actualizar
   * @param personaId - ID de la persona/empresa propietaria
   * @returns Promise<ResponseCategoriaDto> - Categoría actualizada
   */
  async update(
    id: number,
    updateCategoriaDto: UpdateCategoriaDto,
    personaId: number,
  ): Promise<ResponseCategoriaDto> {
    const categoria = await this.categoriaRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${id} no encontrada para esta empresa`,
      );
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (
      updateCategoriaDto.nombre &&
      updateCategoriaDto.nombre !== categoria.nombre
    ) {
      const existingCategoria = await this.categoriaRepository.findOne({
        where: {
          nombre: updateCategoriaDto.nombre,
          persona: { id: personaId },
        },
      });

      if (existingCategoria) {
        throw new ConflictException(
          'Ya existe una categoría con este nombre para esta empresa',
        );
      }
    }

    // Actualizar categoría
    Object.assign(categoria, updateCategoriaDto);
    const updatedCategoria = await this.categoriaRepository.save(categoria);

    return plainToClass(ResponseCategoriaDto, updatedCategoria, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Eliminar una categoría (soft delete)
   * @param id - ID de la categoría a eliminar
   * @param personaId - ID de la persona/empresa propietaria
   * @returns Promise<void>
   */
  async remove(id: number, personaId: number): Promise<void> {
    const categoria = await this.categoriaRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
      relations: ['productos'],
    });

    if (!categoria) {
      throw new NotFoundException(
        `Categoría con ID ${id} no encontrada para esta empresa`,
      );
    }

    // Verificar si la categoría tiene productos asociados
    if (categoria.productos && categoria.productos.length > 0) {
      throw new ConflictException(
        'No se puede eliminar la categoría porque tiene productos asociados',
      );
    }

    // Soft delete - cambiar estado a false
    categoria.estado = false;
    await this.categoriaRepository.save(categoria);
  }

  /**
   * Buscar categorías por nombre para una persona/empresa
   * @param nombre - Nombre a buscar
   * @param personaId - ID de la persona/empresa
   * @returns Promise<ResponseCategoriaDto[]> - Categorías encontradas
   */
  async findByName(
    nombre: string,
    personaId: number,
  ): Promise<ResponseCategoriaDto[]> {
    const categorias = await this.categoriaRepository
      .createQueryBuilder('categoria')
      .where('categoria.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
      .andWhere('categoria.persona.id = :personaId', { personaId })
      .andWhere('categoria.estado = :estado', { estado: true })
      .orderBy('categoria.nombre', 'ASC')
      .getMany();

    return categorias.map((categoria) =>
      plainToClass(ResponseCategoriaDto, categoria, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
