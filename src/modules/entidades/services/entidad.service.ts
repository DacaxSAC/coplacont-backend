import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entidad } from '../entities';
import { CreateEntidadDto, UpdateEntidadDto, ActivateRoleDto, EntidadResponseDto, ApiResponseDto } from '../dto';

@Injectable()
export class EntidadService {
  constructor(
    @InjectRepository(Entidad)
    private readonly personRepository: Repository<Entidad>,
  ) {}

  /**
   * Crea una nueva persona
   * @param createPersonDto - Datos para crear la persona
   * @returns Respuesta con la persona creada o error
   */
  async create(createPersonDto: CreateEntidadDto): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const existingPerson = await this.personRepository.findOne({
        where: { numeroDocumento: createPersonDto.numeroDocumento }
      });

      if (existingPerson) {
        return ApiResponseDto.error(`Ya existe una persona con el número de documento ${createPersonDto.numeroDocumento}`);
      }

      const person = this.personRepository.create(createPersonDto);
      const savedPerson = await this.personRepository.save(person);
      const responseDto = this.mapToResponseDto(savedPerson);
      
      return ApiResponseDto.success('Persona creada exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al crear la persona: ' + error.message);
    }
  }

  /**
   * Obtiene todas las personas activas
   * @returns Respuesta con lista de personas activas
   */
  async findAll(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    try {
      const persons = await this.personRepository.find({
        order: { createdAt: 'DESC' }
      });
      
      const responseDtos = persons.map(person => this.mapToResponseDto(person));
      return ApiResponseDto.success('Personas obtenidas exitosamente', responseDtos);
    } catch (error) {
      return ApiResponseDto.error('Error al obtener las personas: ' + error.message);
    }
  }

  /**
   * Busca una persona por ID
   * @param id - ID de la persona
   * @returns Respuesta con la persona encontrada o error
   */
  async findById(id: number): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const person = await this.personRepository.findOne({
        where: { id, activo: true }
      });

      if (!person) {
        return ApiResponseDto.error(`Entidad con ID ${id} no encontrada`);
      }

      const responseDto = this.mapToResponseDto(person);
      return ApiResponseDto.success('Entidad encontrada exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al buscar la entidad: ' + error.message);
    }
  }

  /**
   * Obtiene todas las personas que son clientes
   * @returns Respuesta con lista de clientes activos
   */
  async findClients(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    try {
      const clients = await this.personRepository.find({
        where: { 
          esCliente: true,
        },
        order: { createdAt: 'DESC' }
      });
      
      const responseDtos = clients.map(client => this.mapToResponseDto(client));
      return ApiResponseDto.success('Clientes obtenidos exitosamente', responseDtos);
    } catch (error) {
      return ApiResponseDto.error('Error al obtener los clientes: ' + error.message);
    }
  }

  /**
   * Obtiene todas las personas que son proveedores
   * @returns Respuesta con lista de proveedores activos
   */
  async findProviders(): Promise<ApiResponseDto<EntidadResponseDto[]>> {
    try {
      const providers = await this.personRepository.find({
        where: { 
          esProveedor: true,
        },
        order: { createdAt: 'DESC' }
      });
      
      const responseDtos = providers.map(provider => this.mapToResponseDto(provider));
      return ApiResponseDto.success('Proveedores obtenidos exitosamente', responseDtos);
    } catch (error) {
      return ApiResponseDto.error('Error al obtener los proveedores: ' + error.message);
    }
  }

  /**
   * Actualiza los datos principales de una persona
   * @param id - ID de la persona
   * @param updatePersonDto - Datos a actualizar
   * @returns Respuesta con la persona actualizada o error
   */
  async update(id: number, updatePersonDto: UpdateEntidadDto): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const person = await this.personRepository.findOne({
        where: { id, activo: true }
      });

      if (!person) {
        return ApiResponseDto.error(`Entidad con ID ${id} no encontrada`);
      }

      // Actualizar solo los campos proporcionados
      Object.assign(person, updatePersonDto);
      
      const updatedPerson = await this.personRepository.save(person);
      const responseDto = this.mapToResponseDto(updatedPerson);
      return ApiResponseDto.success('Entidad actualizada exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al actualizar la entidad: ' + error.message);
    }
  }

  /**
   * Activa un rol específico para una persona (solo activación permitida)
   * @param id - ID de la persona
   * @param activateRoleDto - Datos del rol a activar
   * @returns Respuesta con la persona con el rol activado o error
   */
  async activateRole(id: number, activateRoleDto: ActivateRoleDto): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const person = await this.personRepository.findOne({
        where: { id, activo: true }
      });

      if (!person) {
        return ApiResponseDto.error(`Entidad con ID ${id} no encontrada`);
      }

      // Validar que solo se esté activando (no desactivando)
      if (!activateRoleDto.isCliente && !activateRoleDto.isProveedor) {
        return ApiResponseDto.error('Solo se permite activar roles, no desactivar');
      }

      // Activar los roles especificados
      if (activateRoleDto.isCliente !== undefined) {
        person.esCliente = activateRoleDto.isCliente;
      }
      if (activateRoleDto.isProveedor !== undefined) {
        person.esProveedor = activateRoleDto.isProveedor;
      }

      const updatedPerson = await this.personRepository.save(person);
      const responseDto = this.mapToResponseDto(updatedPerson);
      return ApiResponseDto.success('Rol activado exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al activar el rol: ' + error.message);
    }
  }

  /**
   * Realiza soft delete de una persona (marca como inactiva)
   * @param id ID de la persona
   * @returns Respuesta de confirmación o error
   */
  async softDelete(id: number): Promise<ApiResponseDto<null>> {
    try {
      const person = await this.personRepository.findOne({
        where: { id, activo: true }
      });

      if (!person) {
        return ApiResponseDto.error('Persona no encontrada');
      }

      person.activo = false;
      await this.personRepository.save(person);
      return ApiResponseDto.success('Persona eliminada exitosamente', null);
    } catch (error) {
      return ApiResponseDto.error('Error al eliminar la persona: ' + error.message);
    }
  }

  /**
   * Restaura una persona eliminada (soft delete)
   * @param id ID de la persona
   * @returns Respuesta con la persona restaurada o error
   */
  async restore(id: number): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const person = await this.personRepository.findOne({
        where: { id, activo: false }
      });

      if (!person) {
        return ApiResponseDto.error('Persona no encontrada o ya está activa');
      }

      person.activo = true;
      const restoredPerson = await this.personRepository.save(person);
      const responseDto = this.mapToResponseDto(restoredPerson);
      return ApiResponseDto.success('Persona restaurada exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al restaurar la persona: ' + error.message);
    }
  }

  /**
   * Busca personas por número de documento
   * @param documentNumber Número de documento
   * @returns Respuesta con la persona encontrada o error
   */
  async findByDocumentNumber(documentNumber: string): Promise<ApiResponseDto<EntidadResponseDto>> {
    try {
      const person = await this.personRepository.findOne({
        where: { numeroDocumento: documentNumber, activo: true }
      });

      if (!person) {
        return ApiResponseDto.error(`Persona con número de documento ${documentNumber} no encontrada`);
      }

      const responseDto = this.mapToResponseDto(person);
      return ApiResponseDto.success('Persona encontrada exitosamente', responseDto);
    } catch (error) {
      return ApiResponseDto.error('Error al buscar la persona: ' + error.message);
    }
  }

  async findEntity(id: number) : Promise<Entidad>{
    const person = await this.personRepository.findOne({ where: { id } });
  
    if (!person) {
      throw new NotFoundException(`La persona con id ${id} no existe`);
    }
  
    return person;
  }

  /**
   * Mapea una entidad Person a PersonResponseDto
   * @param entidad - Entidad Person
   * @returns PersonResponseDto
   */
  private mapToResponseDto(entidad: Entidad): EntidadResponseDto {
    const dto = new EntidadResponseDto();
    dto.id = entidad.id;
    dto.esProveedor = entidad.esProveedor;
    dto.esCliente = entidad.esCliente;
    dto.tipo = entidad.tipo;
    dto.numeroDocumento = entidad.numeroDocumento;
    dto.nombre = entidad.nombre;
    dto.apellidoMaterno = entidad.apellidoMaterno;
    dto.apellidoPaterno = entidad.apellidoPaterno;
    dto.razonSocial = entidad.razonSocial;
    dto.activo = entidad.activo;
    dto.direccion = entidad.direccion;
    dto.telefono = entidad.telefono;
    dto.nombreCompleto = entidad.nombreCompletoMostrado;
    dto.createdAt = entidad.createdAt;
    dto.updatedAt = entidad.updatedAt;
    return dto;
  }
}