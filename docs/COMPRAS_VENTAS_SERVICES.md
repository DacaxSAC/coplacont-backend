# Servicios de Compras y Ventas

Este documento describe los nuevos servicios especializados para el manejo de comprobantes de compra y venta, basados en el atributo `tipoOperacion` de la entidad `Comprobante`.

## Estructura del Proyecto

### Servicios Creados

1. **ComprasService** (`src/modules/comprobantes/service/compras.service.ts`)
2. **VentasService** (`src/modules/comprobantes/service/ventas.service.ts`)

### Controladores Creados

1. **ComprasController** (`src/modules/comprobantes/controller/compras.controller.ts`)
2. **VentasController** (`src/modules/comprobantes/controller/ventas.controller.ts`)

## Servicios

### ComprasService

Servicio especializado para el manejo de comprobantes de compra (TipoOperacion.COMPRA).

#### Métodos Disponibles:

- `findAll()`: Obtiene todos los comprobantes de compra
- `findById(id: number)`: Busca un comprobante de compra por ID
- `findByDateRange(fechaInicio: Date, fechaFin: Date)`: Busca comprobantes por rango de fechas
- `findByProveedor(personaId: number)`: Busca comprobantes por proveedor

### VentasService

Servicio especializado para el manejo de comprobantes de venta (TipoOperacion.VENTA).

#### Métodos Disponibles:

- `findAll()`: Obtiene todos los comprobantes de venta
- `findById(id: number)`: Busca un comprobante de venta por ID
- `findByDateRange(fechaInicio: Date, fechaFin: Date)`: Busca comprobantes por rango de fechas
- `findByCliente(personaId: number)`: Busca comprobantes por cliente
- `getTotalVentasByDateRange(fechaInicio: Date, fechaFin: Date)`: Obtiene el total de ventas en un período

## Endpoints API

### Compras - `/api/compras`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/compras` | Obtener todos los comprobantes de compra |
| GET | `/api/compras/:id` | Obtener un comprobante de compra por ID |
| GET | `/api/compras/fecha-rango/buscar?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD` | Buscar comprobantes por rango de fechas |
| GET | `/api/compras/proveedor/:proveedorId` | Obtener comprobantes por proveedor |

### Ventas - `/api/ventas`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ventas` | Obtener todos los comprobantes de venta |
| GET | `/api/ventas/:id` | Obtener un comprobante de venta por ID |
| GET | `/api/ventas/fecha-rango/buscar?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD` | Buscar comprobantes por rango de fechas |
| GET | `/api/ventas/cliente/:clienteId` | Obtener comprobantes por cliente |
| GET | `/api/ventas/totales/fecha-rango?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD` | Obtener total de ventas por rango de fechas |

## Ejemplos de Uso

### Obtener todas las compras
```http
GET /api/compras
```

### Obtener compras por rango de fechas
```http
GET /api/compras/fecha-rango/buscar?fechaInicio=2024-01-01&fechaFin=2024-12-31
```

### Obtener compras de un proveedor específico
```http
GET /api/compras/proveedor/123
```

### Obtener todas las ventas
```http
GET /api/ventas
```

### Obtener total de ventas en un período
```http
GET /api/ventas/totales/fecha-rango?fechaInicio=2024-01-01&fechaFin=2024-12-31
```

**Respuesta:**
```json
{
  "total": 150000.50,
  "fechaInicio": "2024-01-01",
  "fechaFin": "2024-12-31"
}
```

## Características Técnicas

### Filtrado por Tipo de Operación

Todos los servicios utilizan el enum `TipoOperacion` para filtrar automáticamente:
- **ComprasService**: Solo comprobantes con `tipoOperacion = TipoOperacion.COMPRA`
- **VentasService**: Solo comprobantes con `tipoOperacion = TipoOperacion.VENTA`

### Relaciones Incluidas

Todos los métodos incluyen las siguientes relaciones:
- `totales`: Información de totales del comprobante
- `persona`: Información del cliente/proveedor
- `detalles`: Detalles del comprobante

### Optimización de Consultas

Se utilizan QueryBuilder de TypeORM para optimizar las consultas complejas, especialmente en:
- Búsquedas por rango de fechas
- Búsquedas por cliente/proveedor
- Cálculo de totales

### Documentación Swagger

Todos los endpoints están documentados con Swagger/OpenAPI, incluyendo:
- Descripciones detalladas
- Parámetros requeridos
- Tipos de respuesta
- Códigos de estado HTTP
- Ejemplos de uso

## Integración con el Módulo

Los nuevos servicios y controladores están integrados en `ComprobanteModule`:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([...]), PersonModule],
  controllers: [ComprobanteController, ComprasController, VentasController],
  providers: [ComprobanteService, ComprasService, VentasService, ...],
  exports: [TypeOrmModule, ComprobanteService, ComprasService, VentasService],
})
export class ComprobanteModule {}
```

Esto permite que otros módulos puedan inyectar y utilizar estos servicios especializados según sus necesidades.