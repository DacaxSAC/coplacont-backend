import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Almacen } from 'src/modules/almacen/entities/almacen.entity';
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
   * @param personaId - ID de la empresa del usuario
   * @param createAlmacenDto - Datos para crear el almacén
   * @returns Promise<ResponseAlmacenDto> - Almacén creado
   */
  async create(
    personaId: number,
    createAlmacenDto: CreateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    // Verificar si ya existe un almacén con el mismo nombre en la empresa
    const existingAlmacen = await this.almacenRepository.findOne({
      where: {
        nombre: createAlmacenDto.nombre,
        persona: { id: personaId },
      },
    });

    if (existingAlmacen) {
      throw new ConflictException(
        'Ya existe un almacén con este nombre en su empresa',
      );
    }

    // Crear nuevo almacén asociado a la empresa
    const almacen = this.almacenRepository.create({
      ...createAlmacenDto,
      persona: { id: personaId },
      estado: createAlmacenDto.estado ?? true,
    });

    const savedAlmacen = await this.almacenRepository.save(almacen);
    return plainToClass(ResponseAlmacenDto, savedAlmacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Obtener todos los almacenes de una empresa
   * @param personaId - ID de la empresa
   * @param includeInactive - Si es true, incluye almacenes inactivos. Por defecto false (solo activos)
   * @returns Promise<ResponseAlmacenDto[]> - Lista de almacenes
   */
  async findAll(
    personaId: number,
    includeInactive: boolean = false,
  ): Promise<ResponseAlmacenDto[]> {
    const queryBuilder = this.almacenRepository
      .createQueryBuilder('almacen')
      .leftJoinAndSelect('almacen.persona', 'persona')
      .where('persona.id = :personaId', { personaId });

    if (!includeInactive) {
      queryBuilder.andWhere('almacen.estado = :estado', { estado: true });
    }

    const almacenes = await queryBuilder
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Obtener un almacén por ID de una empresa específica
   * @param personaId - ID de la empresa
   * @param id - ID del almacén
   * @returns Promise<ResponseAlmacenDto> - Almacén encontrado
   */
  async findOne(personaId: number, id: number): Promise<ResponseAlmacenDto> {
    const almacen = await this.almacenRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
      relations: ['persona'],
    });

    if (!almacen) {
      throw new NotFoundException(
        `Almacén con ID ${id} no encontrado en su empresa`,
      );
    }

    return plainToClass(ResponseAlmacenDto, almacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Actualizar un almacén de la empresa
   * @param personaId - ID de la empresa
   * @param id - ID del almacén a actualizar
   * @param updateAlmacenDto - Datos para actualizar
   * @returns Promise<ResponseAlmacenDto> - Almacén actualizado
   */
  async update(
    personaId: number,
    id: number,
    updateAlmacenDto: UpdateAlmacenDto,
  ): Promise<ResponseAlmacenDto> {
    const almacen = await this.almacenRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
      relations: ['persona'],
    });

    if (!almacen) {
      throw new NotFoundException(
        `Almacén con ID ${id} no encontrado en su empresa`,
      );
    }

    // Verificar si el nuevo nombre ya existe en la empresa (si se está cambiando)
    if (updateAlmacenDto.nombre && updateAlmacenDto.nombre !== almacen.nombre) {
      const existingAlmacen = await this.almacenRepository.findOne({
        where: {
          nombre: updateAlmacenDto.nombre,
          persona: { id: personaId },
        },
      });

      if (existingAlmacen) {
        throw new ConflictException(
          'Ya existe un almacén con este nombre en su empresa',
        );
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
   * Eliminar un almacén de la empresa (soft delete)
   * @param personaId - ID de la empresa
   * @param id - ID del almacén a eliminar
   * @returns Promise<ResponseAlmacenDto> - Almacén eliminado
   */
  async remove(personaId: number, id: number): Promise<ResponseAlmacenDto> {
    const almacen = await this.almacenRepository.findOne({
      where: {
        id,
        persona: { id: personaId },
      },
      relations: ['persona'],
    });

    if (!almacen) {
      throw new NotFoundException(
        `Almacén con ID ${id} no encontrado en su empresa`,
      );
    }

    // Soft delete - cambiar estado a false
    almacen.estado = false;
    const updatedAlmacen = await this.almacenRepository.save(almacen);

    return plainToClass(ResponseAlmacenDto, updatedAlmacen, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Buscar almacenes por nombre en la empresa
   * @param personaId - ID de la empresa
   * @param nombre - Nombre a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByName(
    personaId: number,
    nombre: string,
  ): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .leftJoinAndSelect('almacen.persona', 'persona')
      .where('almacen.nombre ILIKE :nombre', { nombre: `%${nombre}%` })
      .andWhere('almacen.estado = :estado', { estado: true })
      .andWhere('persona.id = :personaId', { personaId })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Buscar almacenes por ubicación en la empresa
   * @param personaId - ID de la empresa
   * @param ubicacion - Ubicación a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByLocation(
    personaId: number,
    ubicacion: string,
  ): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .leftJoinAndSelect('almacen.persona', 'persona')
      .where('almacen.ubicacion ILIKE :ubicacion', {
        ubicacion: `%${ubicacion}%`,
      })
      .andWhere('almacen.estado = :estado', { estado: true })
      .andWhere('persona.id = :personaId', { personaId })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Buscar almacenes por responsable en la empresa
   * @param personaId - ID de la empresa
   * @param responsable - Responsable a buscar
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes encontrados
   */
  async findByResponsible(
    personaId: number,
    responsable: string,
  ): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .leftJoinAndSelect('almacen.persona', 'persona')
      .where('almacen.responsable ILIKE :responsable', {
        responsable: `%${responsable}%`,
      })
      .andWhere('almacen.estado = :estado', { estado: true })
      .andWhere('persona.id = :personaId', { personaId })
      .orderBy('almacen.nombre', 'ASC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Obtener almacenes con mayor capacidad en la empresa
   * @param personaId - ID de la empresa
   * @param minCapacidad - Capacidad mínima
   * @returns Promise<ResponseAlmacenDto[]> - Almacenes con capacidad mayor o igual
   */
  async findByMinCapacity(
    personaId: number,
    minCapacidad: number,
  ): Promise<ResponseAlmacenDto[]> {
    const almacenes = await this.almacenRepository
      .createQueryBuilder('almacen')
      .leftJoinAndSelect('almacen.persona', 'persona')
      .where('almacen.capacidadMaxima >= :minCapacidad', { minCapacidad })
      .andWhere('almacen.estado = :estado', { estado: true })
      .andWhere('persona.id = :personaId', { personaId })
      .orderBy('almacen.capacidadMaxima', 'DESC')
      .getMany();

    return almacenes.map((almacen) =>
      plainToClass(ResponseAlmacenDto, almacen, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
