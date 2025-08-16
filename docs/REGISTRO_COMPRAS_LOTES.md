# Registro de Compras y Creación de Lotes

## Flujo Completo

### 1. Estructura de Datos

#### CreateComprobanteDto
```typescript
{
  correlativo: "CORR-12345",
  idPersona: 1, // ID del proveedor
  tipoOperacion: TipoOperacion.COMPRA,
  tipoComprobante: TipoComprobante.FACTURA,
  fechaEmision: "2024-01-15",
  moneda: Moneda.PEN,
  detalles: [
    {
      idInventario: 1, // ID del inventario específico
      cantidad: 10.5,
      unidadMedida: "KG",
      precioUnitario: 25.50,
      subtotal: 267.75,
      igv: 48.20,
      isc: 0,
      total: 315.95,
      descripcion: "Manzanas verdes"
    }
  ],
  metodoValoracion: MetodoValoracion.FIFO
}
```

### 2. Flujo de Procesamiento

1. **Registro de Comprobante** (`ComprobanteService.register()`)
   - Crea el comprobante principal
   - Genera correlativo automático
   - Guarda en base de datos

2. **Registro de Detalles** (`ComprobanteDetalleService.register()`)
   - Valida que cada detalle tenga un inventario válido
   - Verifica que el inventario tenga producto y almacén asociados
   - Establece las relaciones correctas

3. **Procesamiento de Lotes** (`LoteService.procesarLotesComprobante()`)
   - Para cada detalle de compra, crea un nuevo lote
   - Actualiza el stock del inventario
   - Valida que los lotes se crearon correctamente

### 3. Validaciones Implementadas

#### En ComprobanteDetalleService
- ✅ Inventario existe
- ✅ Inventario tiene producto asociado
- ✅ Inventario tiene almacén asociado
- ✅ Cada detalle tiene inventario

#### En LoteService
- ✅ Detalle tiene inventario válido
- ✅ Cantidad es positiva
- ✅ Precio unitario no es negativo
- ✅ Inventario tiene producto y almacén
- ✅ Lotes se crean con datos correctos

### 4. Logging y Debugging

El sistema incluye logging detallado en cada paso:

```
🔄 Iniciando registro de comprobante: Tipo=COMPRA
✅ Comprobante creado: ID=123, Correlativo=corr-000001
🔄 Registrando 2 detalles para comprobante 123
📦 Procesando detalle 1: Inventario=1, Cantidad=10.5
✅ Detalle 1 procesado: Inventario=1, Producto=5, Almacén=1
📦 Procesando detalle 2: Inventario=2, Cantidad=5.0
✅ Detalle 2 procesado: Inventario=2, Producto=6, Almacén=1
✅ 2 detalles guardados exitosamente
✅ Totales calculados para comprobante 123
🔄 Iniciando procesamiento de lotes: Tipo=COMPRA, Método=FIFO, Detalles=2
📦 Procesando detalle 1/2: Inventario=1, Cantidad=10.5
Iniciando creación de lote para detalle: Inventario=1, Cantidad=10.5
✅ Lote creado exitosamente: ID=456, Inventario=1, Producto=5, Almacén=1, Cantidad=10.5, Stock actualizado=15.5
📦 Procesando detalle 2/2: Inventario=2, Cantidad=5.0
Iniciando creación de lote para detalle: Inventario=2, Cantidad=5.0
✅ Lote creado exitosamente: ID=457, Inventario=2, Producto=6, Almacén=1, Cantidad=5.0, Stock actualizado=8.0
✅ Procesamiento de lotes completado exitosamente para 2 detalles
🔍 Validando lotes para compra 123
🔍 Validando lotes creados para 2 detalles
✅ Lote 456 validado correctamente para inventario 1
✅ Lote 457 validado correctamente para inventario 2
✅ Todos los lotes validados correctamente
✅ Lotes validados correctamente para compra 123
✅ Movimiento creado para comprobante 123
```

### 5. Endpoints Útiles

#### Consultar Lotes Recientes
```http
GET /api/lotes/recientes
```

#### Consultar Lotes por Inventario
```http
GET /api/lotes/inventario/{idInventario}
```

#### Consultar Lotes Disponibles
```http
GET /api/lotes/inventario/{idInventario}/disponibles
```

### 6. Estructura de Lote Creado

```typescript
{
  id: 456,
  inventario: {
    id: 1,
    producto: { id: 5, nombre: "Manzanas" },
    almacen: { id: 1, nombre: "Almacén Principal" },
    stockActual: 15.5
  },
  numeroLote: "LOTE-1705312800000-1-5",
  cantidadInicial: 10.5,
  cantidadActual: 10.5,
  costoUnitario: 25.50,
  fechaIngreso: "2024-01-15T10:00:00.000Z",
  observaciones: "Lote creado automáticamente desde compra - Manzanas verdes"
}
```

### 7. Manejo de Errores

El sistema incluye validaciones robustas que lanzan errores descriptivos:

- `Inventario no encontrado: 999`
- `El inventario 999 no tiene un producto asociado`
- `El inventario 999 no tiene un almacén asociado`
- `La cantidad debe ser mayor a 0`
- `El precio unitario no puede ser negativo`
- `Error al crear los lotes para la compra. Verifique los logs para más detalles.`

### 8. Recomendaciones

1. **Antes de registrar una compra**, asegúrate de que:
   - El inventario existe y está correctamente configurado
   - El inventario tiene un producto asociado
   - El inventario tiene un almacén asociado
   - Los datos del detalle son válidos (cantidad > 0, precio >= 0)

2. **Para debugging**, revisa los logs del servidor que incluyen emojis para facilitar la identificación de cada paso.

3. **Para validar lotes**, usa el endpoint `/api/lotes/recientes` después de crear una compra.

4. **En caso de errores**, el sistema proporciona mensajes descriptivos que indican exactamente qué validación falló.
