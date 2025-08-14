# Módulo de Tipo de Cambio SUNAT

Este módulo implementa un sistema completo para obtener y gestionar tipos de cambio desde el API de SUNAT con caché en base de datos.

## Características

- ✅ Consulta automática a la base de datos antes de llamar al API externo
- ✅ Integración con API de SUNAT para obtener tipos de cambio actualizados
- ✅ Caché en base de datos para evitar llamadas innecesarias
- ✅ Job programado diario a las 14:00 para actualización automática
- ✅ Validación de fechas futuras
- ✅ Manejo de errores robusto
- ✅ Documentación completa con Swagger

## Estructura de la Base de Datos

```sql
CREATE TABLE tipo_cambio (
    fecha DATE PRIMARY KEY,
    compra DECIMAL(10,4) NOT NULL,
    venta DECIMAL(10,4) NOT NULL,
    fuente VARCHAR(50) DEFAULT 'SUNAT',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuración

### Variables de Entorno

Agrega la siguiente variable a tu archivo `.env`:

```env
SUNAT_API_TOKEN=tu_token_de_sunat_aqui
```

### API Externa

El módulo consume el siguiente endpoint:
- **URL**: `https://api.apis.net.pe/v1/tipo-cambio?date=YYYY-MM-DD`
- **Método**: GET
- **Headers**: `Authorization: Bearer {SUNAT_API_TOKEN}`

## Endpoints Disponibles

### 1. Obtener Tipo de Cambio

```http
GET /tipo-cambio/sunat?date=2023-05-01
```

**Parámetros:**
- `date` (opcional): Fecha en formato YYYY-MM-DD. Si no se proporciona, usa la fecha actual.

**Respuesta exitosa (200):**
```json
{
  "fecha": "2023-05-01",
  "compra": 3.518,
  "venta": 3.525,
  "fuente": "SUNAT",
  "fechaRegistro": "2023-05-01T19:00:00.000Z"
}
```

**Errores posibles:**
- `400`: Fecha inválida o futura
- `404`: No se encontraron datos para la fecha especificada
- `500`: Error interno del servidor

### 2. Obtener Todos los Tipos de Cambio

```http
GET /tipo-cambio/todos
```

Retorna todos los tipos de cambio almacenados en la base de datos, ordenados por fecha descendente.

### 3. Actualizar Tipo de Cambio Diario

```http
GET /tipo-cambio/actualizar-diario
```

Fuerza la actualización del tipo de cambio del día actual desde el API de SUNAT.

## Flujo de Funcionamiento

1. **Consulta inicial**: Se verifica si existe el tipo de cambio en la base de datos
2. **Cache hit**: Si existe, se retorna inmediatamente
3. **Cache miss**: Si no existe, se consulta el API de SUNAT
4. **Almacenamiento**: El resultado se guarda en la base de datos
5. **Respuesta**: Se retorna el tipo de cambio al cliente

## Job Programado

El sistema incluye un job que se ejecuta automáticamente todos los días a las **14:00 (hora de Lima)** para:

- Obtener el tipo de cambio del día actual
- Guardarlo en la base de datos
- Registrar logs del proceso

### Configuración del Cron Job

```typescript
// Se ejecuta a las 14:00 todos los días
cron.schedule('0 0 14 * * *', async () => {
  // Lógica de actualización
}, {
  timezone: 'America/Lima'
});
```

## Manejo de Errores

### Errores del API de SUNAT

- **400 Bad Request**: Fecha no válida o futura
- **401 Unauthorized**: Token de API inválido
- **404 Not Found**: No hay datos para la fecha solicitada

### Errores Internos

- **Timeout**: El API no responde en 10 segundos
- **Network Error**: Problemas de conectividad
- **Database Error**: Problemas con la base de datos

## Logging

El módulo registra logs detallados para:

- ✅ Consultas exitosas a la base de datos
- ✅ Llamadas al API externo
- ✅ Ejecución del job programado
- ❌ Errores y excepciones

## Uso en Otros Módulos

Puedes inyectar el servicio en otros módulos:

```typescript
import { TipoCambioService } from '../tipo-cambio/service/tipo-cambio.service';

@Injectable()
export class MiServicio {
  constructor(
    private readonly tipoCambioService: TipoCambioService
  ) {}

  async obtenerTipoCambio() {
    return await this.tipoCambioService.obtenerTipoCambio();
  }
}
```

## Testing

Para probar manualmente el job programado:

```typescript
// En tu controlador o servicio
async ejecutarJobManual() {
  await this.tipoCambioCronService.ejecutarJobManual();
}
```

## Consideraciones de Seguridad

- ✅ El token de API se almacena en variables de entorno
- ✅ No se exponen credenciales en el código
- ✅ Validación de entrada en todos los endpoints
- ✅ Manejo seguro de errores sin exponer información sensible

## Monitoreo y Mantenimiento

### Logs a Revisar

- Ejecución diaria del job a las 14:00
- Errores de conectividad con el API de SUNAT
- Consultas fallidas a la base de datos

### Métricas Recomendadas

- Número de consultas diarias al API externo
- Tiempo de respuesta promedio
- Tasa de éxito/error del job programado
- Cantidad de registros en la tabla `tipo_cambio`