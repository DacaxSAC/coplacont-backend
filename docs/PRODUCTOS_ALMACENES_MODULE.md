# Módulo de Productos y Almacenes

Este documento describe la implementación del módulo de productos y almacenes, que proporciona funcionalidad CRUD completa para la gestión de productos, categorías y almacenes.

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

### DTOs (Data Transfer Objects)

Cada entidad tiene sus respectivos DTOs:
- **Create DTOs**: Para crear nuevos registros con validaciones
- **Update DTOs**: Para actualizar registros existentes (campos opcionales)
- **Response DTOs**: Para las respuestas de la API con transformaciones

### Características Implementadas

1. **Validaciones Completas**: Todos los DTOs incluyen validaciones usando class-validator
2. **Documentación Swagger**: Todos los endpoints están documentados con decoradores de Swagger
3. **Soft Delete**: Las eliminaciones son lógicas (cambio de estado)
4. **Relaciones**: Los productos están relacionados con categorías
5. **Búsquedas Avanzadas**: Múltiples opciones de búsqueda y filtrado
6. **Manejo de Errores**: Excepciones específicas para diferentes casos
7. **Transformaciones**: Uso de class-transformer para las respuestas
8. **TypeORM**: Uso completo de TypeORM con QueryBuilder para consultas complejas

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

### Integración

El módulo está completamente integrado en el sistema:
- Importado en `app.module.ts`
- Configurado con TypeORM
- Listo para usar con la base de datos existente

### Próximos Pasos

Este módulo proporciona la base para:
1. Gestión de inventarios
2. Control de stock
3. Movimientos de almacén
4. Reportes de productos
5. Integración con el módulo de comprobantes para registrar movimientos