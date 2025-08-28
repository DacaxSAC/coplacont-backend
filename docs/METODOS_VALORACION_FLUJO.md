# Flujo de Métodos de Valoración

## Descripción General

El sistema de métodos de valoración permite configurar cómo se valoran los inventarios durante las operaciones de compra y venta. Los métodos soportados son **PROMEDIO** y **FIFO**, y se configuran a nivel de periodo contable.

## Métodos de Valoración Soportados

### 1. PROMEDIO (Por defecto)
- **Descripción**: Utiliza el costo promedio ponderado del inventario
- **Para compras**: Recalcula el promedio con la nueva entrada
- **Para ventas**: Aplica el costo promedio actual a todas las salidas
- **Distribución física**: FIFO (primero en entrar, primero en salir)
- **Valoración contable**: Costo promedio ponderado

### 2. FIFO (First In, First Out)
- **Descripción**: Primero en entrar, primero en salir
- **Para compras**: Registra el lote con su costo específico
- **Para ventas**: Consume los lotes más antiguos primero
- **Cálculo**: Costo unitario promedio ponderado de los lotes consumidos

## Arquitectura del Sistema

### Entidades Principales

#### ConfiguracionPeriodo
```typescript
@Entity('configuracion_periodo')
export class ConfiguracionPeriodo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PeriodoContable)
  @JoinColumn({ name: 'id_periodo' })
  periodo: PeriodoContable;

  @Column({
    type: 'enum',
    enum: MetodoValoracion,
    default: MetodoValoracion.PROMEDIO
  })
  metodoValoracion: MetodoValoracion;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}
```

#### MetodoValoracion Enum
```typescript
export enum MetodoValoracion {
  PROMEDIO = 'promedio',
  FIFO = 'fifo'
}
```

## Flujo de Configuración

### 1. Configuración Inicial

#### Creación de Periodo
Cuando se crea un nuevo periodo contable:

```typescript
// En PeriodoContableService.create()
async create(createPeriodoContableDto: CreatePeriodoContableDto): Promise<PeriodoContable> {
  // 1. Crear el periodo
  const periodo = await this.periodoContableRepository.save(nuevoPeriodo);
  
  // 2. Crear configuración con método por defecto
  const configuracion = this.configuracionPeriodoRepository.create({
    periodo: periodo,
    metodoValoracion: MetodoValoracion.PROMEDIO // Por defecto
  });
  
  await this.configuracionPeriodoRepository.save(configuracion);
  return periodo;
}
```

#### Obtener Configuración Activa
```typescript
async obtenerConfiguracionActiva(personaId: number): Promise<ConfiguracionPeriodo> {
  const periodoActivo = await this.obtenerPeriodoActivo(personaId);
  
  if (!periodoActivo) {
    throw new Error('No hay periodo activo');
  }

  const configuracion = await this.configuracionPeriodoRepository.findOne({
    where: { periodo: { id: periodoActivo.id } },
    relations: ['periodo']
  });

  return configuracion;
}
```

### 2. Actualización de Método de Valoración

#### Endpoint de Actualización
```typescript
// PUT /api/periodos/:id/metodo-valoracion
@Put(':id/metodo-valoracion')
async actualizarMetodoValoracion(
  @Param('id') id: number,
  @Body() updateDto: UpdateMetodoValoracionDto
): Promise<ResponseDto<ConfiguracionPeriodo>> {
  const configuracion = await this.periodoContableService
    .actualizarMetodoValoracion(id, updateDto.metodoValoracion);
  
  return {
    success: true,
    message: 'Método de valoración actualizado exitosamente',
    data: configuracion
  };
}
```

#### Validaciones Implementadas
```typescript
async actualizarMetodoValoracion(
  periodoId: number, 
  nuevoMetodo: MetodoValoracion
): Promise<ConfiguracionPeriodo> {
  
  // 1. Validar que el periodo existe
  const periodo = await this.periodoContableRepository.findOne({
    where: { id: periodoId }
  });
  
  if (!periodo) {
    throw new NotFoundException('Periodo no encontrado');
  }

  // 2. Validar que no hay movimientos en el periodo
  const tieneMovimientos = await this.validarMovimientosEnPeriodo(periodoId);
  
  if (tieneMovimientos) {
    throw new BadRequestException(
      'No se puede cambiar el método de valoración porque ya existen movimientos en este periodo'
    );
  }

  // 3. Actualizar configuración
  const configuracion = await this.configuracionPeriodoRepository.findOne({
    where: { periodo: { id: periodoId } }
  });

  configuracion.metodoValoracion = nuevoMetodo;
  return await this.configuracionPeriodoRepository.save(configuracion);
}
```

#### Validación de Movimientos
```typescript
private async validarMovimientosEnPeriodo(periodoId: number): Promise<boolean> {
  // Verificar si hay comprobantes en el periodo
  const comprobantes = await this.comprobanteRepository.count({
    where: {
      fechaEmision: Between(
        periodo.fechaInicio,
        periodo.fechaFin
      )
    }
  });

  return comprobantes > 0;
}
```

## Flujo de Procesamiento en Comprobantes

### 1. Obtención del Método de Valoración

#### En ComprobanteService
```typescript
async register(createComprobanteDto: CreateComprobanteDto): Promise<Comprobante> {
  // 1. Obtener método de valoración desde configuración
  let metodoValoracion = createComprobanteDto.metodoValoracion;
  
  if (!metodoValoracion) {
    const configuracion = await this.periodoContableService
      .obtenerConfiguracionActiva(createComprobanteDto.idPersona);
    
    metodoValoracion = configuracion.metodoValoracion;
  }

  // 2. Procesar comprobante con método determinado
  const comprobante = await this.procesarComprobante(
    createComprobanteDto, 
    metodoValoracion
  );
  
  return comprobante;
}
```

### 2. Aplicación del Método en Lotes

#### Procesamiento de Lotes
```typescript
// En LoteService.procesarLotesComprobante()
async procesarLotesComprobante(
  comprobante: Comprobante, 
  metodoValoracion: MetodoValoracion
): Promise<void> {
  
  for (const detalle of comprobante.detalles) {
    if (comprobante.tipoOperacion === TipoOperacion.COMPRA) {
      await this.registrarLoteCompra(detalle, metodoValoracion);
    } else if (comprobante.tipoOperacion === TipoOperacion.VENTA) {
      await this.procesarVenta(detalle, metodoValoracion);
    }
  }
}
```

#### Método PROMEDIO
```typescript
private async aplicarMetodoPromedio(
  detalle: ComprobanteDetalle
): Promise<void> {
  
  const inventario = detalle.inventario;
  const cantidad = Number(detalle.cantidad);
  const precioUnitario = Number(detalle.precioUnitario);

  // Calcular nuevo costo promedio ponderado
  const stockActual = Number(inventario.stockActual);
  const costoActual = Number(inventario.costoPromedioActual);
  
  const valorActual = stockActual * costoActual;
  const valorNuevo = cantidad * precioUnitario;
  const stockTotal = stockActual + cantidad;
  
  const nuevoCostoPromedio = (valorActual + valorNuevo) / stockTotal;
  
  // Actualizar inventario
  await this.inventarioRepository.update(inventario.id, {
    stockActual: stockTotal,
    costoPromedioActual: nuevoCostoPromedio
  });
}
```

#### Método FIFO
```typescript
private async aplicarMetodoFifo(
  detalle: ComprobanteDetalle
): Promise<void> {
  
  // Para compras: crear nuevo lote
  if (detalle.comprobante.tipoOperacion === TipoOperacion.COMPRA) {
    await this.crearLote(detalle);
  }
  
  // Para ventas: consumir lotes más antiguos
  if (detalle.comprobante.tipoOperacion === TipoOperacion.VENTA) {
    await this.consumirLotesFifo(detalle);
  }
}

private async consumirLotesFifo(
  detalle: ComprobanteDetalle
): Promise<void> {
  
  const cantidadRequerida = Number(detalle.cantidad);
  let cantidadPendiente = cantidadRequerida;
  
  // Obtener lotes ordenados por fecha (FIFO)
  const lotes = await this.inventarioLoteRepository.find({
    where: {
      inventario: { id: detalle.inventario.id },
      cantidadActual: MoreThan(0)
    },
    order: { fechaIngreso: 'ASC' }
  });
  
  for (const lote of lotes) {
    if (cantidadPendiente <= 0) break;
    
    const cantidadAConsumir = Math.min(
      cantidadPendiente, 
      Number(lote.cantidadActual)
    );
    
    // Actualizar lote
    lote.cantidadActual = Number(lote.cantidadActual) - cantidadAConsumir;
    await this.inventarioLoteRepository.save(lote);
    
    cantidadPendiente -= cantidadAConsumir;
  }
}
```

## Endpoints de la API

### Configuración de Métodos de Valoración

#### 1. Obtener Configuración Actual
```http
GET /api/periodos/activo/configuracion
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración obtenida exitosamente",
  "data": {
    "id": 1,
    "metodoValoracion": "promedio",
    "periodo": {
      "id": 1,
      "nombre": "2024",
      "fechaInicio": "2024-01-01",
      "fechaFin": "2024-12-31",
      "activo": true
    }
  }
}
```

#### 2. Actualizar Método de Valoración
```http
PUT /api/periodos/{periodoId}/metodo-valoracion
Content-Type: application/json
Authorization: Bearer {token}

{
  "metodoValoracion": "fifo"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Método de valoración actualizado exitosamente",
  "data": {
    "id": 1,
    "metodoValoracion": "fifo",
    "fechaActualizacion": "2024-01-15T10:30:00Z"
  }
}
```

**Error - Periodo con Movimientos:**
```json
{
  "success": false,
  "message": "No se puede cambiar el método de valoración porque ya existen movimientos en este periodo",
  "statusCode": 400
}
```

### Comprobantes con Método de Valoración

#### Crear Comprobante (Método Automático)
```http
POST /api/comprobante
Content-Type: application/json
Authorization: Bearer {token}

{
  "idPersona": 1,
  "tipoOperacion": "compra",
  "tipoComprobante": "FACTURA",
  "fechaEmision": "2024-01-15",
  "moneda": "PEN",
  "detalles": [
    {
      "idInventario": 1,
      "cantidad": 10,
      "unidadMedida": "UND",
      "precioUnitario": 100.00,
      "subtotal": 1000.00,
      "igv": 180.00,
      "total": 1180.00
    }
  ]
  // metodoValoracion se obtiene automáticamente de la configuración
}
```

#### Crear Comprobante (Método Específico)
```http
POST /api/comprobante
Content-Type: application/json
Authorization: Bearer {token}

{
  "idPersona": 1,
  "tipoOperacion": "compra",
  "tipoComprobante": "FACTURA",
  "fechaEmision": "2024-01-15",
  "moneda": "PEN",
  "metodoValoracion": "fifo", // Sobrescribe la configuración
  "detalles": [...]
}
```

## Validaciones y Restricciones

### 1. Cambio de Método de Valoración
- ✅ Solo se puede cambiar si no hay movimientos en el periodo
- ✅ Requiere periodo activo válido
- ✅ Validación de enum de métodos soportados

### 2. Procesamiento de Comprobantes
- ✅ Método automático desde configuración si no se especifica
- ✅ Posibilidad de sobrescribir método por comprobante
- ✅ Validación de inventarios existentes

### 3. Integridad de Datos
- ✅ Transacciones para operaciones críticas
- ✅ Validación de stock disponible para ventas
- ✅ Cálculos precisos con decimales

## Casos de Uso

### Caso 1: Configuración Inicial
1. Se crea un nuevo periodo contable
2. Se genera automáticamente configuración con método PROMEDIO
3. Usuario puede cambiar a FIFO antes de registrar movimientos

### Caso 2: Cambio de Método
1. Usuario intenta cambiar método de valoración
2. Sistema valida que no hay movimientos en el periodo
3. Si es válido, actualiza la configuración
4. Nuevos comprobantes usan el método actualizado

### Caso 3: Procesamiento de Comprobante
1. Se recibe solicitud de crear comprobante
2. Si no especifica método, se obtiene de configuración
3. Se procesa según el método determinado
4. Se actualizan inventarios y lotes correspondientes

## Logging y Monitoreo

El sistema incluye logging detallado para:
- Cambios de configuración de métodos
- Procesamiento de lotes por método
- Cálculos de costos promedio
- Consumo de lotes FIFO
- Errores de validación

```typescript
// Ejemplo de logging
console.log(`🔄 Aplicando método ${metodoValoracion} para inventario ${inventarioId}`);
console.log(`📊 Nuevo costo promedio: ${nuevoCostoPromedio}`);
console.log(`📦 Lote FIFO consumido: ${loteId}, cantidad: ${cantidadConsumida}`);
```

## Consideraciones de Performance

- **Índices**: Configurados en fechas de ingreso para consultas FIFO eficientes
- **Transacciones**: Uso de `@Transactional()` para operaciones críticas
- **Caching**: Configuración de periodo activo cacheada por sesión
- **Bulk Operations**: Procesamiento en lotes para múltiples detalles

## Migración y Compatibilidad

- **Backwards Compatibility**: Comprobantes existentes mantienen su método original
- **Migración**: Script para crear configuraciones para periodos existentes
- **Rollback**: Posibilidad de revertir cambios si no hay movimientos posteriores