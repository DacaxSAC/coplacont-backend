# Módulo de Productos, Almacenes e Inventario

Este documento describe la implementación del módulo completo de productos, almacenes e inventario en el sistema de contabilidad, incluyendo la gestión de lotes para el cálculo de costos Kardex.

## Estructura del Módulo

El módulo está organizado siguiendo las mejores prácticas de NestJS:

```
src/modules/productos/
├── entities/           # Entidades de base de datos
│   ├── categoria.entity.ts
│   ├── producto.entity.ts
│   ├── almacen.entity.ts
│   ├── inventario.entity.ts
│   ├── inventario-lote.entity.ts
│   └── index.ts
├── dto/               # Data Transfer Objects
│   ├── categoria/
│   ├── producto/
│   ├── almacen/
│   ├── inventario/
│   ├── inventario-lote/
│   └── index.ts
├── service/           # Lógica de negocio
│   ├── categoria.service.ts
│   ├── producto.service.ts
│   ├── almacen.service.ts
│   ├── inventario.service.ts
│   ├── inventario-lote.service.ts
│   └── index.ts
├── controller/        # Controladores REST
│   ├── categoria.controller.ts
│   ├── producto.controller.ts
│   ├── almacen.controller.ts
│   ├── inventario.controller.ts
│   ├── inventario-lote.controller.ts
│   └── index.ts
└── productos.module.ts
```

## Estructura del Módulo

### Entidades

#### 1. Categoria
- **Archivo**: `src/modules/productos/entities/categoria.entity.ts`
- **Campos**:
  - `id`: Identificador único (auto-incremental)
  - `nombre`: Nombre de la categoría (único, requerido)
  - `descripcion`: Descripción opcional
  - `estado`: Estado activo/inactivo (boolean)
  - `fechaCreacion`: Fecha de creación automática
  - `fechaActualizacion`: Fecha de actualización automática
- **Relaciones**: 
  - OneToMany con Producto

#### 2. Producto
- **Archivo**: `src/modules/productos/entities/producto.entity.ts`
- **Campos**:
  - `id`: Identificador único (auto-incremental)
  - `descripcion`: Descripción del producto (requerido)
  - `unidadMedida`: Unidad de medida (requerido)
  - `codigo`: Código único del producto (opcional)
  - `precio`: Precio unitario (opcional)
  - `stockMinimo`: Stock mínimo requerido (opcional)
  - `estado`: Estado activo/inactivo (boolean)
  - `fechaCreacion`: Fecha de creación automática
  - `fechaActualizacion`: Fecha de actualización automática
- **Relaciones**: 
  - ManyToOne con Categoria
  - OneToMany con Inventario

#### 3. Almacen
- **Archivo**: `src/modules/productos/entities/almacen.entity.ts`
- **Campos**:
  - `id`: Identificador único (auto-incremental)
  - `nombre`: Nombre del almacén (único, requerido)
  - `ubicacion`: Ubicación del almacén (requerido)
  - `descripcion`: Descripción opcional
  - `capacidadMaxima`: Capacidad máxima en m² (opcional)
  - `responsable`: Nombre del responsable (opcional)
  - `telefono`: Teléfono de contacto (opcional)
  - `estado`: Estado activo/inactivo (boolean)
  - `fechaCreacion`: Fecha de creación automática
  - `fechaActualizacion`: Fecha de actualización automática
- **Relaciones**: 
  - OneToMany con Inventario

#### 4. Inventario
- **Archivo**: `src/modules/productos/entities/inventario.entity.ts`
- **Campos**:
  - `id`: Identificador único (auto-incremental)
  - `stockActual`: Cantidad disponible (DECIMAL 12,4)
  - `idAlmacen`: Relación con almacén (requerido)
  - `idProducto`: Relación con producto (requerido)
  - `fechaCreacion`: Fecha de creación automática
  - `fechaActualizacion`: Fecha de actualización automática
- **Relaciones**: 
  - ManyToOne con Almacen
  - ManyToOne con Producto
  - OneToMany con InventarioLote
- **Índices**: Único por combinación almacén-producto

#### 5. InventarioLote
- **Archivo**: `src/modules/productos/entities/inventario-lote.entity.ts`
- **Campos**:
  - `id`: Identificador único (auto-incremental)
  - `fechaIngreso`: Fecha real de entrada del lote (requerido)
  - `fechaVencimiento`: Fecha de vencimiento (opcional)
  - `cantidadInicial`: Cantidad con la que entró el lote (DECIMAL 12,4)
  - `cantidadActual`: Cantidad restante en el lote (DECIMAL 12,4)
  - `costoUnitario`: Costo por unidad en este lote (DECIMAL 12,4)
  - `numeroLote`: Número de lote o referencia (opcional)
  - `observaciones`: Observaciones adicionales (opcional)
  - `estado`: Estado activo/inactivo (boolean)
  - `idInventario`: Relación con inventario (requerido)
  - `fechaCreacion`: Fecha de creación automática
  - `fechaActualizacion`: Fecha de actualización automática
- **Relaciones**: 
  - ManyToOne con Inventario

### Servicios

#### CategoriaService
- **Archivo**: `src/modules/productos/service/categoria.service.ts`
- **Métodos**:
  - `create(createCategoriaDto)`: Crear nueva categoría
  - `findAll(includeInactive?)`: Obtener todas las categorías
  - `findOne(id)`: Obtener categoría por ID
  - `update(id, updateCategoriaDto)`: Actualizar categoría
  - `remove(id)`: Eliminar categoría (soft delete)
  - `findByName(nombre)`: Buscar por nombre

#### ProductoService
- **Archivo**: `src/modules/productos/service/producto.service.ts`
- **Métodos**:
  - `create(createProductoDto)`: Crear nuevo producto
  - `findAll(includeInactive?)`: Obtener todos los productos
  - `findOne(id)`: Obtener producto por ID
  - `update(id, updateProductoDto)`: Actualizar producto
  - `remove(id)`: Eliminar producto (soft delete)
  - `findByDescription(descripcion)`: Buscar por descripción
  - `findByCategory(categoriaId)`: Buscar por categoría
  - `findLowStock()`: Productos con stock bajo

#### AlmacenService
- **Archivo**: `src/modules/productos/service/almacen.service.ts`
- **Métodos**:
  - `create(createAlmacenDto)`: Crear nuevo almacén
  - `findAll(includeInactive?)`: Obtener todos los almacenes
  - `findOne(id)`: Obtener almacén por ID
  - `update(id, updateAlmacenDto)`: Actualizar almacén
  - `remove(id)`: Eliminar almacén (soft delete)
  - `findByName(nombre)`: Buscar por nombre
  - `findByLocation(ubicacion)`: Buscar por ubicación
  - `findByResponsible(responsable)`: Buscar por responsable
  - `findByMinCapacity(minCapacidad)`: Buscar por capacidad mínima

### Controladores y Endpoints

#### Categorías (`/categorias`)
- `POST /categorias` - Crear categoría
- `GET /categorias` - Listar categorías
- `GET /categorias/:id` - Obtener categoría por ID
- `PATCH /categorias/:id` - Actualizar categoría
- `DELETE /categorias/:id` - Eliminar categoría
- `GET /categorias/search/by-name?nombre=` - Buscar por nombre

#### Productos (`/productos`)
- `POST /productos` - Crear producto
- `GET /productos` - Listar productos
- `GET /productos/:id` - Obtener producto por ID
- `PATCH /productos/:id` - Actualizar producto
- `DELETE /productos/:id` - Eliminar producto
- `GET /productos/search/by-description?descripcion=` - Buscar por descripción
- `GET /productos/search/by-category/:categoriaId` - Buscar por categoría
- `GET /productos/reports/low-stock` - Productos con stock bajo

#### Almacenes (`/almacenes`)
- `POST /almacenes` - Crear almacén
- `GET /almacenes` - Listar almacenes
- `GET /almacenes/:id` - Obtener almacén por ID
- `PATCH /almacenes/:id` - Actualizar almacén
- `DELETE /almacenes/:id` - Eliminar almacén
- `GET /almacenes/search/by-name?nombre=` - Buscar por nombre
- `GET /almacenes/search/by-location?ubicacion=` - Buscar por ubicación
- `GET /almacenes/search/by-responsible?responsable=` - Buscar por responsable
- `GET /almacenes/search/by-min-capacity?minCapacidad=` - Buscar por capacidad mínima

#### Inventario (`/inventario`)
- `GET /inventario` - Listar todo el inventario
- `GET /inventario/:id` - Obtener inventario por ID
- `POST /inventario` - Crear nuevo registro de inventario
- `PUT /inventario/:id` - Actualizar inventario completo
- `PATCH /inventario/:id/stock` - Actualizar solo el stock
- `DELETE /inventario/:id` - Eliminar inventario (soft delete)
- `GET /inventario/almacen/:almacenId` - Inventario por almacén
- `GET /inventario/producto/:productoId` - Inventario por producto
- `GET /inventario/almacen/:almacenId/producto/:productoId` - Inventario específico
- `GET /inventario/stock-bajo` - Inventario con stock bajo
- `GET /inventario/resumen/almacen/:almacenId` - Resumen por almacén

#### Inventario Lotes (`/inventario-lote`)
- `GET /inventario-lote` - Listar todos los lotes
- `GET /inventario-lote/:id` - Obtener lote por ID
- `POST /inventario-lote` - Crear nuevo lote
- `PUT /inventario-lote/:id` - Actualizar lote
- `DELETE /inventario-lote/:id` - Eliminar lote (soft delete)
- `GET /inventario-lote/inventario/:inventarioId` - Lotes por inventario
- `GET /inventario-lote/activos` - Lotes activos
- `GET /inventario-lote/por-vencer` - Lotes próximos a vencer
- `GET /inventario-lote/vencidos` - Lotes vencidos
- `GET /inventario-lote/buscar/:numeroLote` - Buscar por número de lote
- `GET /inventario-lote/costo-promedio/:inventarioId` - Costo promedio ponderado
- `POST /inventario-lote/consumir/:inventarioId` - Consumir stock (FIFO)

### DTOs (Data Transfer Objects)

Cada entidad tiene sus respectivos DTOs:
- **Create DTOs**: Para crear nuevos registros con validaciones
- **Update DTOs**: Para actualizar registros existentes (campos opcionales)
- **Response DTOs**: Para las respuestas de la API con transformaciones

### Funcionalidades Implementadas

#### Funcionalidades Básicas
- ✅ **Validaciones**: Validación de datos usando class-validator
- ✅ **Documentación Swagger**: API completamente documentada
- ✅ **Soft Delete**: Eliminación lógica en lugar de física
- ✅ **Relaciones**: Productos relacionados con categorías, inventario con almacenes y productos
- ✅ **Búsquedas Avanzadas**: Búsqueda por múltiples criterios
- ✅ **Manejo de Errores**: Respuestas de error consistentes
- ✅ **Transformaciones**: DTOs para entrada y salida de datos
- ✅ **TypeORM**: Integración completa con base de datos

#### Funcionalidades de Inventario
- ✅ **Gestión de Stock**: Control de stock actual por almacén y producto
- ✅ **Control de Lotes**: Seguimiento detallado de lotes para Kardex
- ✅ **FIFO (First In, First Out)**: Consumo automático de stock por orden de ingreso
- ✅ **Cálculo de Costos**: Costo promedio ponderado por inventario
- ✅ **Control de Vencimientos**: Identificación de lotes próximos a vencer o vencidos
- ✅ **Alertas de Stock Bajo**: Identificación de productos con stock por debajo del mínimo
- ✅ **Trazabilidad**: Seguimiento completo de movimientos de inventario
- ✅ **Índices Únicos**: Prevención de duplicados por almacén-producto
- ✅ **Reportes**: Resúmenes de inventario por almacén

### Ejemplos de Uso

#### Crear una Categoría
```json
POST /categorias
{
  "nombre": "Electrónicos",
  "descripcion": "Productos electrónicos y tecnológicos",
  "estado": true
}
```

#### Crear un Producto
```json
POST /productos
{
  "idCategoria": 1,
  "descripcion": "Laptop HP Pavilion 15.6\"",
  "unidadMedida": "unidad",
  "codigo": "PROD-001",
  "precio": 899.99,
  "stockMinimo": 10,
  "estado": true
}
```

#### Crear un Almacén
```json
POST /almacenes
{
  "nombre": "Almacén Central",
  "ubicacion": "Av. Industrial 123, Lima",
  "descripcion": "Almacén principal para productos terminados",
  "capacidadMaxima": 1000,
  "responsable": "Juan Pérez",
  "telefono": "+51 999 888 777",
  "estado": true
}
```

#### Crear Inventario
```json
POST /inventario
{
  "idAlmacen": 1,
  "idProducto": 1,
  "stockActual": 100.0000
}
```

#### Crear Lote de Inventario
```json
POST /inventario-lote
{
  "idInventario": 1,
  "fechaIngreso": "2024-01-15",
  "fechaVencimiento": "2024-12-31",
  "cantidadInicial": 50.0000,
  "cantidadActual": 50.0000,
  "costoUnitario": 25.5000,
  "numeroLote": "LOTE001",
  "observaciones": "Primer lote del año"
}
```

#### Consumir Stock (FIFO)
```json
POST /inventario-lote/consumir/1
{
  "cantidad": 10.0000
}
```

### Integración

El módulo está completamente integrado en el sistema:
- Importado en `app.module.ts`
- Configurado con TypeORM
- Listo para usar con la base de datos existente

## Casos de Uso del Sistema de Inventario

### 1. Ingreso de Mercancía
1. Crear o verificar existencia de inventario para el producto en el almacén
2. Crear nuevo lote con fecha de ingreso, cantidad y costo unitario
3. Actualizar stock actual del inventario

### 2. Salida de Mercancía (FIFO)
1. Consumir stock usando el endpoint `/inventario-lote/consumir/:inventarioId`
2. El sistema automáticamente consume primero los lotes más antiguos
3. Actualiza las cantidades actuales de los lotes afectados
4. Actualiza el stock total del inventario

### 3. Control de Vencimientos
1. Consultar lotes próximos a vencer: `/inventario-lote/por-vencer`
2. Consultar lotes vencidos: `/inventario-lote/vencidos`
3. Tomar acciones preventivas o correctivas

### 4. Cálculo de Costos para Kardex
1. Obtener costo promedio ponderado: `/inventario-lote/costo-promedio/:inventarioId`
2. Usar este costo para valorizar el inventario
3. Aplicar en reportes financieros y contables

## Próximos Pasos

1. **Implementar módulo de compras** (para generar lotes automáticamente)
2. **Implementar módulo de ventas** (para consumir stock automáticamente)
3. **Agregar reportes Kardex** (movimientos detallados de inventario)
4. **Implementar alertas automáticas** (stock bajo, vencimientos)
5. **Agregar auditoría de movimientos** (quién, cuándo, qué cambió)
6. **Implementar transferencias entre almacenes**
7. **Agregar ajustes de inventario** (diferencias físicas vs sistema)
8. **Implementar códigos de barras** (para facilitar operaciones)