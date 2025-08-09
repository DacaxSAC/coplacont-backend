# Servicio de Email con Nodemailer

Este documento describe la implementación del servicio de email utilizando Nodemailer en el proyecto.

## Configuración

### Variables de Entorno

Asegúrate de tener las siguientes variables en tu archivo `.env`:

```env
# Email Configuration
USER_EMAIL=tu-email@gmail.com
PASSWORD_EMAIL=tu-contraseña-de-aplicación

# Frontend URL (para enlaces de recuperación)
FRONTEND_URL=http://localhost:3000
```

### Configuración de Gmail

Para usar Gmail como proveedor de email:

1. Habilita la autenticación de 2 factores en tu cuenta de Gmail
2. Genera una contraseña de aplicación específica
3. Usa esa contraseña en la variable `PASSWORD_EMAIL`

## Estructura del Servicio

### EmailConfig (`src/config/email.config.ts`)

Clase de configuración que maneja:
- Creación del transporter de Nodemailer
- Configuración SMTP para Gmail
- Interfaces TypeScript para opciones y respuestas

### EmailService (`src/modules/users/services/email.service.ts`)

Servicio principal que proporciona:
- `sendEmail()`: Envío de emails personalizados
- `sendWelcomeEmail()`: Email de bienvenida para nuevos usuarios
- `sendPasswordResetEmail()`: Email de recuperación de contraseña
- `verifyConnection()`: Verificación de la conexión SMTP

### EmailController (`src/modules/users/controllers/email.controller.ts`)

Controlador REST que expone endpoints:
- `POST /api/email/send`: Envío de email personalizado
- `POST /api/email/welcome`: Email de bienvenida
- `POST /api/email/password-reset`: Email de recuperación
- `POST /api/email/verify-connection`: Verificar conexión

## Uso del Servicio

### Inyección en otros servicios

```typescript
import { EmailService } from '../services/email.service';

@Injectable()
export class MiServicio {
  constructor(private readonly emailService: EmailService) {}

  async enviarNotificacion(email: string, mensaje: string) {
    const resultado = await this.emailService.sendEmail({
      to: email,
      subject: 'Notificación',
      html: `<p>${mensaje}</p>`
    });
    
    if (resultado.success) {
      console.log('Email enviado exitosamente');
    } else {
      console.error('Error al enviar email:', resultado.error);
    }
  }
}
```

### Ejemplos de uso

#### Email de Bienvenida

```typescript
const resultado = await this.emailService.sendWelcomeEmail(
  'usuario@ejemplo.com',
  'Juan Pérez'
);
```

#### Email de Recuperación de Contraseña

```typescript
const token = 'token-de-recuperacion';
const resultado = await this.emailService.sendPasswordResetEmail(
  'usuario@ejemplo.com',
  token
);
```

#### Email Personalizado

```typescript
const resultado = await this.emailService.sendEmail({
  to: 'destinatario@ejemplo.com',
  subject: 'Asunto del email',
  html: '<h1>Contenido HTML</h1>',
  text: 'Contenido en texto plano'
});
```

## API Endpoints

### Enviar Email Personalizado

```http
POST /api/email/send
Content-Type: application/json

{
  "to": "destinatario@ejemplo.com",
  "subject": "Asunto del email",
  "html": "<p>Contenido HTML</p>",
  "text": "Contenido en texto plano"
}
```

### Email de Bienvenida

```http
POST /api/email/welcome
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "nombre": "Juan Pérez"
}
```

### Email de Recuperación

```http
POST /api/email/password-reset
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "resetToken": "token-de-recuperacion"
}
```

### Verificar Conexión

```http
POST /api/email/verify-connection
```

## Respuestas del Servicio

Todas las operaciones devuelven un objeto `EmailResponse`:

```typescript
interface EmailResponse {
  success: boolean;
  messageId?: string;  // ID del mensaje si fue exitoso
  error?: string;      // Mensaje de error si falló
}
```

## Logging

El servicio incluye logging automático:
- Éxitos: Log de confirmación con el email destinatario
- Errores: Log de error con detalles del fallo

## Seguridad

- Las credenciales se manejan a través de variables de entorno
- No se exponen credenciales en el código
- Validación de conexión antes del envío
- Manejo de errores robusto

## Personalización

Puedes personalizar:
- Templates HTML de los emails
- Configuración SMTP para otros proveedores
- Métodos adicionales para tipos específicos de emails
- Validaciones personalizadas en los DTOs