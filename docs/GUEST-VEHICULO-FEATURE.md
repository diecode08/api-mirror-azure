# Feature: Datos de Vehículo en Reservas Manuales

## Cambios Implementados

### 1. **Nueva Migración: 024-guest-vehiculo-campos.sql**

Agrega 4 campos opcionales para registrar datos del vehículo del visitante en reservas/ocupaciones manuales:

**Tablas modificadas:**
- `reserva`: + `guest_vehiculo_placa`, `guest_vehiculo_marca`, `guest_vehiculo_modelo`, `guest_vehiculo_color`
- `ocupacion`: + `guest_vehiculo_placa`, `guest_vehiculo_marca`, `guest_vehiculo_modelo`, `guest_vehiculo_color`

**Vistas actualizadas:**
- `vista_ocupaciones_activas`: Ahora devuelve datos de vehículo (registrado o invitado con fallback)
- `vista_pagos_pendientes_parking`: Incluye datos de vehículo invitado

**Índices creados:**
- `idx_reserva_guest_placa` - para búsquedas rápidas por placa en reservas
- `idx_ocupacion_guest_placa` - para búsquedas rápidas por placa en ocupaciones

### 2. **Backend: Controller Actualizado**

**Archivo**: `src/controllers/reserva.controller.js` → `createReservaManual`

**Cambios**:
- Acepta 4 nuevos parámetros opcionales del body:
  - `guest_vehiculo_placa`
  - `guest_vehiculo_marca`
  - `guest_vehiculo_modelo`
  - `guest_vehiculo_color`
- Guarda estos datos tanto en `reserva` como en `ocupacion` (si se marca entrada inmediata)

**Ejemplo de payload**:
```javascript
{
  id_parking: 1,
  id_espacio: 5,
  id_tarifa: 2,
  guest_nombre: "Carlos Díaz",
  guest_documento: "12345678",
  guest_telefono: "987654321",
  // Nuevos campos de vehículo
  guest_vehiculo_placa: "ABC-123",
  guest_vehiculo_marca: "Toyota",
  guest_vehiculo_modelo: "Corolla",
  guest_vehiculo_color: "Rojo",
  marcar_entrada: true
}
```

### 3. **Frontend: Modal de Reserva Manual Mejorado**

**Archivo**: `components/ManualReserveModal.tsx`

**Mejoras UI**:
- Nueva sección "Datos del Vehículo (opcional)" con separador visual
- 4 inputs nuevos:
  - **Placa**: Convierte automáticamente a mayúsculas, máximo 10 caracteres
  - **Marca** y **Modelo**: En grid 2 columnas para mejor uso del espacio
  - **Color**: Input simple
- Todos opcionales, no bloquean la creación si están vacíos
- Se incluyen en el payload POST a `/reservas/manual`

**Estado del formulario extendido**:
```typescript
{
  guest_nombre: "",
  guest_documento: "",
  guest_telefono: "",
  guest_vehiculo_placa: "",      // Nuevo
  guest_vehiculo_marca: "",      // Nuevo
  guest_vehiculo_modelo: "",     // Nuevo
  guest_vehiculo_color: "",      // Nuevo
  id_espacio: "",
  id_tarifa: "",
  marcar_entrada: true
}
```

### 4. **TypeScript: Tipos Actualizados**

**Archivo**: `lib/reservas.ts`

**Interface `ReservaRecord`**:
```typescript
export interface ReservaRecord {
  // ... campos existentes
  
  // Campos para reservas manuales (invitado - vehículo)
  guest_vehiculo_placa?: string | null;
  guest_vehiculo_marca?: string | null;
  guest_vehiculo_modelo?: string | null;
  guest_vehiculo_color?: string | null;
}
```

**Interface `OcupacionRecord`**:
```typescript
export interface OcupacionRecord {
  // ... campos existentes
  
  // Campos de vehículo invitado explícitos
  guest_vehiculo_placa?: string;
  guest_vehiculo_marca?: string;
  guest_vehiculo_modelo?: string;
  guest_vehiculo_color?: string;
}
```

## Cómo Usar

### Aplicar Migración

1. Abre el SQL Editor de Supabase
2. Copia y pega el contenido de `migrations/024-guest-vehiculo-campos.sql`
3. Ejecuta

**Verificar aplicación**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('reserva','ocupacion') 
  AND column_name LIKE 'guest_vehiculo%'
ORDER BY table_name, column_name;
```

Deberías ver 8 filas (4 en reserva, 4 en ocupacion).

### Crear Reserva Manual con Vehículo

**Desde el frontend web**:
1. Ve a "Mis Parkings" → selecciona un parking
2. Clic en "Reserva Manual"
3. Completa:
   - ✅ Nombre del visitante (requerido)
   - DNI/CE (opcional)
   - Teléfono (opcional)
   - **Placa** (opcional, ej: "ABC-123")
   - **Marca** (opcional, ej: "Honda")
   - **Modelo** (opcional, ej: "Civic")
   - **Color** (opcional, ej: "Negro")
   - Espacio (requerido)
   - Tarifa (opcional)
   - Marcar entrada inmediata (checkbox)
4. Clic en "Crear Reserva" o "Crear y Marcar Entrada"

**Resultado esperado**:
- ✅ Reserva creada con datos de vehículo guardados
- ✅ Si marcaste entrada, la ocupación también tiene los datos del vehículo
- ✅ En vistas/listas aparecerán los datos del vehículo (placa, marca, modelo, color)

### Visualización de Datos

**En vista de ocupaciones activas**:
```sql
SELECT cliente, vehiculo_placa, vehiculo_marca, vehiculo_modelo, vehiculo_color
FROM vista_ocupaciones_activas
WHERE guest_nombre IS NOT NULL;
```

Los campos `vehiculo_*` de la vista usan COALESCE para priorizar:
1. Vehículo registrado (si existe `id_vehiculo`)
2. Datos de vehículo invitado en ocupación
3. Datos de vehículo invitado en reserva

**En lista de reservas** (próximo paso - pendiente de mostrar en tabla UI):
- Columna "Vehículo" mostraría: `guest_vehiculo_placa` o "—" si no hay
- Tooltip/detalle mostraría marca, modelo y color

## Casos de Uso

### 1. Visitante Ocasional sin Cuenta

**Escenario**: Cliente llega al parking sin app ni cuenta registrada.

**Flujo**:
- Admin web crea reserva manual:
  - Nombre: "María López"
  - DNI: "87654321"
  - Placa: "XYZ-789"
  - Marca: "Nissan"
  - Modelo: "Sentra"
  - Color: "Blanco"
  - Marca entrada inmediata ✅
- Sistema registra ocupación con todos los datos
- Al solicitar salida, el sistema muestra placa y datos del vehículo en el panel de pagos

### 2. Evento Corporativo con Varios Invitados

**Escenario**: Empresa organiza evento, varios visitantes sin app.

**Flujo**:
- Admin pre-registra 10 reservas manuales incluyendo placas de vehículos
- En la entrada física, el guardia verifica placa contra la lista
- Al salir, sistema identifica vehículo por placa y procesa pago

### 3. Reserva Manual sin Datos de Vehículo

**Escenario**: Admin crea reserva rápida sin tiempo de preguntar datos del vehículo.

**Flujo**:
- Admin solo llena nombre del visitante y espacio
- Campos de vehículo quedan vacíos (NULL)
- Sistema funciona normalmente, solo que en listas aparece "—" en datos de vehículo

## Beneficios

✅ **Trazabilidad completa**: Registro de qué vehículo ocupó qué espacio y cuándo  
✅ **Seguridad**: Validación de placas en entrada/salida  
✅ **Reportes**: Estadísticas de marcas/modelos más frecuentes  
✅ **Búsquedas**: Localizar reservas/ocupaciones por placa rápidamente (índices creados)  
✅ **Flexibilidad**: Campos opcionales, no bloquean flujo si no se tienen los datos  
✅ **Consistencia**: Mismos datos en reserva y ocupación para trazabilidad

## Archivos Modificados

```
api-nodejs-parking/
├── migrations/
│   └── 024-guest-vehiculo-campos.sql       ← Nueva migración
├── src/
│   └── controllers/
│       └── reserva.controller.js            ← Acepta campos vehículo
└── docs/
    └── GUEST-VEHICULO-FEATURE.md           ← Este archivo

front-web/
├── components/
│   └── ManualReserveModal.tsx              ← Inputs de vehículo
└── lib/
    └── reservas.ts                          ← Tipos actualizados
```

## Próximas Mejoras (Opcional)

1. **Mostrar en tabla de reservas**: Agregar columna "Vehículo" en la tabla de reservas del parking
2. **Lista de vehículos**: Tab independiente que muestre todos los vehículos (registrados + invitados) que han usado el parking
3. **Autocompletado**: Si se ingresa una placa ya registrada antes, sugerir marca/modelo/color guardados
4. **Validación de placa**: Regex para formato de placas peruanas (ABC-123, A1B-234, etc.)
5. **Búsqueda por placa**: Input de búsqueda global para encontrar reservas/ocupaciones por placa

---

**Fecha**: 11 de noviembre de 2025  
**Migración**: 024  
**Compatibilidad**: Requiere migraciones 001-023 aplicadas
