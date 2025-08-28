# Vistas Frontend - Periodos Contables y Métodos de Valoración

## Descripción General

Este documento define las vistas frontend necesarias para gestionar periodos contables y métodos de valoración de inventarios en el sistema COPLACONT.

## Estructura de Navegación

```
Configuración
├── Periodos Contables
│   ├── Lista de Periodos
│   ├── Crear Periodo
│   ├── Editar Periodo
│   └── Configuración de Valoración
└── Métodos de Valoración
    ├── Configuración Actual
    └── Historial de Cambios
```

## 1. Vista Principal - Lista de Periodos

### Ruta
`/configuracion/periodos`

### Descripción
Vista principal que muestra todos los periodos contables de la empresa con sus configuraciones de valoración.

### Componentes

#### Header
- Título: "Periodos Contables"
- Botón: "Nuevo Periodo" (primario)
- Breadcrumb: Configuración > Periodos Contables

#### Tabla de Periodos
| Campo | Descripción | Tipo |
|-------|-------------|------|
| Nombre | Nombre del periodo | String |
| Fecha Inicio | Fecha de inicio | Date |
| Fecha Fin | Fecha de finalización | Date |
| Estado | Activo/Inactivo | Badge |
| Método Valoración | PROMEDIO/FIFO | Badge |
| Movimientos | Cantidad de comprobantes | Number |
| Acciones | Editar, Configurar, Activar/Desactivar | Buttons |

#### Filtros
- Estado: Todos, Activo, Inactivo
- Año: Selector de años
- Método de Valoración: Todos, PROMEDIO, FIFO

#### Estados Visuales
- **Periodo Activo**: Fila destacada con color verde claro
- **Con Movimientos**: Icono de candado para indicar restricciones
- **Sin Movimientos**: Icono de edición disponible

### Funcionalidades
- ✅ Listar todos los periodos
- ✅ Filtrar por estado, año y método
- ✅ Ordenar por fecha, nombre
- ✅ Paginación
- ✅ Activar/Desactivar periodo
- ✅ Navegar a edición
- ✅ Navegar a configuración de valoración

### Endpoints Utilizados
```typescript
GET /api/periodos                    // Lista de periodos
PUT /api/periodos/:id/activar        // Activar periodo
PUT /api/periodos/:id/desactivar     // Desactivar periodo
```

---

## 2. Vista - Crear/Editar Periodo

### Rutas
- Crear: `/configuracion/periodos/nuevo`
- Editar: `/configuracion/periodos/:id/editar`

### Descripción
Formulario para crear o editar un periodo contable.

### Componentes

#### Header
- Título: "Nuevo Periodo" / "Editar Periodo"
- Botones: "Guardar" (primario), "Cancelar" (secundario)
- Breadcrumb: Configuración > Periodos > Nuevo/Editar

#### Formulario
```typescript
interface PeriodoForm {
  nombre: string;           // Requerido, ej: "2024"
  fechaInicio: Date;        // Requerido
  fechaFin: Date;          // Requerido
  descripcion?: string;     // Opcional
  activo: boolean;         // Default: true para nuevo
}
```

#### Campos del Formulario

**Información Básica**
- **Nombre**: Input text, requerido, max 50 caracteres
- **Descripción**: Textarea, opcional, max 255 caracteres
- **Fecha Inicio**: DatePicker, requerido
- **Fecha Fin**: DatePicker, requerido, debe ser mayor a fecha inicio
- **Estado**: Toggle switch (Activo/Inactivo)

#### Validaciones
- ✅ Nombre único por empresa
- ✅ Fecha fin mayor a fecha inicio
- ✅ No solapamiento con otros periodos
- ✅ Solo un periodo activo a la vez

#### Configuración Inicial (Solo Crear)
**Método de Valoración Inicial**
- Radio buttons: PROMEDIO (default), FIFO
- Información: "Podrás cambiar este método mientras no haya movimientos"

### Funcionalidades
- ✅ Validación en tiempo real
- ✅ Previsualización de fechas
- ✅ Confirmación antes de guardar
- ✅ Manejo de errores
- ✅ Redirección después de guardar

### Endpoints Utilizados
```typescript
POST /api/periodos                   // Crear periodo
PUT /api/periodos/:id                // Actualizar periodo
GET /api/periodos/:id                // Obtener periodo específico
```

---

## 3. Vista - Configuración de Métodos de Valoración

### Ruta
`/configuracion/periodos/:id/valoracion`

### Descripción
Vista especializada para configurar y cambiar métodos de valoración de un periodo específico.

### Componentes

#### Header
- Título: "Configuración de Valoración - [Nombre Periodo]"
- Subtítulo: "Periodo: [Fecha Inicio] - [Fecha Fin]"
- Breadcrumb: Configuración > Periodos > Configuración de Valoración

#### Información del Periodo
```typescript
interface PeriodoInfo {
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
  cantidadMovimientos: number;
  metodoActual: 'PROMEDIO' | 'FIFO';
  fechaUltimaActualizacion: Date;
}
```

#### Card - Estado Actual
- **Método Actual**: Badge grande con el método activo
- **Desde**: Fecha de última actualización
- **Movimientos**: Cantidad de comprobantes registrados
- **Estado**: Indicador si se puede cambiar o no

#### Card - Cambiar Método (Condicional)

**Si NO hay movimientos:**
```tsx
<Card>
  <CardHeader>
    <Title>Cambiar Método de Valoración</Title>
    <Description>Puedes cambiar el método porque no hay movimientos registrados</Description>
  </CardHeader>
  <CardContent>
    <RadioGroup>
      <Radio value="promedio">PROMEDIO - Costo promedio ponderado</Radio>
      <Radio value="fifo">FIFO - Primero en entrar, primero en salir</Radio>
    </RadioGroup>
    <Button>Actualizar Método</Button>
  </CardContent>
</Card>
```

**Si HAY movimientos:**
```tsx
<Card className="border-orange-200 bg-orange-50">
  <CardHeader>
    <Title className="text-orange-800">Método Bloqueado</Title>
    <Description>No se puede cambiar el método porque ya hay {movimientos} movimientos registrados</Description>
  </CardHeader>
  <CardContent>
    <Alert>
      <AlertIcon />
      <AlertDescription>
        Para cambiar el método de valoración, primero debes eliminar todos los movimientos del periodo.
      </AlertDescription>
    </Alert>
  </CardContent>
</Card>
```

#### Información de Métodos

**Card - Método PROMEDIO**
- Descripción: "Utiliza el costo promedio ponderado del inventario"
- Ventajas: "Suaviza fluctuaciones de precios, cálculo simple"
- Uso recomendado: "Productos con precios estables"

**Card - Método FIFO**
- Descripción: "Primero en entrar, primero en salir"
- Ventajas: "Refleja el flujo físico real, mejor para productos perecederos"
- Uso recomendado: "Productos con alta rotación o perecederos"

#### Historial de Cambios
Tabla con historial de cambios de método:
| Fecha | Método Anterior | Método Nuevo | Usuario | Motivo |
|-------|----------------|--------------|---------|--------|

### Funcionalidades
- ✅ Mostrar estado actual del método
- ✅ Validar si se puede cambiar
- ✅ Cambiar método con confirmación
- ✅ Mostrar historial de cambios
- ✅ Información educativa sobre métodos

### Endpoints Utilizados
```typescript
GET /api/periodos/:id/configuracion          // Configuración actual
PUT /api/periodos/:id/metodo-valoracion       // Cambiar método
GET /api/periodos/:id/historial-valoracion    // Historial de cambios
```

---

## 4. Vista - Dashboard de Configuración

### Ruta
`/configuracion/dashboard`

### Descripción
Vista resumen que muestra el estado general de la configuración de periodos y valoración.

### Componentes

#### Cards de Resumen

**Periodo Activo**
```tsx
<Card>
  <CardHeader>
    <Title>Periodo Activo</Title>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{periodoActivo.nombre}</div>
    <div className="text-sm text-gray-600">
      {periodoActivo.fechaInicio} - {periodoActivo.fechaFin}
    </div>
    <Badge>{periodoActivo.metodoValoracion}</Badge>
  </CardContent>
</Card>
```

**Estadísticas**
- Total de periodos
- Periodos con movimientos
- Método más utilizado
- Último cambio de método

#### Acciones Rápidas
- Botón: "Crear Nuevo Periodo"
- Botón: "Configurar Valoración"
- Botón: "Ver Todos los Periodos"

#### Alertas y Notificaciones
- Periodo próximo a vencer
- Métodos que pueden optimizarse
- Periodos sin configurar

---

## 5. Componentes Reutilizables

### MetodoValoracionBadge
```tsx
interface MetodoValoracionBadgeProps {
  metodo: 'PROMEDIO' | 'FIFO';
  size?: 'sm' | 'md' | 'lg';
}

const MetodoValoracionBadge = ({ metodo, size = 'md' }) => {
  const config = {
    PROMEDIO: { color: 'blue', icon: '📊', label: 'Promedio' },
    FIFO: { color: 'green', icon: '🔄', label: 'FIFO' }
  };
  
  return (
    <Badge color={config[metodo].color} size={size}>
      {config[metodo].icon} {config[metodo].label}
    </Badge>
  );
};
```

### PeriodoStatusBadge
```tsx
interface PeriodoStatusBadgeProps {
  activo: boolean;
  tieneMovimientos: boolean;
}

const PeriodoStatusBadge = ({ activo, tieneMovimientos }) => {
  if (activo) {
    return <Badge color="green">🟢 Activo</Badge>;
  }
  
  if (tieneMovimientos) {
    return <Badge color="gray">🔒 Inactivo (Con movimientos)</Badge>;
  }
  
  return <Badge color="gray">⚪ Inactivo</Badge>;
};
```

### ConfirmacionCambioMetodo
```tsx
interface ConfirmacionCambioMetodoProps {
  metodoActual: string;
  metodoNuevo: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmacionCambioMetodo = ({ metodoActual, metodoNuevo, onConfirm, onCancel }) => {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Cambio de Método</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de cambiar el método de valoración de {metodoActual} a {metodoNuevo}?
            Este cambio afectará todos los futuros movimientos de inventario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm}>Confirmar Cambio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 6. Estados y Validaciones

### Estados de Periodo
```typescript
type EstadoPeriodo = 
  | 'activo'              // Periodo actualmente en uso
  | 'inactivo_limpio'     // Inactivo sin movimientos
  | 'inactivo_con_datos'  // Inactivo con movimientos
  | 'futuro'              // Fecha de inicio futura
  | 'vencido';            // Fecha de fin pasada
```

### Validaciones de Negocio

#### Crear Periodo
- ✅ Nombre único por empresa
- ✅ Fechas válidas (inicio < fin)
- ✅ No solapamiento con periodos existentes
- ✅ Solo un periodo activo

#### Cambiar Método de Valoración
- ✅ Periodo debe existir
- ✅ No debe tener movimientos
- ✅ Usuario debe tener permisos
- ✅ Método debe ser válido (PROMEDIO/FIFO)

#### Activar/Desactivar Periodo
- ✅ Solo un periodo activo a la vez
- ✅ Periodo debe estar en rango de fechas válido
- ✅ No se puede desactivar si hay operaciones pendientes

---

## 7. Flujos de Usuario

### Flujo 1: Configuración Inicial
1. Usuario accede a "Configuración > Periodos"
2. Ve lista vacía o con periodos existentes
3. Hace clic en "Nuevo Periodo"
4. Completa formulario con datos básicos
5. Selecciona método de valoración inicial
6. Guarda y el sistema crea configuración automática
7. Redirección a lista con nuevo periodo

### Flujo 2: Cambio de Método (Sin Movimientos)
1. Usuario accede a configuración de valoración
2. Ve método actual y opción de cambio
3. Selecciona nuevo método
4. Confirma cambio en modal
5. Sistema actualiza configuración
6. Muestra confirmación de éxito

### Flujo 3: Intento de Cambio (Con Movimientos)
1. Usuario accede a configuración de valoración
2. Ve método actual bloqueado
3. Sistema muestra alerta explicativa
4. Usuario puede ver movimientos existentes
5. Opción de contactar soporte para casos especiales

### Flujo 4: Activación de Periodo
1. Usuario ve lista de periodos
2. Identifica periodo a activar
3. Hace clic en "Activar"
4. Sistema valida que no hay otro activo
5. Confirma activación
6. Actualiza estado visual

---

## 8. Consideraciones de UX

### Feedback Visual
- **Loading States**: Spinners durante operaciones
- **Success States**: Toasts de confirmación
- **Error States**: Mensajes claros y accionables
- **Empty States**: Ilustraciones y CTAs para primeros usos

### Accesibilidad
- ✅ Navegación por teclado
- ✅ Screen reader friendly
- ✅ Contraste adecuado
- ✅ Textos alternativos

### Responsive Design
- **Desktop**: Tabla completa con todas las columnas
- **Tablet**: Tabla condensada con columnas esenciales
- **Mobile**: Cards apiladas con información clave

### Performance
- ✅ Lazy loading para listas grandes
- ✅ Debounce en filtros de búsqueda
- ✅ Cache de configuraciones frecuentes
- ✅ Optimistic updates donde sea apropiado

---

## 9. Integración con Backend

### Manejo de Estados
```typescript
// Store para periodos
interface PeriodosState {
  periodos: Periodo[];
  periodoActivo: Periodo | null;
  configuracionActual: ConfiguracionPeriodo | null;
  loading: boolean;
  error: string | null;
}

// Actions
type PeriodosAction = 
  | { type: 'FETCH_PERIODOS_START' }
  | { type: 'FETCH_PERIODOS_SUCCESS'; payload: Periodo[] }
  | { type: 'FETCH_PERIODOS_ERROR'; payload: string }
  | { type: 'UPDATE_METODO_VALORACION'; payload: ConfiguracionPeriodo }
  | { type: 'ACTIVATE_PERIODO'; payload: number };
```

### Servicios API
```typescript
class PeriodosService {
  async getPeriodos(): Promise<Periodo[]> {
    return api.get('/api/periodos');
  }
  
  async createPeriodo(data: CreatePeriodoDto): Promise<Periodo> {
    return api.post('/api/periodos', data);
  }
  
  async updateMetodoValoracion(periodoId: number, metodo: MetodoValoracion): Promise<ConfiguracionPeriodo> {
    return api.put(`/api/periodos/${periodoId}/metodo-valoracion`, { metodoValoracion: metodo });
  }
  
  async getConfiguracionActiva(): Promise<ConfiguracionPeriodo> {
    return api.get('/api/periodos/activo/configuracion');
  }
}
```

---

## 10. Testing

### Unit Tests
- Componentes de formulario
- Validaciones de negocio
- Transformaciones de datos
- Servicios API

### Integration Tests
- Flujos completos de usuario
- Integración con backend
- Manejo de errores
- Estados de loading

### E2E Tests
- Crear periodo completo
- Cambiar método de valoración
- Activar/desactivar periodos
- Validaciones de restricciones

---

## Resumen de Vistas Necesarias

1. **📋 Lista de Periodos** - Vista principal con tabla y filtros
2. **➕ Crear Periodo** - Formulario de creación con validaciones
3. **✏️ Editar Periodo** - Formulario de edición
4. **⚙️ Configuración de Valoración** - Gestión de métodos por periodo
5. **📊 Dashboard de Configuración** - Vista resumen y acciones rápidas
6. **🔧 Componentes Reutilizables** - Badges, modales, alertas

Cada vista está diseñada para ser intuitiva, accesible y eficiente, siguiendo las mejores prácticas de UX y las restricciones de negocio del sistema de valoración de inventarios.