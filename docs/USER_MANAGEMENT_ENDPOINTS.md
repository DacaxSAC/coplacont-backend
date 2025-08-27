# Gestión de Usuarios y Empresas - Nuevos Endpoints

Este documento describe los nuevos endpoints implementados para la gestión avanzada de usuarios y empresas en el sistema.

## Endpoints Implementados

### 1. Crear Empresa con Usuario Principal

**Endpoint:** `POST /api/user/empresa-con-usuario`

**Descripción:** Crea una nueva empresa (persona jurídica) junto con su usuario principal en una sola operación transaccional.

**Body (CreateEmpresaConUsuarioDto):**
```json
{
  "nombreEmpresa": "Innovación Tech S.A.C.",
  "ruc": "20123456789",
  "razonSocial": "INNOVACION TECH SOCIEDAD ANONIMA CERRADA",
  "telefono": "+51 999 888 777",
  "direccion": "Av. Tecnológica 123, San Isidro, Lima",
  "nombreUsuario": "Carlos Administrador",
  "emailUsuario": "admin@innovaciontech.com",
  "idRol": 1,
  "esPrincipal": true
}
```

**Respuesta:**
```json
{
  "persona": {
    "id": 10,
    "nombreEmpresa": "Innovación Tech S.A.C.",
    "ruc": "20123456789",
    "razonSocial": "INNOVACION TECH SOCIEDAD ANONIMA CERRADA",
    "telefono": "+51 999 888 777",
    "direccion": "Av. Tecnológica 123, San Isidro, Lima",
    "habilitado": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "usuario": {
    "id": 25,
    "email": "admin@innovaciontech.com",
    "nombre": "Carlos Administrador",
    "habilitado": true,
    "esPrincipal": true,
    "persona": {
      "id": 10,
      "nombreEmpresa": "Innovación Tech S.A.C.",
      "ruc": "20123456789"
    }
  }
}
```

**Características:**
- **Transaccional**: Si falla la creación del usuario, se revierte la creación de la empresa
- **Email automático**: Se envía email de bienvenida con credenciales temporales
- **Usuario principal**: El usuario creado tiene acceso completo a la empresa
- **Validaciones**: RUC único, email único, datos requeridos

### 2. Crear Usuario para Empresa Específica

**Endpoint:** `POST /api/user/persona/:idPersona`

**Descripción:** Crea un nuevo usuario asociado directamente a una empresa específica.

**Parámetros:**
- `idPersona` (path): ID de la empresa a la que se asociará el usuario

**Body (CreateUserForPersonaDto):**
```json
{
  "nombre": "string",
  "email": "string",
  "idRol": "number",
  "esPrincipal": "boolean (opcional)"
}
```

**Respuesta:**
```json
{
  "id": 1,
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "habilitado": true,
  "esPrincipal": false
}
```

**Características:**
- Genera automáticamente una contraseña segura
- Envía email de bienvenida con credenciales
- Valida que la empresa existe antes de crear el usuario
- Asocia automáticamente el usuario a la empresa especificada

### 2. Desactivar Empresa y Todos sus Usuarios

**Endpoint:** `PATCH /api/user/persona/:idPersona/disabled`

**Descripción:** Desactiva una empresa y automáticamente desactiva todos los usuarios asociados a ella.

**Parámetros:**
- `idPersona` (path): ID de la empresa a desactivar

**Respuesta:** `204 No Content`

**Características:**
- Desactiva la empresa (campo `habilitado = false`)
- Desactiva automáticamente todos los usuarios de la empresa
- Operación transaccional para garantizar consistencia
- Valida que la empresa existe antes de proceder

### 3. Desactivar Usuario Individual

**Endpoint:** `PATCH /api/user/:id/disable`

**Descripción:** Desactiva un usuario específico sin afectar a otros usuarios de la misma empresa.

**Parámetros:**
- `id` (path): ID del usuario a desactivar

**Respuesta:** `204 No Content`

**Características:**
- Desactiva únicamente el usuario especificado
- No afecta a la empresa ni a otros usuarios
- Operación de soft delete (campo `habilitado = false`)

## Cambios en el Modelo de Datos

### Entidad Persona

Se agregó el campo `habilitado` para controlar el estado de las empresas:

```typescript
@Column({ default: true })
habilitado: boolean;
```

### Nuevos Métodos en PersonaService

#### `disablePersonaAndUsers(id: number)`
- Desactiva una empresa y todos sus usuarios
- Incluye validación de existencia
- Operación en cascada

#### `findByIdWithUsers(id: number)`
- Busca una empresa incluyendo sus usuarios asociados
- Útil para operaciones que requieren información completa

### Nuevos Métodos en UserService

#### `createUserForPersona(createUserDto, idPersona)`
- Crea usuario asociado a empresa específica
- Genera contraseña automática
- Envía email de bienvenida
- Valida existencia de empresa

## Ejemplos de Uso

### Crear Usuario para Empresa

```bash
curl -X POST http://localhost:3000/api/user/persona/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María García",
    "email": "maria@empresa.com",
    "idRol": 2,
    "esPrincipal": false
  }'
```

### Desactivar Empresa y Usuarios

```bash
curl -X PATCH http://localhost:3000/api/user/persona/1/disabled
```

### Desactivar Usuario Individual

```bash
curl -X PATCH http://localhost:3000/api/user/5/disable
```

## Validaciones y Errores

### Errores Comunes

- **404 Not Found**: Empresa o usuario no encontrado
- **400 Bad Request**: Datos de entrada inválidos
- **500 Internal Server Error**: Error en el envío de email (no bloquea la creación)

### Validaciones Implementadas

1. **Existencia de Empresa**: Antes de crear usuario o desactivar
2. **Email Único**: Validación a nivel de base de datos
3. **Formato de Email**: Validación con decoradores de class-validator
4. **Campos Requeridos**: Validación de campos obligatorios

## Consideraciones de Seguridad

- Las contraseñas se generan automáticamente con alta entropía
- Las contraseñas se hashean con bcrypt antes del almacenamiento
- Los emails se envían de forma asíncrona para no bloquear la operación
- Las operaciones de desactivación son reversibles (soft delete)

## Notas Técnicas

- Todas las operaciones son transaccionales
- Se mantiene la integridad referencial
- Los endpoints siguen las convenciones REST
- La documentación de API se puede generar con Swagger/OpenAPI
- Compatible con el sistema de autenticación y autorización existente