# Sistema de Períodos Contables y Recálculo de Kardex

## Descripción General

Este sistema implementa una solución completa para la gestión de períodos contables con capacidades avanzadas de recálculo automático de Kardex para movimientos retroactivos. Permite a las empresas mantener la integridad de sus inventarios y costos cuando se registran operaciones con fechas anteriores.

## Arquitectura del Sistema

### Entidades Principales

#### 1. PeriodoContable
```typescript
@Entity('periodos_contables')
export class PeriodoContable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'persona_id' })
  personaId: number;

  @Column({ name: 'anio' })
  anio: number;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: Date;

  @Column({ name: 'activo', default: false })
  activo: boolean;

  @Column({ name: 'cerrado', default: false })
  cerrado: boolean;
}
```

**Propósito**: Gestiona los períodos contables anuales por empresa/persona.

**Características**:
- Un período activo por persona
- Períodos anuales configurables
- Control de estado (activo/cerrado)
- Fechas de inicio y fin personalizables

#### 2. ConfiguracionPeriodo
```typescript
@Entity('configuracion_periodos')
export class ConfiguracionPeriodo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'persona_id' })
  personaId: number;

  @Column({ name: 'dias_limite_retroactivo', default: 30 })
  diasLimiteRetroactivo: number;

  @Column({ name: 'permitir_movimientos_retroactivos', default: true })
  permitirMovimientosRetroactivos: boolean;
}
```

**Propósito**: Configuraciones globales para controlar movimientos retroactivos.

**Características**:
- Límite de días para movimientos retroactivos
- Control de permisos para fechas pasadas
- Configuración por empresa/persona

### Servicios Implementados

#### 1. PeriodoContableService

**Funcionalidades principales**:

```typescript
// Obtener período activo
async obtenerPeriodoActivo(personaId: number): Promise<PeriodoContable | null>

// Validar fecha en período activo
async validarFechaEnPeriodoActivo(personaId: number, fecha: Date): Promise<boolean>

// Validar movimiento retroactivo
async validarMovimientoRetroactivo(personaId: number, fecha: Date): Promise<boolean>

// Crear nuevo período
async crearPeriodo(dto: CreatePeriodoContableDto): Promise<PeriodoContable>

// Cerrar período
async cerrarPeriodo(id: number): Promise<void>
```

**Ejemplo de uso**:
```typescript
// Validar si se puede registrar un comprobante
const fechaValida = await periodoService.validarFechaEnPeriodoActivo(1, new Date('2024-03-15'));
if (!fechaValida) {
  throw new BadRequestException('Fecha fuera del período activo');
}
```

#### 2. RecalculoKardexService

**Funcionalidades principales**:

```typescript
// Recalcular movimiento retroactivo
async recalcularMovimientoRetroactivo(
  movimientoId: number,
  metodoValoracion: MetodoValoracion = MetodoValoracion.PROMEDIO_PONDERADO
): Promise<ResultadoRecalculo>

// Recalcular consumo de lotes
private async recalcularConsumoLote(
  inventarioId: number,
  fechaMovimiento: Date,
  cantidadTotal: number
): Promise<void>

// Actualizar costo promedio
private async actualizarCostoPromedio(
  inventario: Inventario,
  detalle: MovimientoDetalle
): Promise<void>
```

**Estrategias de valoración**:
- **FIFO (First In, First Out)**: Consume primero los lotes más antiguos
- **LIFO (Last In, First Out)**: Consume primero los lotes más recientes
- **Promedio Ponderado**: Actualiza el costo promedio con cada entrada

**Ejemplo de recálculo**:
```typescript
// Recalcular después de un movimiento retroactivo
const resultado = await recalculoService.recalcularMovimientoRetroactivo(
  movimientoId,
  MetodoValoracion.PROMEDIO_PONDERADO
);

console.log(`Movimientos recalculados: ${resultado.movimientosRecalculados}`);
console.log(`Lotes afectados: ${resultado.lotesAfectados}`);
```

#### 3. KardexService (Modificado)

**Nuevas funcionalidades**:

```typescript
// Procesar movimiento retroactivo
async procesarMovimientoRetroactivo(
  movimientoId: number,
  metodoValoracion: MetodoValoracion
): Promise<ResultadoRecalculo>

// Recalcular múltiples movimientos
async recalcularMovimientosRetroactivos(
  movimientoIds: number[],
  metodoValoracion: MetodoValoracion
): Promise<ResultadoRecalculo[]>

// Obtener estadísticas de recálculo
async obtenerEstadisticasRecalculo(personaId: number): Promise<any>
```

#### 4. ComprobanteService (Modificado)

**Validaciones integradas**:

```typescript
// Validación automática en registro
@Transactional()
async register(createComprobanteDto: CreateComprobanteDto, personaId: number): Promise<void> {
  // Validar período activo
  await this.validarPeriodoActivo(personaId, createComprobanteDto.fechaEmision);
  
  // Resto de la lógica...
}

// Validar registro completo
async validarRegistroComprobante(personaId: number, fechaEmision: Date): Promise<boolean>
```

## Flujo de Funcionamiento

### 1. Configuración Inicial

```typescript
// 1. Crear período contable
const periodo = await periodoService.crearPeriodo({
  personaId: 1,
  anio: 2024,
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  activo: true
});

// 2. Configurar límites retroactivos
const config = await periodoService.crearConfiguracion({
  personaId: 1,
  diasLimiteRetroactivo: 30,
  permitirMovimientosRetroactivos: true
});
```

### 2. Registro de Comprobantes

```typescript
// El sistema valida automáticamente:
// 1. Fecha dentro del período activo
// 2. Límites de movimientos retroactivos
// 3. Permisos de la empresa

const comprobante = {
  fechaEmision: new Date('2024-03-15'),
  tipoOperacion: TipoOperacion.COMPRA,
  // ... otros campos
};

// Validación automática en ComprobanteService.register()
await comprobanteService.register(comprobante, personaId);
```

### 3. Recálculo Automático

```typescript
// Cuando se registra un movimiento retroactivo:
// 1. Se detecta que la fecha es anterior a hoy
// 2. Se valida que esté permitido
// 3. Se ejecuta el recálculo automático

const fechaRetroactiva = new Date('2024-02-15'); // Fecha pasada
const movimiento = await movimientoService.crear({
  fecha: fechaRetroactiva,
  // ... detalles
});

// Recálculo automático
const resultado = await kardexService.procesarMovimientoRetroactivo(
  movimiento.id,
  MetodoValoracion.PROMEDIO_PONDERADO
);
```

## Ejemplos Prácticos

### Ejemplo 1: Configuración de Empresa

```typescript
// Configurar períodos para una nueva empresa
const empresaId = 1;

// 1. Crear período 2024
const periodo2024 = await periodoService.crearPeriodo({
  personaId: empresaId,
  anio: 2024,
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  activo: true
});

// 2. Configurar límites
const configuracion = await periodoService.crearConfiguracion({
  personaId: empresaId,
  diasLimiteRetroactivo: 15, // Solo 15 días hacia atrás
  permitirMovimientosRetroactivos: true
});

console.log('Empresa configurada correctamente');
```

### Ejemplo 2: Validación de Fechas

```typescript
// Validar diferentes fechas
const empresaId = 1;
const fechas = [
  new Date('2024-03-15'), // Fecha actual válida
  new Date('2024-02-28'), // Fecha retroactiva válida (dentro de 15 días)
  new Date('2024-01-15'), // Fecha retroactiva inválida (más de 15 días)
  new Date('2025-01-01')  // Fecha futura inválida
];

for (const fecha of fechas) {
  const esValida = await comprobanteService.validarRegistroComprobante(empresaId, fecha);
  console.log(`Fecha ${fecha.toISOString()}: ${esValida ? 'VÁLIDA' : 'INVÁLIDA'}`);
}
```

### Ejemplo 3: Recálculo de Inventario

```typescript
// Escenario: Se registra una compra con fecha retroactiva
const compraRetroactiva = {
  fechaEmision: new Date('2024-02-15'), // 15 días atrás
  tipoOperacion: TipoOperacion.COMPRA,
  detalles: [{
    productoId: 1,
    cantidad: 100,
    costoUnitario: 10.50,
    almacenId: 1
  }]
};

// 1. Registrar comprobante (con validación automática)
await comprobanteService.register(compraRetroactiva, empresaId);

// 2. El sistema automáticamente:
// - Valida la fecha (dentro de 15 días)
// - Registra el movimiento
// - Ejecuta recálculo de Kardex
// - Actualiza costos promedio
// - Recalcula movimientos posteriores

// 3. Obtener estadísticas del recálculo
const estadisticas = await kardexService.obtenerEstadisticasRecalculo(empresaId);
console.log('Recálculo completado:', estadisticas);
```

### Ejemplo 4: Manejo de Lotes FIFO

```typescript
// Escenario: Producto con múltiples lotes
// Lote 1: 50 unidades a $10.00 (2024-02-01)
// Lote 2: 30 unidades a $12.00 (2024-02-15)
// Venta retroactiva: 40 unidades (2024-02-10)

const ventaRetroactiva = {
  fechaEmision: new Date('2024-02-10'),
  tipoOperacion: TipoOperacion.VENTA,
  detalles: [{
    productoId: 1,
    cantidad: -40, // Salida
    almacenId: 1
  }]
};

// Al registrar esta venta:
// 1. Sistema detecta fecha retroactiva
// 2. Aplica FIFO: consume 40 unidades del Lote 1
// 3. Recalcula movimientos posteriores
// 4. Actualiza stock actual: Lote 1 = 10 unidades, Lote 2 = 30 unidades

await comprobanteService.register(ventaRetroactiva, empresaId);
```

## API Endpoints

### PeriodoContableController

```typescript
// Obtener períodos
GET /api/periodos-contables?personaId=1

// Crear período
POST /api/periodos-contables
{
  "personaId": 1,
  "anio": 2024,
  "fechaInicio": "2024-01-01",
  "fechaFin": "2024-12-31",
  "activo": true
}

// Activar período
PATCH /api/periodos-contables/1/activar

// Cerrar período
PATCH /api/periodos-contables/1/cerrar

// Configurar límites
POST /api/periodos-contables/configuracion
{
  "personaId": 1,
  "diasLimiteRetroactivo": 30,
  "permitirMovimientosRetroactivos": true
}
```

### Respuestas de API

```typescript
// Respuesta de período
{
  "id": 1,
  "personaId": 1,
  "anio": 2024,
  "fechaInicio": "2024-01-01",
  "fechaFin": "2024-12-31",
  "activo": true,
  "cerrado": false,
  "fechaCreacion": "2024-01-01T00:00:00.000Z",
  "fechaActualizacion": "2024-01-01T00:00:00.000Z"
}

// Respuesta de recálculo
{
  "movimientosRecalculados": 15,
  "lotesAfectados": 8,
  "inventariosActualizados": 5,
  "tiempoEjecucion": "2.3s",
  "errores": []
}
```

## Validaciones y Controles

### 1. Validaciones de Período

- **Un período activo por persona**: Solo puede existir un período activo simultáneamente
- **Fechas coherentes**: La fecha de inicio debe ser menor a la fecha de fin
- **Períodos anuales**: Cada período debe corresponder a un año específico
- **No solapamiento**: Los períodos no pueden solaparse en fechas

### 2. Validaciones de Movimientos

- **Fecha en período activo**: Los movimientos deben estar dentro del período activo
- **Límite retroactivo**: Las fechas pasadas no pueden exceder el límite configurado
- **Permisos**: Se respetan los permisos de movimientos retroactivos
- **Stock disponible**: Se valida que exista stock suficiente en la fecha del movimiento

### 3. Validaciones de Recálculo

- **Integridad de datos**: Se verifica la consistencia antes y después del recálculo
- **Orden cronológico**: Los movimientos se procesan en orden de fecha
- **Validación de lotes**: Se verifica que los lotes tengan stock suficiente
- **Costos coherentes**: Los costos promedio se mantienen dentro de rangos lógicos

## Manejo de Errores

### Errores Comunes

```typescript
// Error: Fecha fuera de período
{
  "statusCode": 400,
  "message": "La fecha de emisión del comprobante no está dentro del período contable activo",
  "error": "Bad Request"
}

// Error: Movimiento retroactivo no permitido
{
  "statusCode": 400,
  "message": "No se pueden registrar comprobantes con fechas retroactivas más allá del límite configurado",
  "error": "Bad Request"
}

// Error: Stock insuficiente
{
  "statusCode": 400,
  "message": "Stock insuficiente en la fecha especificada para el producto X",
  "error": "Bad Request"
}
```

## Consideraciones de Rendimiento

### Optimizaciones Implementadas

1. **Índices de base de datos**: En fechas y relaciones frecuentes
2. **Consultas optimizadas**: Uso de joins eficientes y filtros apropiados
3. **Transacciones**: Operaciones atómicas para mantener consistencia
4. **Caché de períodos**: Los períodos activos se mantienen en caché
5. **Procesamiento por lotes**: Los recálculos masivos se procesan eficientemente

### Recomendaciones

- **Límites retroactivos**: Mantener límites razonables (15-30 días)
- **Cierre de períodos**: Cerrar períodos antiguos para mejorar rendimiento
- **Monitoreo**: Supervisar el tiempo de ejecución de recálculos
- **Backup**: Realizar respaldos antes de recálculos masivos

## Conclusión

Este sistema proporciona una solución robusta y completa para la gestión de períodos contables con recálculo automático de Kardex. Las características principales incluyen:

✅ **Gestión flexible de períodos** por empresa
✅ **Validaciones automáticas** de fechas y permisos
✅ **Recálculo inteligente** de inventarios y costos
✅ **Múltiples estrategias** de valoración (FIFO, LIFO, Promedio)
✅ **API completa** con documentación Swagger
✅ **Manejo robusto** de errores y validaciones
✅ **Optimizaciones** de rendimiento

El sistema está diseñado para manejar operaciones contables complejas manteniendo la integridad de los datos y proporcionando flexibilidad para diferentes necesidades empresariales.