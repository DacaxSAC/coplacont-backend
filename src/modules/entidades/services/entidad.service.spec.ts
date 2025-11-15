import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntidadService } from './entidad.service';
import { Entidad } from '../entities';
import { CreateEntidadDto, UpdateEntidadDto, ActivateRoleDto } from '../dto';
import { EntidadType } from '../enums';

/**
 * Tests unitarios para EntidadService
 * Verifica las operaciones CRUD con filtrado por persona/empresa
 */
describe('EntidadService', () => {
  let service: EntidadService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntidadService,
        {
          provide: getRepositoryToken(Entidad),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EntidadService>(EntidadService);

    // Reset mocks
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEntidadDto: CreateEntidadDto = {
      esProveedor: false,
      esCliente: true,
      tipo: EntidadType.NATURAL,
      numeroDocumento: '12345678',
      nombre: 'Juan',
      apellidoMaterno: 'García',
      apellidoPaterno: 'Pérez',
    };
    const personaId = 1;

    it('should create an entidad successfully', async () => {
      const savedEntidad = {
        id: 1,
        ...createEntidadDto,
        persona: { id: personaId },
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedEntidad);
      mockRepository.save.mockResolvedValue(savedEntidad);

      const result = await service.create(createEntidadDto, personaId);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createEntidadDto,
        persona: { id: personaId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(savedEntidad);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.nombre).toBe(createEntidadDto.nombre);
    });
  });

  describe('findAll', () => {
    const personaId = 1;

    it('should return entidades for persona (active only by default)', async () => {
      const entidades = [
        {
          id: 1,
          nombre: 'Juan',
          persona: { id: personaId },
          activo: true,
        },
      ];

      mockRepository.find.mockResolvedValue(entidades);

      const result = await service.findAll(personaId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { persona: { id: personaId }, activo: true },
        order: { createdAt: 'DESC' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return all entidades including inactive when includeInactive is true', async () => {
      const entidades = [
        {
          id: 1,
          nombre: 'Juan',
          persona: { id: personaId },
          activo: true,
        },
        {
          id: 2,
          nombre: 'Pedro',
          persona: { id: personaId },
          activo: false,
        },
      ];

      mockRepository.find.mockResolvedValue(entidades);

      const result = await service.findAll(personaId, true);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { persona: { id: personaId } },
        order: { createdAt: 'DESC' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findById', () => {
    const entidadId = 1;
    const personaId = 1;

    it('should return entidad if found for persona', async () => {
      const entidad = {
        id: entidadId,
        nombre: 'Juan',
        persona: { id: personaId },
      };

      mockRepository.findOne.mockResolvedValue(entidad);

      const result = await service.findById(entidadId, personaId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: entidadId,
          persona: { id: personaId },
          activo: true,
        },
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(entidadId);
    });

    it('should return error if entidad not found for persona', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(entidadId, personaId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });

  describe('findClients', () => {
    const personaId = 1;

    it('should return clients for persona', async () => {
      const clients = [
        {
          id: 1,
          nombre: 'Juan',
          esCliente: true,
          persona: { id: personaId },
          activo: true,
        },
      ];

      mockRepository.find.mockResolvedValue(clients);

      const result = await service.findClients(personaId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { persona: { id: personaId }, esCliente: true, activo: true },
        order: { createdAt: 'DESC' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findProviders', () => {
    const personaId = 1;

    it('should return providers for persona', async () => {
      const providers = [
        {
          id: 1,
          nombre: 'Proveedor ABC',
          esProveedor: true,
          persona: { id: personaId },
          activo: true,
        },
      ];

      mockRepository.find.mockResolvedValue(providers);

      const result = await service.findProviders(personaId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { persona: { id: personaId }, esProveedor: true, activo: true },
        order: { createdAt: 'DESC' },
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByDocumentNumber', () => {
    const documentNumber = '12345678';
    const personaId = 1;

    it('should return entidad if found by document number for persona', async () => {
      const entidad = {
        id: 1,
        numeroDocumento: documentNumber,
        persona: { id: personaId },
      };

      mockRepository.findOne.mockResolvedValue(entidad);

      const result = await service.findByDocumentNumber(
        documentNumber,
        personaId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          numeroDocumento: documentNumber,
          persona: { id: personaId },
          activo: true,
        },
      });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.numeroDocumento).toBe(documentNumber);
    });

    it('should return error if entidad not found by document number', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByDocumentNumber(
        documentNumber,
        personaId,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });

  describe('update', () => {
    const entidadId = 1;
    const personaId = 1;
    const updateEntidadDto: UpdateEntidadDto = {
      nombre: 'Juan Actualizado',
    };

    it('should update entidad successfully', async () => {
      const existingEntidad = {
        id: entidadId,
        nombre: 'Juan',
        persona: { id: personaId },
      };
      const updatedEntidad = {
        ...existingEntidad,
        ...updateEntidadDto,
      };

      mockRepository.findOne.mockResolvedValueOnce(existingEntidad);
      mockRepository.save.mockResolvedValue(updatedEntidad);

      const result = await service.update(
        entidadId,
        personaId,
        updateEntidadDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: entidadId,
          persona: { id: personaId },
          activo: true,
        },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return error if entidad not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.update(
        entidadId,
        personaId,
        updateEntidadDto,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });

  describe('activateRole', () => {
    const entidadId = 1;
    const personaId = 1;
    const activateRoleDto: ActivateRoleDto = {
      isCliente: true,
      isProveedor: false,
    };

    it('should activate role successfully', async () => {
      const existingEntidad = {
        id: entidadId,
        esCliente: false,
        esProveedor: false,
        persona: { id: personaId },
      };
      const updatedEntidad = {
        ...existingEntidad,
        esCliente: activateRoleDto.isCliente,
        esProveedor: activateRoleDto.isProveedor,
      };

      mockRepository.findOne.mockResolvedValueOnce(existingEntidad);
      mockRepository.save.mockResolvedValue(updatedEntidad);

      const result = await service.activateRole(
        entidadId,
        personaId,
        activateRoleDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: entidadId,
          persona: { id: personaId },
          activo: true,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.esCliente).toBe(true);
    });
  });

  describe('softDelete', () => {
    const entidadId = 1;
    const personaId = 1;

    it('should soft delete entidad for persona', async () => {
      const entidad = {
        id: entidadId,
        nombre: 'Juan',
        persona: { id: personaId },
        activo: true,
      };
      const deletedEntidad = { ...entidad, activo: false };

      mockRepository.findOne.mockResolvedValue(entidad);
      mockRepository.save.mockResolvedValue(deletedEntidad);

      const result = await service.softDelete(entidadId, personaId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: entidadId,
          persona: { id: personaId },
          activo: true,
        },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return error if entidad not found for soft delete', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.softDelete(entidadId, personaId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });

  describe('restore', () => {
    const entidadId = 1;
    const personaId = 1;

    it('should restore entidad for persona', async () => {
      const entidad = {
        id: entidadId,
        nombre: 'Juan',
        persona: { id: personaId },
        activo: false,
      };
      const restoredEntidad = { ...entidad, activo: true };

      mockRepository.findOne.mockResolvedValue(entidad);
      mockRepository.save.mockResolvedValue(restoredEntidad);

      const result = await service.restore(entidadId, personaId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: entidadId,
          persona: { id: personaId },
          activo: false,
        },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should return error if entidad not found for restore', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.restore(entidadId, personaId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrada');
    });
  });
});
