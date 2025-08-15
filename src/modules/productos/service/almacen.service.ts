import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Almacen } from '../entities/almacen.entity';
import { CreateAlmacenDto, UpdateAlmacenDto, ResponseAlmacenDto } from '../dto';

/**
 * Servicio para gestionar las operaciones CRUD de almacenes
 * Maneja la lógica de negocio relacionada con los almacenes
 */
@Injectable()
export class AlmacenService {
  constructor(
    @InjectRepository(Almacen)
    private readonly almacenRepository: Repository<Almacen>,
  ) {}

  /**
   * Crear un nuevo almacén
   * @param createAlmacenDto - Datos para crear el almacén
   * @returns Promise<ResponseAlmacenDto> - Almacén creado
   */
  async create(
    createAlmacenDto: CreateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    // Verificar si ya existe un almacén con el mismo nombre
    const existingAlmacen = await this.almacenRepository.findOne({
      where: { nombre: createAlmacenDto.nombre },
    });

    if (existingAlmacen) {
      throw new ConflictException('Ya existe un almacén con este nombre');
    }

    // Crear nuevo almacén
    const almacen = this.almacenRepository.create({
      ...createAlmacenDto,
      estado: createAlmacenDto.estado ?? true,
    });

    const savedAlmacen = await this.almacenRepository.save(almacen);
    return plainToClass(ResponseAlmacenDto, savedAlmacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Obtener todos los almacenes
   * @returns Promise<ResponseAlmacenDto[]> - Lista de almacenes
   */
  async findAll(): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Obtener un almacén por ID
   * @param id - ID del almacén
   * @returns Promise<ResponseAlmacenDto> - Almacén encontrado
   */
  async findOne(id: number): Promise<ResponseAlmacenDto> {
    const almacen = await this.almacenRepository.findOne({
      where: { id },
    });

    if (!almacen) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    return plainToClass(ResponseAlmacenDto, almacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Actualizar un almacén
   * @param id - ID del almacén a actualizar
   * @param updateAlmacenDto - Datos para actualizar
   * @returns Promise<ResponseAlmacenDto> - Almacén actualizado
   */
  async update(
    id: number,
    updateAlmacenDto: UpdateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    const almacen = await this.almacenRepository.findOne({
      where: { id },
    });

    if (!almacen) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (updateAlmacenDto.nombre && updateAlmacenDto.nombre !== almacen.nombre) {
      const existingAlmacen = await this.almacenRepository.findOne({
        where: { nombre: updateAlmacenDto.nombre },
      });

      if (existingAlmacen) {
        throw new ConflictException('Ya existe un almacén con este nombre');
      }
    }

    // Actualizar almacén
    Object.assign(almacen, updateAlmacenDto);
    const updatedAlmacen = await this.almacenRepository.save(almacen);

    return plainToClass(ResponseAlmacenDto, updatedAlmacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Eliminar un almacén (soft delete)
   * @param id - ID del almacén a eliminar
   * @returns Promise<void>
   */
  async remove(id: number): Promise<void> {
    const almacen = await this.almacenRepository.findOne({
      where: { id },
    });

    if (!almacen) {
      throw new NotFoundException(`Almacén con ID ${id} no encontrado`);
    }

    // Soft delete - cambiar estado a false
    almacen.estado = false;
    await this.almacenRepository.save(almacen);
  }

  /**
   * Buscar almacenes por nombre
   * @param nombre - Nombre a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByName(nombre: string): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .where('almacen.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
      .andWhere('almacen.estado = :estado', { estado: true })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Buscar almacenes por ubicación
   * @param ubicacion - Ubicación a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByLocation(ubicacion: string): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .where('almacen.ubicacion ILIKE :ubicacion', {
        ubicacion: `%${ubicacion}%`,
      })
      .andWhere('almacen.estado = :estado', { estado: true })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Buscar almacenes por responsable
   * @param responsable - Responsable a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByResponsible(responsable: string): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .where('almacen.responsable ILIKE :responsable', {
        responsable: `%${responsable}%`,
      })
      .andWhere('almacen.estado = :estado', { estado: true })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Obtener almacenes con mayor capacidad
   * @param minCapacidad - Capacidad mínima
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes con capacidad mayor o igual
   */
  async findByMinCapacity(minCapacidad: number): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .where('almacen.capacidadMaxima >= :minCapacidad', { minCapacidad })
      .andWhere('almacen.estado = :estado', { estado: true })
      .orderBy('almacen.capacidadMaxima', 'DESC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
