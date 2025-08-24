# Sistema Avanzado de Recálculo de Kardex

## Introducción

El sistema de recálculo de Kardex es una funcionalidad crítica que permite mantener la integridad de los inventarios cuando se registran movimientos con fechas retroactivas. Este documento detalla el funcionamiento interno, algoritmos y casos de uso específicos.

## Algoritmos de Recálculo

### 1. Estrategia FIFO (First In, First Out)

**Principio**: Los productos que ingresan primero son los primeros en salir.

```typescript
/**
 * Algoritmo FIFO para consumo de lotes
 * @param inventarioId ID del inventario
 * @param cantidadAConsumir Cantidad total a consumir
 * @param fechaMovimiento Fecha del movimiento
 */
private async consumirLotesFIFO(
  inventarioId: number,
  cantidadAConsumir: number,
  fechaMovimiento: Date
): Promise<ConsumoLote[]> {
  // 1. Obtener lotes ordenados por fecha de ingreso (más antiguos primero)
  const lotes = await this.inventarioLoteRepository
    .createQueryBuilder('lote')
    .where('lote.inventario_id = :inventarioId', { inventarioId })
    .andWhere('lote.fecha_ingreso <= :fecha', { fecha: fechaMovimiento })
    .andWhere('lote.cantidad_actual > 0')
    .orderBy('lote.fecha_ingreso', 'ASC')
    .addOrderBy('lote.id', 'ASC')
    .getMany();

  const consumos: ConsumoLote[] = [];
  let cantidadRestante = cantidadAConsumir;

  // 2. Consumir lotes en orden FIFO
  for (const lote of lotes) {
    if (cantidadRestante <= 0) break;

    const cantidadDelLote = Math.min(lote.cantidadActual, cantidadRestante);
    
    consumos.push({
      loteId: lote.id,
      cantidad: cantidadDelLote,
      costoUnitario: lote.costoUnitario,
      fechaIngreso: lote.fechaIngreso
    });

    cantidadRestante -= cantidadDelLote;
  }

  return consumos;
}
```

**Ejemplo FIFO**:
```
Inventario inicial:
- Lote A: 100 unidades @ $10.00 (2024-01-15)
- Lote B: 50 unidades @ $12.00 (2024-01-20)
- Lote C: 75 unidades @ $11.00 (2024-01-25)

Venta retroactiva: 120 unidades (2024-01-22)

Consumo FIFO:
1. Lote A: 100 unidades @ $10.00 (se agota)
2. Lote B: 20 unidades @ $12.00 (quedan 30)

Resultado:
- Lote A: 0 unidades
- Lote B: 30 unidades @ $12.00
- Lote C: 75 unidades @ $11.00 (no afectado)
```

### 2. Estrategia LIFO (Last In, First Out)

**Principio**: Los productos que ingresan último son los primeros en salir.

```typescript
/**
 * Algoritmo LIFO para consumo de lotes
 */
private async consumirLotesLIFO(
  inventarioId: number,
  cantidadAConsumir: number,
  fechaMovimiento: Date
): Promise<ConsumoLote[]> {
  // Obtener lotes ordenados por fecha de ingreso (más recientes primero)
  const lotes = await this.inventarioLoteRepository
    .createQueryBuilder('lote')
    .where('lote.inventario_id = :inventarioId', { inventarioId })
    .andWhere('lote.fecha_ingreso <= :fecha', { fecha: fechaMovimiento })
    .andWhere('lote.cantidad_actual > 0')
    .orderBy('lote.fecha_ingreso', 'DESC')
    .addOrderBy('lote.id', 'DESC')
    .getMany();

  // Lógica similar a FIFO pero con orden inverso
  // ...
}
```

**Ejemplo LIFO**:
```
Mismo inventario inicial:

Venta retroactiva: 120 unidades (2024-01-22)

Consumo LIFO:
1. Lote B: 50 unidades @ $12.00 (se agota, era el más reciente hasta la fecha)
2. Lote A: 70 unidades @ $10.00 (quedan 30)

Resultado:
- Lote A: 30 unidades @ $10.00
- Lote B: 0 unidades
- Lote C: 75 unidades @ $11.00 (no afectado)
```

### 3. Costo Promedio Ponderado

**Principio**: El costo se calcula como promedio ponderado de todas las entradas.

```typescript
/**
 * Actualizar costo promedio ponderado
 */
private async actualizarCostoPromedio(
  inventario: Inventario,
  detalle: MovimientoDetalle
): Promise<void> {
  // Solo para entradas (cantidad positiva)
  if (detalle.cantidad <= 0) return;

  const stockAnterior = inventario.stockActual;
  const costoAnterior = inventario.costoPromedioActual || 0;
  const cantidadNueva = detalle.cantidad;
  const costoNuevo = detalle.costoUnitario;

  // Fórmula del promedio ponderado
  const valorAnterior = stockAnterior * costoAnterior;
  const valorNuevo = cantidadNueva * costoNuevo;
  const stockTotal = stockAnterior + cantidadNueva;
  
  const costoPromedio = stockTotal > 0 
    ? (valorAnterior + valorNuevo) / stockTotal 
    : costoNuevo;

  // Actualizar inventario
  await this.inventarioRepository.update(inventario.id, {
    stockActual: stockTotal,
    costoPromedioActual: costoPromedio,
    fechaActualizacion: new Date()
  });
}
```

**Ejemplo Promedio Ponderado**:
```
Stock inicial: 100 unidades @ $10.00
Compra retroactiva: 50 unidades @ $14.00

Cálculo:
Valor anterior: 100 × $10.00 = $1,000
Valor nuevo: 50 × $14.00 = $700
Stock total: 150 unidades
Costo promedio: ($1,000 + $700) ÷ 150 = $11.33

Resultado: 150 unidades @ $11.33
```

## Casos de Uso Complejos

### Caso 1: Múltiples Movimientos Retroactivos

**Escenario**: Se registran varios movimientos con fechas diferentes en el pasado.

```typescript
// Movimientos a procesar:
const movimientos = [
  { fecha: '2024-02-10', tipo: 'COMPRA', cantidad: 100, costo: 10.00 },
  { fecha: '2024-02-15', tipo: 'VENTA', cantidad: -50 },
  { fecha: '2024-02-12', tipo: 'COMPRA', cantidad: 30, costo: 12.00 },
  { fecha: '2024-02-18', tipo: 'VENTA', cantidad: -25 }
];

// El sistema debe:
// 1. Ordenar por fecha cronológica
// 2. Procesar cada movimiento en orden
// 3. Recalcular movimientos posteriores

const movimientosOrdenados = movimientos.sort((a, b) => 
  new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
);

for (const mov of movimientosOrdenados) {
  await this.procesarMovimientoIndividual(mov);
  await this.recalcularMovimientosPosteriores(mov.fecha);
}
```

**Flujo de procesamiento**:
```
1. 2024-02-10: Compra 100 @ $10.00
   Stock: 100 @ $10.00

2. 2024-02-12: Compra 30 @ $12.00
   Stock: 130 @ $10.46 (promedio ponderado)

3. 2024-02-15: Venta 50
   Stock: 80 @ $10.46 (FIFO: consume del lote más antiguo)

4. 2024-02-18: Venta 25
   Stock: 55 @ $10.46
```

### Caso 2: Ajustes de Inventario

**Escenario**: Se detectan diferencias en inventario físico y se requieren ajustes.

```typescript
/**
 * Procesar ajuste de inventario
 */
async procesarAjusteInventario(
  inventarioId: number,
  cantidadFisica: number,
  fechaAjuste: Date,
  motivo: string
): Promise<void> {
  const inventario = await this.inventarioRepository.findOne({
    where: { id: inventarioId }
  });

  const diferencia = cantidadFisica - inventario.stockActual;
  
  if (diferencia !== 0) {
    // Crear movimiento de ajuste
    const movimientoAjuste = await this.crearMovimientoAjuste({
      inventarioId,
      cantidad: diferencia,
      fecha: fechaAjuste,
      motivo,
      tipo: diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO'
    });

    // Recalcular desde la fecha del ajuste
    await this.recalcularDesde(fechaAjuste, inventarioId);
  }
}
```

### Caso 3: Transferencias Entre Almacenes

**Escenario**: Movimiento de productos entre diferentes almacenes con fechas retroactivas.

```typescript
/**
 * Procesar transferencia retroactiva
 */
async procesarTransferenciaRetroactiva(
  productoId: number,
  almacenOrigenId: number,
  almacenDestinoId: number,
  cantidad: number,
  fechaTransferencia: Date
): Promise<void> {
  // 1. Validar stock en almacén origen en la fecha específica
  const stockOrigen = await this.validarStockEnFecha(
    productoId, 
    almacenOrigenId, 
    fechaTransferencia
  );

  if (stockOrigen < cantidad) {
    throw new BadRequestException(
      `Stock insuficiente en almacén origen en la fecha ${fechaTransferencia}`
    );
  }

  // 2. Crear movimientos de salida y entrada
  const movimientoSalida = await this.crearMovimiento({
    productoId,
    almacenId: almacenOrigenId,
    cantidad: -cantidad,
    fecha: fechaTransferencia,
    tipo: 'TRANSFERENCIA_SALIDA'
  });

  const movimientoEntrada = await this.crearMovimiento({
    productoId,
    almacenId: almacenDestinoId,
    cantidad: cantidad,
    fecha: fechaTransferencia,
    tipo: 'TRANSFERENCIA_ENTRADA',
    costoUnitario: await this.obtenerCostoPromedio(productoId, almacenOrigenId)
  });

  // 3. Recalcular ambos almacenes
  await Promise.all([
    this.recalcularInventario(productoId, almacenOrigenId, fechaTransferencia),
    this.recalcularInventario(productoId, almacenDestinoId, fechaTransferencia)
  ]);
}
```

## Validaciones Avanzadas

### 1. Validación de Consistencia

```typescript
/**
 * Validar consistencia del inventario
 */
async validarConsistenciaInventario(
  inventarioId: number
): Promise<ResultadoValidacion> {
  const inventario = await this.inventarioRepository.findOne({
    where: { id: inventarioId },
    relations: ['lotes', 'movimientos']
  });

  // 1. Validar que la suma de lotes = stock actual
  const stockLotes = inventario.lotes.reduce(
    (sum, lote) => sum + lote.cantidadActual, 0
  );

  // 2. Validar que los movimientos sumen correctamente
  const stockMovimientos = inventario.movimientos.reduce(
    (sum, mov) => sum + mov.cantidad, 0
  );

  // 3. Validar costos promedio
  const costoCalculado = this.calcularCostoPromedio(inventario.lotes);

  return {
    consistente: stockLotes === inventario.stockActual && 
                stockMovimientos === inventario.stockActual &&
                Math.abs(costoCalculado - inventario.costoPromedioActual) < 0.01,
    diferencias: {
      stockLotes: stockLotes - inventario.stockActual,
      stockMovimientos: stockMovimientos - inventario.stockActual,
      costoDiferencia: costoCalculado - inventario.costoPromedioActual
    }
  };
}
```

### 2. Validación de Stock Negativo

```typescript
/**
 * Validar que no se genere stock negativo
 */
async validarStockNegativo(
  inventarioId: number,
  fechaDesde: Date
): Promise<boolean> {
  // Obtener todos los movimientos desde la fecha
  const movimientos = await this.movimientoRepository
    .createQueryBuilder('mov')
    .innerJoin('mov.detalles', 'det')
    .where('det.inventario_id = :inventarioId', { inventarioId })
    .andWhere('mov.fecha >= :fecha', { fecha: fechaDesde })
    .orderBy('mov.fecha', 'ASC')
    .getMany();

  let stockAcumulado = await this.obtenerStockEnFecha(inventarioId, fechaDesde);

  for (const movimiento of movimientos) {
    for (const detalle of movimiento.detalles) {
      stockAcumulado += detalle.cantidad;
      
      if (stockAcumulado < 0) {
        throw new BadRequestException(
          `Stock negativo detectado en fecha ${movimiento.fecha} ` +
          `para inventario ${inventarioId}. Stock: ${stockAcumulado}`
        );
      }
    }
  }

  return true;
}
```

## Optimizaciones de Rendimiento

### 1. Procesamiento por Lotes

```typescript
/**
 * Procesar múltiples recálculos en lotes
 */
async procesarRecalculosEnLotes(
  movimientoIds: number[],
  tamanoLote: number = 50
): Promise<ResultadoRecalculo[]> {
  const resultados: ResultadoRecalculo[] = [];
  
  for (let i = 0; i < movimientoIds.length; i += tamanoLote) {
    const lote = movimientoIds.slice(i, i + tamanoLote);
    
    const resultadosLote = await Promise.all(
      lote.map(id => this.recalcularMovimientoRetroactivo(id))
    );
    
    resultados.push(...resultadosLote);
    
    // Pausa pequeña para no sobrecargar la base de datos
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return resultados;
}
```

### 2. Caché de Cálculos

```typescript
/**
 * Cache para evitar recálculos innecesarios
 */
private readonly cacheCalculos = new Map<string, any>();

private getCacheKey(inventarioId: number, fecha: Date): string {
  return `${inventarioId}_${fecha.toISOString().split('T')[0]}`;
}

async obtenerStockEnFechaConCache(
  inventarioId: number,
  fecha: Date
): Promise<number> {
  const cacheKey = this.getCacheKey(inventarioId, fecha);
  
  if (this.cacheCalculos.has(cacheKey)) {
    return this.cacheCalculos.get(cacheKey);
  }
  
  const stock = await this.calcularStockEnFecha(inventarioId, fecha);
  this.cacheCalculos.set(cacheKey, stock);
  
  return stock;
}
```

## Monitoreo y Logging

### 1. Logging Detallado

```typescript
/**
 * Logger específico para recálculos
 */
private readonly logger = new Logger('RecalculoKardexService');

async recalcularMovimientoRetroactivo(
  movimientoId: number,
  metodoValoracion: MetodoValoracion
): Promise<ResultadoRecalculo> {
  const inicioTiempo = Date.now();
  
  this.logger.log(
    `Iniciando recálculo retroactivo para movimiento ${movimientoId} ` +
    `con método ${metodoValoracion}`
  );
  
  try {
    const resultado = await this.ejecutarRecalculo(movimientoId, metodoValoracion);
    
    const tiempoEjecucion = Date.now() - inicioTiempo;
    
    this.logger.log(
      `Recálculo completado en ${tiempoEjecucion}ms. ` +
      `Movimientos afectados: ${resultado.movimientosRecalculados}, ` +
      `Lotes afectados: ${resultado.lotesAfectados}`
    );
    
    return resultado;
  } catch (error) {
    this.logger.error(
      `Error en recálculo de movimiento ${movimientoId}: ${error.message}`,
      error.stack
    );
    throw error;
  }
}
```

### 2. Métricas de Rendimiento

```typescript
/**
 * Recopilar métricas de rendimiento
 */
async obtenerMetricasRecalculo(
  personaId: number,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<MetricasRecalculo> {
  const recalculos = await this.obtenerHistorialRecalculos(
    personaId, 
    fechaDesde, 
    fechaHasta
  );
  
  return {
    totalRecalculos: recalculos.length,
    tiempoPromedioEjecucion: this.calcularTiempoPromedio(recalculos),
    movimientosPromedioAfectados: this.calcularPromedioMovimientos(recalculos),
    erroresEncontrados: recalculos.filter(r => r.errores.length > 0).length,
    eficienciaPromedio: this.calcularEficiencia(recalculos)
  };
}
```

## Casos de Error y Recuperación

### 1. Manejo de Errores Transaccionales

```typescript
@Transactional()
async recalcularConRecuperacion(
  movimientoId: number
): Promise<ResultadoRecalculo> {
  const puntoRestauracion = await this.crearPuntoRestauracion(movimientoId);
  
  try {
    return await this.recalcularMovimientoRetroactivo(movimientoId);
  } catch (error) {
    this.logger.error(`Error en recálculo: ${error.message}`);
    
    // Restaurar estado anterior
    await this.restaurarDesdeCheckpoint(puntoRestauracion);
    
    throw new InternalServerErrorException(
      'Error en recálculo de Kardex. Estado restaurado.'
    );
  }
}
```

### 2. Validación Post-Recálculo

```typescript
/**
 * Validar resultado después del recálculo
 */
async validarResultadoRecalculo(
  inventarioId: number,
  resultadoAnterior: EstadoInventario
): Promise<boolean> {
  const estadoActual = await this.obtenerEstadoInventario(inventarioId);
  
  // Validaciones básicas
  const validaciones = [
    this.validarStockNoNegativo(estadoActual),
    this.validarConsistenciaLotes(estadoActual),
    this.validarCostosRazonables(estadoActual, resultadoAnterior),
    this.validarSumaMovimientos(estadoActual)
  ];
  
  const resultadosValidacion = await Promise.all(validaciones);
  
  return resultadosValidacion.every(v => v === true);
}
```

## Conclusión

El sistema de recálculo de Kardex proporciona:

✅ **Algoritmos robustos** para diferentes estrategias de valoración
✅ **Manejo complejo** de casos de uso empresariales
✅ **Validaciones exhaustivas** para mantener integridad
✅ **Optimizaciones** para rendimiento en gran escala
✅ **Monitoreo detallado** y logging comprehensivo
✅ **Recuperación de errores** y validaciones post-proceso

Este sistema está diseñado para manejar las complejidades del mundo real en la gestión de inventarios, proporcionando flexibilidad y confiabilidad para operaciones contables críticas.