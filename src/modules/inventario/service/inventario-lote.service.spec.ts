import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventarioLoteService } from './inventario-lote.service';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Inventario } from '../entities/inventario.entity';

describe('InventarioLoteService - getCostoPromedioPonderado', () => {
  let service: InventarioLoteService;
  let inventarioLoteRepository: Repository<InventarioLote>;
  let inventarioRepository: Repository<Inventario>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioLoteService,
        {
          provide: getRepositoryToken(InventarioLote),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Inventario),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventarioLoteService>(InventarioLoteService);
    inventarioLoteRepository = module.get<Repository<InventarioLote>>(
      getRepositoryToken(InventarioLote),
    );
    inventarioRepository = module.get<Repository<Inventario>>(
      getRepositoryToken(Inventario),
    );
  });

  describe('getCostoPromedioPonderado', () => {
    it('debería retornar 0 cuando no hay lotes disponibles', async () => {
      // Arrange
      const idInventario = 1;
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue([]);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      expect(resultado).toBe(0);
      expect(inventarioLoteRepository.find).toHaveBeenCalledWith({
        where: {
          inventario: { id: idInventario },
          cantidadActual: expect.any(Object), // MoreThan(0)
          estado: true,
        },
      });
    });

    it('debería calcular correctamente el costo promedio ponderado con un solo lote', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 10,
          costoUnitario: 25.50,
        } as InventarioLote,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      expect(resultado).toBe(25.50);
    });

    it('debería calcular correctamente el costo promedio ponderado con múltiples lotes', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 10,
          costoUnitario: 20.00, // Costo total: 200.00
        } as InventarioLote,
        {
          id: 2,
          cantidadActual: 5,
          costoUnitario: 30.00, // Costo total: 150.00
        } as InventarioLote,
        {
          id: 3,
          cantidadActual: 15,
          costoUnitario: 25.00, // Costo total: 375.00
        } as InventarioLote,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      // Cálculo esperado: (200 + 150 + 375) / (10 + 5 + 15) = 725 / 30 = 24.1667
      const esperado = parseFloat((725 / 30).toFixed(4));
      expect(resultado).toBe(esperado);
    });

    it('debería manejar correctamente lotes con cantidades decimales', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 10.5,
          costoUnitario: 15.75, // Costo total: 165.375
        } as InventarioLote,
        {
          id: 2,
          cantidadActual: 7.25,
          costoUnitario: 22.40, // Costo total: 162.40
        } as InventarioLote,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      // Cálculo esperado: (165.375 + 162.40) / (10.5 + 7.25) = 327.775 / 17.75 = 18.4648
      const esperado = parseFloat((327.775 / 17.75).toFixed(4));
      expect(resultado).toBe(esperado);
    });

    it('debería retornar 0 cuando la cantidad total es 0', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 0,
          costoUnitario: 25.00,
        } as InventarioLote,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      expect(resultado).toBe(0);
    });

    it('debería redondear el resultado a 4 decimales', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 3,
          costoUnitario: 10.00, // Costo total: 30.00
        } as InventarioLote,
        {
          id: 2,
          cantidadActual: 7,
          costoUnitario: 15.00, // Costo total: 105.00
        } as InventarioLote,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      // Cálculo: (30 + 105) / (3 + 7) = 135 / 10 = 13.5
      expect(resultado).toBe(13.5);
      expect(resultado.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
    });

    it('debería llamar al repositorio con los parámetros correctos', async () => {
      // Arrange
      const idInventario = 123;
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue([]);

      // Act
      await service.getCostoPromedioPonderado(idInventario);

      // Assert
      expect(inventarioLoteRepository.find).toHaveBeenCalledWith({
        where: {
          inventario: { id: idInventario },
          cantidadActual: expect.any(Object), // MoreThan(0)
          estado: true,
        },
      });
    });

    it('debería manejar correctamente datos que vienen como strings', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: '2.0000', // String como viene de la BD
          costoUnitario: '10.0000', // String como viene de la BD
        } as any,
        {
          id: 2,
          cantidadActual: '1.0000', // String como viene de la BD
          costoUnitario: '20.0000', // String como viene de la BD
        } as any,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      // Cálculo esperado: (2*10 + 1*20) / (2 + 1) = 40 / 3 = 13.3333
      const esperado = parseFloat((40 / 3).toFixed(4));
      expect(resultado).toBe(esperado);
    });

    it('debería manejar correctamente una mezcla de números y strings', async () => {
      // Arrange
      const idInventario = 1;
      const lotesMock = [
        {
          id: 1,
          cantidadActual: 5, // Número
          costoUnitario: '15.0000', // String
        } as any,
        {
          id: 2,
          cantidadActual: '3.0000', // String
          costoUnitario: 25, // Número
        } as any,
      ];
      jest.spyOn(inventarioLoteRepository, 'find').mockResolvedValue(lotesMock);

      // Act
      const resultado = await service.getCostoPromedioPonderado(idInventario);

      // Assert
      // Cálculo esperado: (5*15 + 3*25) / (5 + 3) = (75 + 75) / 8 = 150 / 8 = 18.75
      expect(resultado).toBe(18.75);
    });
  });
});