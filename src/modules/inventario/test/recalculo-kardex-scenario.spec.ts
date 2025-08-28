import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RecalculoKardexService, ResultadoRecalculo } from '../service/recalculo-kardex.service';
import { Inventario } from '../entities/inventario.entity';
import { InventarioLote } from '../entities/inventario-lote.entity';
import { Movimiento } from '../../movimientos/entities/movimiento.entity';
import { MovimientoDetalle } from '../../movimientos/entities/movimiento-detalle.entity';
import { Comprobante } from '../../comprobantes/entities/comprobante';
import { Producto } from '../../productos/entities/producto.entity';
import { Almacen } from '../../almacen/entities/almacen.entity';
import { MetodoValoracion } from '../../comprobantes/enum/metodo-valoracion.enum';

/**
 * Test de escenario específico: Compra retroactiva que afecta ventas posteriores
 * 
 * Escenario:
 * 1. Venta inicial el 15/01/2025 de 10 unidades a $12 c/u
 * 2. Compra retroactiva el 10/01/2025 de 20 unidades a $8 c/u
 * 3. Verificar que la venta del 15/01 se recalcule con el nuevo costo promedio
 */
describe('RecalculoKardexService - Escenario Compra Retroactiva', () => {
  let service: RecalculoKardexService;
  let dataSource: DataSource;
  let module: TestingModule;

  // IDs de prueba
  const PRODUCTO_ID = 1;
  const ALMACEN_ID = 1;
  const COMPROBANTE_VENTA_ID = 1;
  const COMPROBANTE_COMPRA_ID = 2;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'test_db',
          entities: [Inventario, InventarioLote, Movimiento, MovimientoDetalle, Comprobante, Producto, Almacen],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Inventario, InventarioLote, Movimiento, MovimientoDetalle, Comprobante])
      ],
      providers: [RecalculoKardexService],
    }).compile();

    service = module.get<RecalculoKardexService>(RecalculoKardexService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Limpiar datos de prueba
    await dataSource.query('TRUNCATE TABLE movimiento_detalle CASCADE');
    await dataSource.query('TRUNCATE TABLE movimiento CASCADE');
    await dataSource.query('TRUNCATE TABLE inventario_lote CASCADE');
    await dataSource.query('TRUNCATE TABLE inventario CASCADE');
    await dataSource.query('TRUNCATE TABLE comprobante CASCADE');
  });

  describe('Escenario: Compra retroactiva afecta venta posterior', () => {
    it('debe recalcular correctamente el costo de venta después de compra retroactiva', async () => {
      // === PASO 1: Configurar estado inicial ===
      
      // Crear inventario inicial (stock 0)
      await dataSource.query(`
        INSERT INTO inventario (producto_id, almacen_id, stock_actual, costo_promedio_actual, metodo_valoracion)
        VALUES (${PRODUCTO_ID}, ${ALMACEN_ID}, 0, 0, 'PROMEDIO')
      `);

      // === PASO 2: Registrar venta inicial (15/01/2025) ===
      
      // Crear comprobante de venta
      await dataSource.query(`
        INSERT INTO comprobante (id, numero, fecha, tipo, subtotal, impuesto, total)
        VALUES (${COMPROBANTE_VENTA_ID}, 'V001', '2025-01-15', 'VENTA', 120.00, 21.60, 141.60)
      `);

      // Crear movimiento de venta
      await dataSource.query(`
        INSERT INTO movimiento (id, comprobante_id, fecha, tipo, observaciones)
        VALUES (1, ${COMPROBANTE_VENTA_ID}, '2025-01-15', 'SALIDA', 'Venta inicial')
      `);

      // Crear detalle de venta (10 unidades a $12 c/u)
      await dataSource.query(`
        INSERT INTO movimiento_detalle (id, movimiento_id, producto_id, almacen_id, cantidad, costo_unitario, costo_total)
        VALUES (1, 1, ${PRODUCTO_ID}, ${ALMACEN_ID}, 10, 12.00, 120.00)
      `);

      // Actualizar inventario después de la venta
      await dataSource.query(`
        UPDATE inventario 
        SET stock_actual = -10, costo_promedio_actual = 12.00
        WHERE producto_id = ${PRODUCTO_ID} AND almacen_id = ${ALMACEN_ID}
      `);

      // === PASO 3: Registrar compra retroactiva (10/01/2025) ===
      
      // Crear comprobante de compra
      await dataSource.query(`
        INSERT INTO comprobante (id, numero, fecha, tipo, subtotal, impuesto, total)
        VALUES (${COMPROBANTE_COMPRA_ID}, 'C001', '2025-01-10', 'COMPRA', 160.00, 28.80, 188.80)
      `);

      // Crear movimiento de compra
      await dataSource.query(`
        INSERT INTO movimiento (id, comprobante_id, fecha, tipo, observaciones)
        VALUES (2, ${COMPROBANTE_COMPRA_ID}, '2025-01-10', 'ENTRADA', 'Compra retroactiva')
      `);

      // Crear detalle de compra (20 unidades a $8 c/u)
      await dataSource.query(`
        INSERT INTO movimiento_detalle (id, movimiento_id, producto_id, almacen_id, cantidad, costo_unitario, costo_total)
        VALUES (2, 2, ${PRODUCTO_ID}, ${ALMACEN_ID}, 20, 8.00, 160.00)
      `);

      // === PASO 4: Verificar estado antes del recálculo ===
      
      const inventarioAntes = await dataSource.query(`
        SELECT stock_actual, costo_promedio_actual 
        FROM inventario 
        WHERE producto_id = ${PRODUCTO_ID} AND almacen_id = ${ALMACEN_ID}
      `);
      
      const ventaAntes = await dataSource.query(`
        SELECT costo_unitario, costo_total 
        FROM movimiento_detalle 
        WHERE movimiento_id = 1
      `);
      
      const comprobanteVentaAntes = await dataSource.query(`
        SELECT subtotal, total 
        FROM comprobante 
        WHERE id = ${COMPROBANTE_VENTA_ID}
      `);

      console.log('=== ESTADO ANTES DEL RECÁLCULO ===');
      console.log('Inventario:', inventarioAntes[0]);
      console.log('Venta:', ventaAntes[0]);
      console.log('Comprobante Venta:', comprobanteVentaAntes[0]);

      // === PASO 5: Ejecutar recálculo retroactivo ===
      
      const resultado = await service.recalcularMovimientoRetroactivo(2, MetodoValoracion.PROMEDIO);
        
      console.log('=== RESULTADO DEL RECÁLCULO ===');
      console.log('Movimientos afectados:', resultado.movimientosAfectados);
      console.log('Lotes actualizados:', resultado.lotesActualizados);
      console.log('Inventarios actualizados:', resultado.inventariosActualizados);
      console.log('Errores:', resultado.errores);
      console.log('Tiempo de ejecución:', resultado.tiempoEjecucion);

      // === PASO 6: Verificar estado después del recálculo ===
      
      const inventarioDespues = await dataSource.query(`
        SELECT stock_actual, costo_promedio_actual 
        FROM inventario 
        WHERE producto_id = ${PRODUCTO_ID} AND almacen_id = ${ALMACEN_ID}
      `);
      
      const ventaDespues = await dataSource.query(`
        SELECT costo_unitario, costo_total 
        FROM movimiento_detalle 
        WHERE movimiento_id = 1
      `);
      
      const comprobanteVentaDespues = await dataSource.query(`
        SELECT subtotal, total 
        FROM comprobante 
        WHERE id = ${COMPROBANTE_VENTA_ID}
      `);

      console.log('=== ESTADO DESPUÉS DEL RECÁLCULO ===');
      console.log('Inventario:', inventarioDespues[0]);
      console.log('Venta:', ventaDespues[0]);
      console.log('Comprobante Venta:', comprobanteVentaDespues[0]);

      // === PASO 7: Verificar resultados esperados ===
      
      // El recálculo debe ser exitoso
      expect(resultado.errores).toHaveLength(0);
      expect(resultado.movimientosAfectados).toBeGreaterThan(0);
      
      // Stock final debe ser 10 (20 compradas - 10 vendidas)
      expect(inventarioDespues[0].stock_actual).toBe(10);
      
      // Costo promedio debe ser $8 (solo hay compra a $8)
      expect(parseFloat(inventarioDespues[0].costo_promedio_actual)).toBe(8.00);
      
      // La venta debe recalcularse con el nuevo costo promedio
      expect(parseFloat(ventaDespues[0].costo_unitario)).toBe(8.00);
      expect(parseFloat(ventaDespues[0].costo_total)).toBe(80.00);
      
      // El comprobante de venta debe actualizarse
      expect(parseFloat(comprobanteVentaDespues[0].subtotal)).toBe(80.00);
      // Total = subtotal + impuesto (18% sobre 80 = 14.40)
      expect(parseFloat(comprobanteVentaDespues[0].total)).toBe(94.40);
    });

    it('debe manejar múltiples productos en el mismo movimiento retroactivo', async () => {
      // TODO: Implementar test para múltiples productos
      expect(true).toBe(true);
    });

    it('debe manejar errores y rollback correctamente', async () => {
      // TODO: Implementar test de manejo de errores
      expect(true).toBe(true);
    });
  });
});