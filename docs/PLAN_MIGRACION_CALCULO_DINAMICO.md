# Plan de Migración: Sistema de Cálculo Dinámico de Stock

## Resumen
Este documento describe el plan de migración del sistema actual de campos calculados persistidos a un sistema de cálculo dinámico de stock e inventarios.

## Estado Actual vs Estado Objetivo

### Estado Actual
- **Campos calculados persistidos**: `cantidadActual`, `stockActual`, `costoPromedioActual`
- **Actualización en tiempo real**: Los campos se actualizan con cada transacción
- **Riesgo de inconsistencias**: Los datos pueden desincronizarse
- **Complejidad de mantenimiento**: Lógica de actualización distribuida

### Estado Objetivo
- **Cálculo dinámico**: Stock calculado en tiempo real desde movimientos
- **Caché inteligente**: Sistema de caché para optimizar rendimiento
- **Consistencia garantizada**: Datos siempre actualizados
- **Mantenimiento simplificado**: Lógica centralizada en servicios especializados

## Componentes Implementados

### ✅ Servicios Creados
1. **StockCalculationService**: Cálculo dinámico de stock de lotes e inventarios
2. **KardexCalculationService**: Cálculo de valoración PROMEDIO y FIFO
3. **StockCacheService**: Sistema de caché inteligente
4. **LoteCreationService**: Creación de lotes sin campos calculados

### ✅ Entidades Modificadas
- **InventarioLote**: Eliminados `cantidadActual`
- **Inventario**: Eliminados `stockActual`, `costoPromedioActual`
- **MovimientoDetalle**: Eliminados `costoUnitario`, `costoTotal`

### ✅ Servicios Actualizados
- **ComprobanteService**: Integrado con LoteCreationService
- **LoteService**: Refactorizado para consultas únicamente
- **InventarioModule**: Agregados nuevos providers

## Fases de Migración

### Fase 1: Preparación (Completada)
- [x] Análisis del sistema actual
- [x] Diseño de la nueva arquitectura
- [x] Implementación de servicios de cálculo dinámico
- [x] Implementación del sistema de caché

### Fase 2: Migración de Código (Completada)
- [x] Modificación de entidades
- [x] Actualización de servicios de negocio
- [x] Integración de nuevos servicios
- [x] Actualización de módulos

### Fase 3: Migración de Datos (Pendiente)
- [ ] Script de migración de base de datos
- [ ] Validación de integridad de datos
- [ ] Backup de datos actuales
- [ ] Eliminación de columnas obsoletas

### Fase 4: Testing y Validación (Pendiente)
- [ ] Pruebas unitarias de nuevos servicios
- [ ] Pruebas de integración
- [ ] Pruebas de rendimiento
- [ ] Validación de consistencia de datos

### Fase 5: Despliegue (Pendiente)
- [ ] Despliegue en ambiente de desarrollo
- [ ] Pruebas de aceptación
- [ ] Despliegue en producción
- [ ] Monitoreo post-despliegue

## Script de Migración de Base de Datos

### Paso 1: Backup
```sql
-- Crear backup de tablas afectadas
CREATE TABLE inventario_lote_backup AS SELECT * FROM inventario_lote;
CREATE TABLE inventario_backup AS SELECT * FROM inventario;
CREATE TABLE movimiento_detalle_backup AS SELECT * FROM movimiento_detalle;
```

### Paso 2: Validación Pre-Migración
```sql
-- Validar integridad de datos antes de la migración
SELECT 
    COUNT(*) as total_lotes,
    SUM(CASE WHEN cantidad_actual IS NULL THEN 1 ELSE 0 END) as lotes_sin_cantidad,
    SUM(CASE WHEN cantidad_actual < 0 THEN 1 ELSE 0 END) as lotes_cantidad_negativa
FROM inventario_lote;

SELECT 
    COUNT(*) as total_inventarios,
    SUM(CASE WHEN stock_actual IS NULL THEN 1 ELSE 0 END) as inventarios_sin_stock,
    SUM(CASE WHEN stock_actual < 0 THEN 1 ELSE 0 END) as inventarios_stock_negativo
FROM inventario;
```

### Paso 3: Eliminación de Columnas
```sql
-- Eliminar columnas calculadas de inventario_lote
ALTER TABLE inventario_lote DROP COLUMN IF EXISTS cantidad_actual;

-- Eliminar columnas calculadas de inventario
ALTER TABLE inventario DROP COLUMN IF EXISTS stock_actual;
ALTER TABLE inventario DROP COLUMN IF EXISTS costo_promedio_actual;

-- Eliminar columnas calculadas de movimiento_detalle
ALTER TABLE movimiento_detalle DROP COLUMN IF EXISTS costo_unitario;
ALTER TABLE movimiento_detalle DROP COLUMN IF EXISTS costo_total;
```

### Paso 4: Validación Post-Migración
```sql
-- Verificar que las columnas fueron eliminadas
SELECT column_name 
FROM information_schema.columns 
WHERE table_name IN ('inventario_lote', 'inventario', 'movimiento_detalle')
AND column_name IN ('cantidad_actual', 'stock_actual', 'costo_promedio_actual', 'costo_unitario', 'costo_total');
```

## Consideraciones de Rendimiento

### Optimizaciones Implementadas
1. **Sistema de Caché**: Reduce cálculos repetitivos
2. **Índices de Base de Datos**: Optimizar consultas de movimientos
3. **Cálculo Lazy**: Solo calcular cuando se necesite
4. **Invalidación Inteligente**: Limpiar caché solo cuando sea necesario

### Métricas a Monitorear
- Tiempo de respuesta de cálculos de stock
- Hit rate del sistema de caché
- Uso de memoria del caché
- Tiempo de consultas de movimientos

## Rollback Plan

### En caso de problemas críticos:
1. **Restaurar código anterior** desde control de versiones
2. **Restaurar base de datos** desde backup
3. **Revertir configuración** de módulos
4. **Validar funcionamiento** del sistema anterior

### Scripts de Rollback
```sql
-- Restaurar tablas desde backup
DROP TABLE inventario_lote;
CREATE TABLE inventario_lote AS SELECT * FROM inventario_lote_backup;

DROP TABLE inventario;
CREATE TABLE inventario AS SELECT * FROM inventario_backup;

DROP TABLE movimiento_detalle;
CREATE TABLE movimiento_detalle AS SELECT * FROM movimiento_detalle_backup;
```

## Checklist de Validación

### Pre-Migración
- [ ] Backup completo de base de datos
- [ ] Validación de integridad de datos actuales
- [ ] Pruebas en ambiente de desarrollo
- [ ] Documentación actualizada

### Post-Migración
- [ ] Verificación de eliminación de columnas
- [ ] Pruebas de funcionalidad básica
- [ ] Validación de cálculos de stock
- [ ] Monitoreo de rendimiento
- [ ] Validación de consistencia de datos

### Criterios de Éxito
- [ ] Todos los cálculos de stock son correctos
- [ ] El rendimiento es igual o mejor que antes
- [ ] No hay errores en logs de aplicación
- [ ] Los usuarios pueden realizar operaciones normalmente
- [ ] El sistema de caché funciona correctamente

## Contactos y Responsabilidades

### Equipo de Desarrollo
- **Desarrollador Principal**: Responsable de la implementación
- **QA**: Validación y pruebas
- **DevOps**: Despliegue y monitoreo

### Comunicación
- **Notificación previa**: 48 horas antes de la migración
- **Ventana de mantenimiento**: Definir horario de menor uso
- **Canal de comunicación**: Slack/Teams para actualizaciones en tiempo real

## Conclusión

La migración al sistema de cálculo dinámico representa una mejora significativa en:
- **Consistencia de datos**
- **Mantenibilidad del código**
- **Flexibilidad del sistema**
- **Confiabilidad de los cálculos**

El plan está diseñado para minimizar riesgos y asegurar una transición suave al nuevo sistema.