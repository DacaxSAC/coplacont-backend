# Sistema de Recuperación de Contraseña

Este documento describe la implementación completa del sistema de recuperación de contraseña en el proyecto NestJS.

## Arquitectura del Sistema

### Flujo de Recuperación

1. **Solicitud de Recuperación**: Usuario solicita recuperación con su email
2. **Generación de Token**: Sistema genera token único con expiración
3. **Envío de Email**: Se envía email con enlace de recuperación
4. **Validación de Token**: Usuario accede al enlace y se valida el token
5. **Reseteo de Contraseña**: Usuario establece nueva contraseña
6. **Limpieza**: Token se elimina de la base de datos

## Componentes Implementados

### 1. Entidad User (Actualizada)

**Archivo**: `src/modules/users/entities/user.entity.ts`

```typescript
@Column({ nullable: true })
resetPasswordToken?: string;

@Column({ type: 'timestamp', nullable: true })
resetPasswordExpires?: Date;
```

### 2. DTOs de Validación

#### PasswordResetRequestDto
**Archivo**: `src/modules/users/dto/auth/password-reset-request.dto.ts`
- Valida el email para solicitud de recuperación

#### ValidateResetTokenDto
**Archivo**: `src/modules/users/dto/auth/validate-reset-token.dto.ts`
- Valida el token de recuperación

#### ResetPasswordDto
**Archivo**: `src/modules/users/dto/auth/reset-password.dto.ts`
- Valida token y nueva contraseña

### 3. UserService (Métodos Agregados)

**Archivo**: `src/modules/users/services/user.service.ts`

- `findByResetToken(token: string)`: Busca usuario por token
- `updateResetPasswordToken(userId, token, expiresAt)`: Guarda token y expiración
- `clearResetPasswordToken(userId)`: Limpia token después del uso
- `updatePassword(userId, hashedPassword)`: Actualiza contraseña

### 4. AuthService (Métodos Implementados)

**Archivo**: `src/modules/users/services/auth.service.ts`

#### requestPasswordReset(email: string)
- Busca usuario por email
- Genera token único con `randomBytes(32).toString('hex')`
- Establece expiración de 1 hora
- Guarda token en base de datos
- Envía email de recuperación
- Retorna respuesta genérica por seguridad

#### validateResetToken(token: string)
- Busca usuario por token
- Verifica si el token existe
- Valida si no ha expirado
- Limpia tokens expirados automáticamente
- Retorna estado de validación

#### resetPassword(token: string, password: string)
- Valida token primero
- Hashea nueva contraseña con bcrypt
- Actualiza contraseña en base de datos
- Limpia token de recuperación
- Retorna confirmación de éxito

### 5. AuthController (Endpoints)

**Archivo**: `src/modules/users/controllers/auth.controller.ts`

#### POST /api/auth/request-password-reset
```json
{
  "email": "usuario@ejemplo.com"
}
```

#### POST /api/auth/validate-reset-token
```json
{
  "token": "token-de-recuperacion"
}
```

#### POST /api/auth/reset-password
```json
{
  "token": "token-de-recuperacion",
  "password": "nuevaContraseña123"
}
```

## Características de Seguridad

### 1. Tokens Seguros
- Generados con `crypto.randomBytes(32)` (256 bits de entropía)
- Únicos y no predecibles
- Almacenados como hash en base de datos

### 2. Expiración Automática
- Tokens expiran en 1 hora
- Limpieza automática de tokens expirados
- Validación de tiempo en cada uso

### 3. Respuestas Genéricas
- No revela si el email existe en el sistema
- Previene enumeración de usuarios
- Mensajes consistentes para éxito y error

### 4. Validaciones Robustas
- DTOs con class-validator
- Verificación de existencia de usuario
- Validación de formato de email
- Longitud mínima de contraseña

### 5. Limpieza de Datos
- Tokens se eliminan después del uso exitoso
- Tokens expirados se limpian automáticamente
- No se almacenan contraseñas en texto plano

## Integración con Email Service

El sistema utiliza el `EmailService` implementado con Nodemailer:

```typescript
const emailResult = await this.emailService.sendPasswordResetEmail(email, resetToken);
```

El email incluye:
- Enlace con token de recuperación
- Instrucciones claras para el usuario
- Advertencia sobre expiración
- Diseño HTML responsivo

## Uso del Sistema

### Frontend Integration

1. **Solicitar Recuperación**:
```javascript
const response = await fetch('/api/auth/request-password-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'usuario@ejemplo.com' })
});
```

2. **Validar Token** (desde URL del email):
```javascript
const response = await fetch('/api/auth/validate-reset-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: tokenFromURL })
});
```

3. **Resetear Contraseña**:
```javascript
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    token: tokenFromURL, 
    password: 'nuevaContraseña123' 
  })
});
```

## Manejo de Errores

Todos los métodos retornan objetos con estructura consistente:

```typescript
{
  message: string,
  success: boolean,
  userId?: number // Solo en validateResetToken exitoso
}
```

## Base de Datos

### Migración Requerida

Si usas migraciones, ejecuta:
```sql
ALTER TABLE "user" 
ADD COLUMN "resetPasswordToken" varchar,
ADD COLUMN "resetPasswordExpires" timestamp;
```

### Índices Recomendados

```sql
CREATE INDEX idx_user_reset_token ON "user" ("resetPasswordToken");
CREATE INDEX idx_user_reset_expires ON "user" ("resetPasswordExpires");
```

## Testing

### Casos de Prueba Recomendados

1. **Solicitud con email válido**
2. **Solicitud con email inexistente**
3. **Validación de token válido**
4. **Validación de token expirado**
5. **Validación de token inexistente**
6. **Reset con token válido**
7. **Reset con token inválido**
8. **Reset con contraseña débil**

## Monitoreo y Logs

El sistema incluye logging automático:
- Solicitudes de recuperación
- Envíos de email exitosos/fallidos
- Validaciones de token
- Resets de contraseña exitosos
- Limpieza de tokens expirados

## Configuración

### Variables de Entorno

```env
# Email configuration (ya configurado)
USER_EMAIL=tu-email@gmail.com
PASSWORD_EMAIL=tu-contraseña-de-aplicación

# Frontend URL para enlaces
FRONTEND_URL=http://localhost:3000
```

### Personalización

Puedes personalizar:
- Tiempo de expiración del token
- Template del email de recuperación
- Longitud del token
- Validaciones adicionales
- Mensajes de respuesta

## Próximos Pasos

1. **Prueba el sistema** con emails reales
2. **Implementa el frontend** para el flujo completo
3. **Configura monitoreo** de intentos de recuperación
4. **Considera rate limiting** para prevenir abuso
5. **Implementa logs de auditoría** para cambios de contraseña