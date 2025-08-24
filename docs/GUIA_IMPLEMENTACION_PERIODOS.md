# Guía de Implementación - Sistema de Períodos Contables

## Introducción

Esta guía proporciona instrucciones paso a paso para implementar y configurar el sistema de períodos contables con recálculo automático de Kardex en un entorno de producción.

## Requisitos Previos

### Dependencias del Sistema

```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.0",
  "typeorm-transactional": "^0.5.0",
  "class-transformer": "^0.5.0",
  "class-validator": "^0.14.0"
}
```

### Configuración de Base de Datos

```sql
-- Crear tablas necesarias
CREATE TABLE periodos_contables (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT FALSE,
    cerrado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(persona_id, anio),
    CONSTRAINT chk_fechas CHECK (fecha_inicio <= fecha_fin)
);

CREATE TABLE configuracion_periodos (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL UNIQUE,
    dias_limite_retroactivo INTEGER DEFAULT 30,
    permitir_movimientos_retroactivos BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX idx_periodos_persona_activo ON periodos_contables(persona_id, activo);
CREATE INDEX idx_periodos_fechas ON periodos_contables(fecha_inicio, fecha_fin);
CREATE INDEX idx_config_persona ON configuracion_periodos(persona_id);
```

## Instalación Paso a Paso

### 1. Configuración del Módulo

```typescript
// src/modules/periodos/periodos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodoContable } from './entities/periodo-contable.entity';
import { ConfiguracionPeriodo } from './entities/configuracion-periodo.entity';
import { PeriodoContableService } from './service/periodo-contable.service';
import { PeriodoContableController } from './controller/periodo-contable.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PeriodoContable,
      ConfiguracionPeriodo
    ])
  ],
  controllers: [PeriodoContableController],
  providers: [PeriodoContableService],
  exports: [PeriodoContableService]
})
export class PeriodosModule {}
```

### 2. Integración en App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { PeriodosModule } from './modules/periodos/periodos.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { ComprobantesModule } from './modules/comprobantes/comprobantes.module';

@Module({
  imports: [
    // ... otras configuraciones
    PeriodosModule,
    InventarioModule,
    ComprobantesModule
  ]
})
export class AppModule {}
```

### 3. Configuración de Variables de Entorno

```bash
# .env
# Configuración de períodos
PERIODOS_DIAS_LIMITE_DEFAULT=30
PERIODOS_PERMITIR_RETROACTIVOS=true
PERIODOS_AUTO_CREAR_ANUAL=true

# Configuración de recálculo
KARDEX_METODO_VALORACION_DEFAULT=PROMEDIO_PONDERADO
KARDEX_BATCH_SIZE=50
KARDEX_TIMEOUT_RECALCULO=300000
```

## Configuración Inicial

### 1. Script de Inicialización

```typescript
// scripts/init-periodos.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PeriodoContableService } from '../src/modules/periodos/service';

async function initializePeriodos() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const periodoService = app.get(PeriodoContableService);
  
  // Obtener todas las personas/empresas
  const personas = await getPersonasActivas();
  
  for (const persona of personas) {
    try {
      // Crear período para el año actual
      const anioActual = new Date().getFullYear();
      
      await periodoService.crearPeriodo({
        personaId: persona.id,
        anio: anioActual,
        fechaInicio: new Date(`${anioActual}-01-01`),
        fechaFin: new Date(`${anioActual}-12-31`),
        activo: true
      });
      
      // Crear configuración por defecto
      await periodoService.crearConfiguracion({
        personaId: persona.id,
        diasLimiteRetroactivo: 30,
        permitirMovimientosRetroactivos: true
      });
      
      console.log(`Período inicializado para persona ${persona.id}`);
    } catch (error) {
      console.error(`Error inicializando persona ${persona.id}:`, error.message);
    }
  }
  
  await app.close();
}

initializePeriodos().catch(console.error);
```

### 2. Migración de Datos Existentes

```typescript
// scripts/migrate-existing-data.ts
async function migrateExistingData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const periodoService = app.get(PeriodoContableService);
  const comprobanteService = app.get(ComprobanteService);
  
  // Obtener comprobantes sin período asignado
  const comprobantes = await comprobanteService.findWithoutPeriodo();
  
  for (const comprobante of comprobantes) {
    try {
      // Buscar o crear período correspondiente
      const anio = comprobante.fechaEmision.getFullYear();
      let periodo = await periodoService.findByPersonaAndAnio(
        comprobante.personaId, 
        anio
      );
      
      if (!periodo) {
        periodo = await periodoService.crearPeriodo({
          personaId: comprobante.personaId,
          anio: anio,
          fechaInicio: new Date(`${anio}-01-01`),
          fechaFin: new Date(`${anio}-12-31`),
          activo: anio === new Date().getFullYear()
        });
      }
      
      // Asignar período al comprobante
      await comprobanteService.assignPeriodo(comprobante.id, periodo.id);
      
    } catch (error) {
      console.error(`Error migrando comprobante ${comprobante.id}:`, error.message);
    }
  }
  
  await app.close();
}
```

## Configuración Avanzada

### 1. Configuración por Empresa

```typescript
// Configuración específica por tipo de empresa
const configuracionesPorTipo = {
  'RETAIL': {
    diasLimiteRetroactivo: 15,
    permitirMovimientosRetroactivos: true,
    metodoValoracionDefault: MetodoValoracion.FIFO
  },
  'MANUFACTURA': {
    diasLimiteRetroactivo: 45,
    permitirMovimientosRetroactivos: true,
    metodoValoracionDefault: MetodoValoracion.PROMEDIO_PONDERADO
  },
  'SERVICIOS': {
    diasLimiteRetroactivo: 30,
    permitirMovimientosRetroactivos: false,
    metodoValoracionDefault: MetodoValoracion.PROMEDIO_PONDERADO
  }
};

// Aplicar configuración
async function configurarEmpresaPorTipo(
  personaId: number, 
  tipoEmpresa: string
) {
  const config = configuracionesPorTipo[tipoEmpresa];
  
  if (config) {
    await periodoService.crearConfiguracion({
      personaId,
      ...config
    });
  }
}
```

### 2. Configuración de Notificaciones

```typescript
// src/modules/periodos/service/notificacion-periodo.service.ts
@Injectable()
export class NotificacionPeriodoService {
  constructor(
    private readonly emailService: EmailService,
    private readonly periodoService: PeriodoContableService
  ) {}
  
  /**
   * Notificar períodos próximos a vencer
   */
  @Cron('0 9 * * 1') // Lunes a las 9 AM
  async notificarPeriodosProximosAVencer() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30); // 30 días antes
    
    const periodosProximos = await this.periodoService
      .findPeriodosProximosAVencer(fechaLimite);
    
    for (const periodo of periodosProximos) {
      await this.enviarNotificacionVencimiento(periodo);
    }
  }
  
  /**
   * Notificar movimientos retroactivos
   */
  async notificarMovimientoRetroactivo(
    personaId: number,
    fechaMovimiento: Date,
    tipoMovimiento: string
  ) {
    const diasRetroactivo = this.calcularDiasRetroactivo(fechaMovimiento);
    
    if (diasRetroactivo > 7) { // Notificar si es más de 7 días
      await this.emailService.enviarNotificacion({
        destinatario: await this.obtenerEmailResponsable(personaId),
        asunto: 'Movimiento Retroactivo Registrado',
        template: 'movimiento-retroactivo',
        datos: {
          fechaMovimiento,
          tipoMovimiento,
          diasRetroactivo
        }
      });
    }
  }
}
```

## Mejores Prácticas

### 1. Validaciones de Negocio

```typescript
// Implementar validaciones específicas del negocio
@Injectable()
export class ValidacionesNegocioService {
  
  /**
   * Validar reglas específicas antes del recálculo
   */
  async validarAntesDeRecalculo(
    movimientoId: number
  ): Promise<ResultadoValidacion> {
    const movimiento = await this.obtenerMovimiento(movimientoId);
    const validaciones = [];
    
    // Validación 1: No recalcular períodos cerrados
    const periodoMovimiento = await this.obtenerPeriodoMovimiento(movimiento);
    if (periodoMovimiento?.cerrado) {
      validaciones.push({
        valido: false,
        mensaje: 'No se puede recalcular movimientos en períodos cerrados'
      });
    }
    
    // Validación 2: Límite de tiempo para recálculos
    const diasDesdeMovimiento = this.calcularDiasDesde(movimiento.fecha);
    if (diasDesdeMovimiento > 90) {
      validaciones.push({
        valido: false,
        mensaje: 'No se pueden recalcular movimientos de más de 90 días'
      });
    }
    
    // Validación 3: Verificar permisos de usuario
    const tienePermisos = await this.verificarPermisosRecalculo(
      movimiento.personaId
    );
    if (!tienePermisos) {
      validaciones.push({
        valido: false,
        mensaje: 'Usuario sin permisos para recálculos'
      });
    }
    
    return {
      valido: validaciones.every(v => v.valido),
      errores: validaciones.filter(v => !v.valido)
    };
  }
}
```

### 2. Optimización de Consultas

```typescript
// Optimizar consultas para mejor rendimiento
@Injectable()
export class OptimizacionConsultasService {
  
  /**
   * Obtener movimientos con paginación
   */
  async obtenerMovimientosPaginados(
    inventarioId: number,
    fechaDesde: Date,
    pagina: number = 1,
    limite: number = 100
  ) {
    return await this.movimientoRepository
      .createQueryBuilder('mov')
      .innerJoinAndSelect('mov.detalles', 'det')
      .where('det.inventario_id = :inventarioId', { inventarioId })
      .andWhere('mov.fecha >= :fechaDesde', { fechaDesde })
      .orderBy('mov.fecha', 'ASC')
      .skip((pagina - 1) * limite)
      .take(limite)
      .getMany();
  }
  
  /**
   * Usar índices compuestos para consultas frecuentes
   */
  async crearIndicesOptimizacion() {
    // Estos índices deben crearse en la migración
    const indices = [
      'CREATE INDEX CONCURRENTLY idx_movimientos_fecha_inventario ON movimientos(fecha, inventario_id)',
      'CREATE INDEX CONCURRENTLY idx_lotes_fecha_cantidad ON inventario_lotes(fecha_ingreso, cantidad_actual)',
      'CREATE INDEX CONCURRENTLY idx_periodos_persona_fechas ON periodos_contables(persona_id, fecha_inicio, fecha_fin)'
    ];
    
    // Ejecutar en migración de base de datos
  }
}
```

### 3. Monitoreo y Alertas

```typescript
// Sistema de monitoreo para recálculos
@Injectable()
export class MonitoreoRecalculoService {
  private readonly metricas = new Map<string, number>();
  
  /**
   * Registrar métricas de recálculo
   */
  registrarMetrica(
    tipo: string,
    valor: number,
    etiquetas: Record<string, string> = {}
  ) {
    const clave = `${tipo}_${JSON.stringify(etiquetas)}`;
    this.metricas.set(clave, valor);
    
    // Enviar a sistema de monitoreo (Prometheus, DataDog, etc.)
    this.enviarAMonitoreo(tipo, valor, etiquetas);
  }
  
  /**
   * Alertas automáticas
   */
  async verificarAlertas() {
    // Alerta: Recálculos tomando mucho tiempo
    const tiempoPromedio = this.calcularTiempoPromedioRecalculo();
    if (tiempoPromedio > 30000) { // 30 segundos
      await this.enviarAlerta({
        tipo: 'RENDIMIENTO',
        mensaje: `Recálculos lentos detectados: ${tiempoPromedio}ms promedio`,
        severidad: 'WARNING'
      });
    }
    
    // Alerta: Muchos errores de recálculo
    const tasaErrores = this.calcularTasaErrores();
    if (tasaErrores > 0.05) { // 5% de errores
      await this.enviarAlerta({
        tipo: 'ERRORES',
        mensaje: `Alta tasa de errores en recálculos: ${tasaErrores * 100}%`,
        severidad: 'CRITICAL'
      });
    }
  }
}
```

## Testing

### 1. Tests Unitarios

```typescript
// tests/periodo-contable.service.spec.ts
describe('PeriodoContableService', () => {
  let service: PeriodoContableService;
  let repository: Repository<PeriodoContable>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodoContableService,
        {
          provide: getRepositoryToken(PeriodoContable),
          useClass: Repository
        }
      ]
    }).compile();
    
    service = module.get<PeriodoContableService>(PeriodoContableService);
    repository = module.get<Repository<PeriodoContable>>(getRepositoryToken(PeriodoContable));
  });
  
  describe('validarFechaEnPeriodoActivo', () => {
    it('debe retornar true para fecha dentro del período activo', async () => {
      // Arrange
      const personaId = 1;
      const fecha = new Date('2024-06-15');
      const periodoMock = {
        id: 1,
        personaId,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        activo: true
      };
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(periodoMock as any);
      
      // Act
      const resultado = await service.validarFechaEnPeriodoActivo(personaId, fecha);
      
      // Assert
      expect(resultado).toBe(true);
    });
    
    it('debe retornar false para fecha fuera del período activo', async () => {
      // Arrange
      const personaId = 1;
      const fecha = new Date('2025-01-15');
      const periodoMock = {
        id: 1,
        personaId,
        fechaInicio: new Date('2024-01-01'),
        fechaFin: new Date('2024-12-31'),
        activo: true
      };
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(periodoMock as any);
      
      // Act
      const resultado = await service.validarFechaEnPeriodoActivo(personaId, fecha);
      
      // Assert
      expect(resultado).toBe(false);
    });
  });
});
```

### 2. Tests de Integración

```typescript
// tests/integration/recalculo-kardex.integration.spec.ts
describe('Recálculo Kardex Integration', () => {
  let app: INestApplication;
  let recalculoService: RecalculoKardexService;
  
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
    
    recalculoService = app.get<RecalculoKardexService>(RecalculoKardexService);
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('Escenario completo de recálculo', () => {
    it('debe recalcular correctamente un movimiento retroactivo', async () => {
      // Arrange: Crear datos de prueba
      const inventario = await crearInventarioPrueba();
      const movimientoRetroactivo = await crearMovimientoPrueba({
        inventarioId: inventario.id,
        fecha: new Date('2024-01-15'),
        cantidad: -50
      });
      
      // Act: Ejecutar recálculo
      const resultado = await recalculoService.recalcularMovimientoRetroactivo(
        movimientoRetroactivo.id
      );
      
      // Assert: Verificar resultados
      expect(resultado.movimientosRecalculados).toBeGreaterThan(0);
      expect(resultado.errores).toHaveLength(0);
      
      // Verificar estado final del inventario
      const inventarioFinal = await obtenerInventario(inventario.id);
      expect(inventarioFinal.stockActual).toBeGreaterThanOrEqual(0);
    });
  });
});
```

## Deployment

### 1. Configuración de Producción

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: coplacont-backend:latest
    environment:
      - NODE_ENV=production
      - PERIODOS_DIAS_LIMITE_DEFAULT=15
      - KARDEX_BATCH_SIZE=100
      - KARDEX_TIMEOUT_RECALCULO=600000
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=coplacont_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### 2. Scripts de Deployment

```bash
#!/bin/bash
# deploy.sh

echo "Iniciando deployment..."

# 1. Backup de base de datos
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Ejecutar migraciones
npm run migration:run

# 3. Verificar integridad de datos
npm run verify:data-integrity

# 4. Deployment de aplicación
docker-compose -f docker-compose.prod.yml up -d

# 5. Verificar salud de la aplicación
sleep 30
curl -f http://localhost:3000/health || exit 1

echo "Deployment completado exitosamente"
```

## Mantenimiento

### 1. Tareas de Mantenimiento Programadas

```typescript
// src/modules/periodos/tasks/mantenimiento.service.ts
@Injectable()
export class MantenimientoService {
  
  /**
   * Limpiar logs antiguos de recálculo
   */
  @Cron('0 2 * * 0') // Domingos a las 2 AM
  async limpiarLogsAntiguos() {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6); // 6 meses
    
    await this.logRepository.delete({
      fechaCreacion: LessThan(fechaLimite)
    });
  }
  
  /**
   * Verificar consistencia de datos
   */
  @Cron('0 3 * * 1') // Lunes a las 3 AM
  async verificarConsistenciaDatos() {
    const inventarios = await this.inventarioRepository.find();
    
    for (const inventario of inventarios) {
      const resultado = await this.validarConsistenciaInventario(inventario.id);
      
      if (!resultado.consistente) {
        await this.reportarInconsistencia(inventario.id, resultado.diferencias);
      }
    }
  }
}
```

### 2. Monitoreo de Salud

```typescript
// src/health/periodos.health.ts
@Injectable()
export class PeriodosHealthIndicator extends HealthIndicator {
  constructor(
    private readonly periodoService: PeriodoContableService
  ) {
    super();
  }
  
  @HealthCheck()
  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      // Verificar que existan períodos activos
      const periodosActivos = await this.periodoService.contarPeriodosActivos();
      
      const isHealthy = periodosActivos > 0;
      
      return this.getStatus('periodos', isHealthy, {
        periodosActivos,
        ultimaVerificacion: new Date().toISOString()
      });
    } catch (error) {
      return this.getStatus('periodos', false, {
        error: error.message
      });
    }
  }
}
```

## Conclusión

Esta guía proporciona una implementación completa del sistema de períodos contables con:

✅ **Configuración paso a paso** para entornos de desarrollo y producción
✅ **Scripts de inicialización** y migración de datos
✅ **Mejores prácticas** de desarrollo y optimización
✅ **Testing comprehensivo** unitario e integración
✅ **Configuración de deployment** y mantenimiento
✅ **Monitoreo y alertas** para operación en producción

Siguiendo esta guía, podrás implementar exitosamente el sistema en cualquier entorno, asegurando la integridad de los datos contables y la eficiencia en el manejo de inventarios.