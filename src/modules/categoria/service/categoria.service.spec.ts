import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { Categoria } from '../entities';
import { CreateCategoriaDto, UpdateCategoriaDto } from '../dto';
import { TipoCategoria } from '../enum';

/**
 * Tests unitarios para CategoriaService
 * Verifica las operaciones CRUD con filtrado por persona/empresa
 */
describe('CategoriaService', () => {
  let service: CategoriaService;

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
        CategoriaService,
        {
          provide: getRepositoryToken(Categoria),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriaService>(CategoriaService);

    // Reset mocks
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createCategoriaDto: CreateCategoriaDto = {
      nombre: 'Electrónicos',
      descripcion: 'Productos electrónicos',
      tipo: TipoCategoria.PRODUCTO,
      estado: true,
    };
    const personaId = 1;

    it('should create a categoria successfully', async () => {
      const savedCategoria = {
        id: 1,
        ...createCategoriaDto,
        persona: { id: personaId },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedCategoria);
      mockRepository.save.mockResolvedValue(savedCategoria);

      const result = await service.create(createCategoriaDto, personaId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          nombre: createCategoriaDto.nombre,
          persona: { id: personaId },
        },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createCategoriaDto,
        tipo: TipoCategoria.PRODUCTO,
        estado: true,
        persona: { id: personaId },
      });
      expect(result).toBeDefined();
      expect(result.nombre).toBe(createCategoriaDto.nombre);
    });

    it('should throw ConflictException if categoria with same name exists for persona', async () => {
      const existingCategoria = {
        id: 1,
        nombre: createCategoriaDto.nombre,
        persona: { id: personaId },
      };

      mockRepository.findOne.mockResolvedValue(existingCategoria);

      await expect(
        service.create(createCategoriaDto, personaId),
      ).rejects.toThrow(ConflictException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const personaId = 1;

    it('should return categorias for persona (active only by default)', async () => {
      const categorias = [
        {
          id: 1,
          nombre: 'Electrónicos',
          persona: { id: personaId },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(categorias);

      const result = await service.findAll(personaId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'categoria',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'categoria.persona.id = :personaId',
        { personaId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'categoria.estado = :estado',
        { estado: true },
      );
      expect(result).toHaveLength(1);
    });

    it('should return all categorias including inactive when includeInactive is true', async () => {
      const categorias = [
        {
          id: 1,
          nombre: 'Electrónicos',
          persona: { id: personaId },
          estado: true,
        },
        {
          id: 2,
          nombre: 'Inactiva',
          persona: { id: personaId },
          estado: false,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(categorias);

      const result = await service.findAll(personaId, true);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'categoria',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'categoria.persona.id = :personaId',
        { personaId },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'categoria.estado = :estado',
        { estado: true },
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    const categoriaId = 1;
    const personaId = 1;

    it('should return categoria if found for persona', async () => {
      const categoria = {
        id: categoriaId,
        nombre: 'Electrónicos',
        persona: { id: personaId },
      };

      mockRepository.findOne.mockResolvedValue(categoria);

      const result = await service.findOne(categoriaId, personaId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: categoriaId,
          persona: { id: personaId },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(categoriaId);
    });

    it('should throw NotFoundException if categoria not found for persona', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(categoriaId, personaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const categoriaId = 1;
    const personaId = 1;
    const updateCategoriaDto: UpdateCategoriaDto = {
      nombre: 'Electrónicos Actualizados',
    };

    it('should update categoria successfully', async () => {
      const existingCategoria = {
        id: categoriaId,
        nombre: 'Electrónicos',
        persona: { id: personaId },
      };
      const updatedCategoria = {
        ...existingCategoria,
        ...updateCategoriaDto,
      };

      // First call: find the categoria to update
      // Second call: check for name conflict (should return null for no conflict)
      mockRepository.findOne
        .mockResolvedValueOnce(existingCategoria)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue(updatedCategoria);

      const result = await service.update(
        categoriaId,
        updateCategoriaDto,
        personaId,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: categoriaId,
          persona: { id: personaId },
        },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.nombre).toBe(updateCategoriaDto.nombre);
    });

    it('should throw NotFoundException if categoria not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update(categoriaId, updateCategoriaDto, personaId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    const personaId = 1;
    const nombre = 'Electrónicos';

    it('should return categorias matching name for persona', async () => {
      const categorias = [
        {
          id: 1,
          nombre: 'Electrónicos',
          persona: { id: personaId },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(categorias);

      const result = await service.findByName(nombre, personaId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'categoria',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'categoria.nombre ILIKE :nombre',
        { nombre: `%${nombre}%` },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'categoria.persona.id = :personaId',
        { personaId },
      );
      expect(result).toHaveLength(1);
    });
  });
});
