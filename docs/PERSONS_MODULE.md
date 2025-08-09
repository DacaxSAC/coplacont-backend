# Módulo de Personas (Clientes y Proveedores)

Este módulo gestiona las entidades que pueden ser clientes, proveedores o ambos. Soporta tanto personas naturales como jurídicas con validaciones específicas para cada tipo.

## Características Principales

### Tipos de Persona
- **NATURAL**: Personas individuales (requiere nombres y apellidos)
- **JURIDICA**: Empresas u organizaciones (requiere razón social)

### Roles
- **Cliente**: `isCliente = true`
- **Proveedor**: `isProveedor = true`
- Una persona puede ser ambos simultáneamente

### Validaciones

#### Documentos
- **Personas Naturales**: DNI de 8 dígitos
- **Personas Jurídicas**: RUC de 11 dígitos
- El número de documento debe ser único

#### Campos Requeridos
- **Personas Naturales**: `firstName`, `paternalSurname`, `maternalSurname`
- **Personas Jurídicas**: `businessName`

#### Otros Campos
- **Dirección**: Entre 5 y 255 caracteres (opcional)
- **Teléfono**: Formato válido con números, espacios y símbolos (opcional)

## Endpoints API

### Crear Persona
```http
POST /api/persons
Content-Type: application/json

{
  "type": "NATURAL",
  "documentNumber": "12345678",
  "firstName": "Juan",
  "paternalSurname": "Pérez",
  "maternalSurname": "García",
  "isCliente": true,
  "address": "Av. Principal 123",
  "phone": "+51 987654321"
}
```

### Obtener Todas las Personas
```http
GET /api/persons
```

### Obtener Solo Clientes
```http
GET /api/persons/clients
```

### Obtener Solo Proveedores
```http
GET /api/persons/providers
```

### Obtener Persona por ID
```http
GET /api/persons/{id}
```

### Buscar por Número de Documento
```http
GET /api/persons/document/{documentNumber}
```

### Actualizar Datos Principales
```http
PATCH /api/persons/{id}
Content-Type: application/json

{
  "firstName": "Juan Carlos",
  "address": "Nueva dirección",
  "phone": "+51 999888777"
}
```

### Activar Roles (Solo Activación)
```http
PATCH /api/persons/{id}/activate-roles
Content-Type: application/json

{
  "isProveedor": true
}
```

**Nota**: Solo se pueden activar roles (`true`), no desactivar (`false`).

### Eliminar Persona (Soft Delete)
```http
DELETE /api/persons/{id}
```

### Restaurar Persona
```http
PATCH /api/persons/{id}/restore
```

## Estructura de Respuesta

Todas las respuestas siguen el formato estándar `ApiResponseDto`:

```typescript
{
  success: boolean;        // Indica si la operación fue exitosa
  message: string;         // Mensaje descriptivo de la operación
  data?: T;               // Datos de respuesta (opcional)
}
```

Donde `data` puede contener `PersonResponseDto` o arrays de `PersonResponseDto`:

```typescript
// PersonResponseDto
{
  id: number;
  isProveedor: boolean;
  isCliente: boolean;
  type: PersonType; // 'NATURAL' | 'JURIDICA'
  documentNumber: string;
  firstName?: string;
  maternalSurname?: string;
  paternalSurname?: string;
  businessName?: string;
  active: boolean;
  address?: string;
  phone?: string;
  displayName: string; // Nombre completo calculado
  createdAt: Date;
  updatedAt: Date;
}
```

Ejemplo de respuesta completa:

```json
{
  "success": true,
  "message": "Persona obtenida exitosamente",
  "data": {
    "id": 1,
    "isProveedor": false,
    "isCliente": true,
    "type": "NATURAL",
    "documentNumber": "12345678",
    "firstName": "Juan",
    "maternalSurname": "García",
    "paternalSurname": "Pérez",
    "businessName": null,
    "active": true,
    "address": "Av. Principal 123",
    "phone": "+51 987654321",
    "displayName": "Juan Pérez García",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Casos de Uso

### 1. Crear Cliente Natural
```json
{
  "type": "NATURAL",
  "documentNumber": "12345678",
  "firstName": "María",
  "paternalSurname": "López",
  "maternalSurname": "Rodríguez",
  "isCliente": true,
  "address": "Jr. Los Olivos 456",
  "phone": "987654321"
}
```

### 2. Crear Proveedor Jurídico
```json
{
  "type": "JURIDICA",
  "documentNumber": "20123456789",
  "businessName": "Distribuidora ABC S.A.C.",
  "isProveedor": true,
  "address": "Av. Industrial 789",
  "phone": "+51 1 234-5678"
}
```

### 3. Convertir Cliente en Cliente-Proveedor
```json
// Primero obtener la persona
GET /api/persons/1

// Luego activar el rol de proveedor
PATCH /api/persons/1/activate-roles
{
  "isProveedor": true
}
```

## Características Técnicas

### Formato de Respuesta Estándar
- Todas las respuestas siguen el formato `{ success, message, data? }`
- Manejo de errores sin excepciones: los servicios no lanzan errores, retornan respuestas estructuradas

### Soft Delete
- Las personas eliminadas se marcan como `active: false`
- No se eliminan físicamente de la base de datos
- Se pueden restaurar usando el endpoint `/restore`

### Validaciones de Negocio
- Los roles solo se pueden activar, nunca desactivar
- El número de documento debe ser único en todo el sistema
- Las validaciones de formato se aplican automáticamente según el tipo

### Métodos Auxiliares
- `displayName`: Retorna el nombre apropiado según el tipo de persona
- `fullName`: Retorna el nombre completo para personas naturales

## Seguridad

- Validación de entrada en todos los endpoints
- Manejo de errores apropiado
- Documentación Swagger integrada
- Tipos TypeScript estrictos

## Próximas Mejoras

- [ ] Paginación para listados grandes
- [ ] Filtros avanzados de búsqueda
- [ ] Historial de cambios
- [ ] Validación de documentos con APIs externas
- [ ] Geolocalización de direcciones