# 🚗 Flujo Completo: Reserva → Ocupación → Pago

## 📋 Resumen del Flujo

```
1. RESERVA (desde casa/trabajo)
   ↓
2. LLEGADA (marca entrada física) → Crea OCUPACIÓN
   ↓
3. USO DEL PARKING (tiempo corre, costo se calcula en tiempo real)
   ↓
4. SALIDA (marca salida) → Calcula costo final
   ↓
5. PAGO (se cobra según tiempo real usado)
```

## 🗃️ Estructura de Datos

### **Tabla: `reserva`**
**Propósito:** Reserva ANTICIPADA del espacio
- `hora_inicio` / `hora_fin` → **Tiempo ESTIMADO** (cuando planea llegar/salir)
- `estado` → `pendiente` | `activa` | `completada` | `cancelada` | `expirada`

### **Tabla: `ocupacion`**
**Propósito:** Uso REAL del espacio
- `hora_entrada` → **Timestamp REAL** cuando marca entrada física
- `hora_salida` → **Timestamp REAL** cuando marca salida (puede ser NULL si aún está dentro)
- `costo_total` → Calculado automáticamente al marcar salida

### **Tabla: `pago`**
**Propósito:** Cobro final basado en tiempo real
- `monto` → Igual al `costo_total` de la ocupación
- `estado` → `pendiente` | `completado` | `rechazado`

## 📱 Flujo en la App Móvil

### **Paso 1: Crear Reserva**
```typescript
// El usuario reserva desde casa (30 min antes de llegar)
const reserva = await createReserva({
  id_espacio: 45,
  id_vehiculo: 12,
  hora_inicio: '2025-10-17 14:00:00', // Estima llegar a las 2pm
  hora_fin: '2025-10-17 16:00:00',    // Estima salir a las 4pm
  estado: 'pendiente'
});
```

### **Paso 2: Marcar Entrada (cuando llega físicamente)**
```typescript
// Llamar a la función SQL o endpoint API
POST /ocupaciones/marcar-entrada
Body: { id_reserva: 123 }

// Esto automáticamente:
// 1. Crea registro en tabla 'ocupacion' con hora_entrada = NOW()
// 2. Cambia reserva.estado = 'activa'
// 3. Cambia espacio.estado = 'ocupado'
```

### **Paso 3: Ver Costo en Tiempo Real (mientras está dentro)**
```typescript
// Mostrar en la app cuánto lleva y cuánto va
GET /ocupaciones/activa

Response:
{
  id_ocupacion: 456,
  hora_entrada: '2025-10-17 14:15:00',
  tiempo_transcurrido: '1.5 horas',
  costo_actual: 'S/ 6.00',
  tarifa_hora: 'S/ 4.00'
}
```

### **Paso 4: Marcar Salida**
```typescript
// Cuando el cliente se va
POST /ocupaciones/marcar-salida
Body: { id_ocupacion: 456 }

Response:
{
  costo_calculado: 8.00,      // 2 horas × S/4.00
  tiempo_total_horas: 2.15,   // 2 horas 9 minutos
  hora_entrada: '2025-10-17 14:15:00',
  hora_salida: '2025-10-17 16:24:00'
}

// Esto automáticamente:
// 1. Registra hora_salida = NOW()
// 2. Calcula costo_total (con redondeo hacia arriba por fracción)
// 3. Cambia espacio.estado = 'disponible'
// 4. Cambia reserva.estado = 'completada'
```

### **Paso 5: Procesar Pago**
```typescript
POST /pagos
Body: {
  id_ocupacion: 456,
  id_metodo: 1, // Yape
  monto: 8.00,
  estado: 'completado'
}
```

## ⚙️ Cambios Necesarios en la BD

El script `mejora-flujo-reserva-ocupacion.sql` hace lo siguiente:

1. ✅ Agrega `id_vehiculo` a `reserva` y `ocupacion`
2. ✅ Crea función `calcular_costo_ocupacion()` → calcula por hora/fracción
3. ✅ Crea función `marcar_entrada_parking()` → iniciar ocupación
4. ✅ Crea función `marcar_salida_parking()` → finalizar y calcular costo
5. ✅ Crea trigger automático para calcular costo al marcar salida
6. ✅ Crea vistas: `vista_ocupaciones_activas` y `vista_historial_ocupaciones`

## 💡 Cálculo de Costo por Fracción

**Lógica implementada:**
- Se cobra **por hora o fracción** (redondeo hacia arriba)
- Si usaste 1.2 horas → cobras 2 horas
- Si usaste 0.1 horas (6 min) → cobras 1 hora
- Si usaste exactamente 2.0 horas → cobras 2 horas

**Ejemplo:**
```
Entrada: 14:15:00
Salida:  16:24:00
Tiempo:  2 horas 9 minutos = 2.15 horas
Fracción: CEIL(2.15) = 3 horas
Tarifa:  S/ 4.00/hora
Costo:   3 × 4.00 = S/ 12.00
```

## 🔧 Endpoints API Necesarios

Necesitas crear estos endpoints en tu backend:

### **1. Marcar Entrada**
```javascript
// POST /api/ocupaciones/marcar-entrada
router.post('/marcar-entrada', async (req, res) => {
  const { id_reserva } = req.body;
  const result = await supabase.rpc('marcar_entrada_parking', { 
    p_id_reserva: id_reserva 
  });
  res.json({ id_ocupacion: result.data });
});
```

### **2. Marcar Salida**
```javascript
// POST /api/ocupaciones/marcar-salida
router.post('/marcar-salida', async (req, res) => {
  const { id_ocupacion } = req.body;
  const result = await supabase.rpc('marcar_salida_parking', {
    p_id_ocupacion: id_ocupacion
  });
  res.json(result.data);
});
```

### **3. Ver Ocupación Activa**
```javascript
// GET /api/ocupaciones/activa
router.get('/activa', async (req, res) => {
  const userId = req.user.id; // Del token JWT
  const { data } = await supabase
    .from('vista_ocupaciones_activas')
    .select('*')
    .eq('id_usuario', userId)
    .single();
  res.json(data);
});
```

### **4. Ver Historial**
```javascript
// GET /api/ocupaciones/historial
router.get('/historial', async (req, res) => {
  const userId = req.user.id;
  const { data } = await supabase
    .from('vista_historial_ocupaciones')
    .select('*')
    .eq('id_usuario', userId)
    .order('hora_salida', { ascending: false });
  res.json(data);
});
```

## 📱 Pantallas en la App Móvil

### **Nueva Pantalla Sugerida: `ActiveParkingScreen.tsx`**
Mostrar cuando el usuario tiene ocupación activa:
- ⏱️ Tiempo transcurrido (actualizado cada minuto)
- 💰 Costo actual en tiempo real
- 🅿️ Datos del parking y espacio
- 🚗 Vehículo usado
- 🚪 Botón "Marcar Salida"

### **Actualizar: `ReserveFlowScreen.tsx`**
Después de confirmar reserva, mostrar:
- ✅ "Reserva creada exitosamente"
- 📍 Botón "He llegado al parking" → llama a `marcarEntrada()`

## 🎯 Resumen

**LO QUE TIENES BIEN:**
- ✅ Separación de `reserva` y `ocupacion` → Correcto
- ✅ Campo `costo_total` en `ocupacion` → Correcto
- ✅ Tabla `pago` separada → Correcto

**LO QUE FALTABA:**
- ❌ `id_vehiculo` en reserva/ocupación → **AGREGADO** ✅
- ❌ Funciones para marcar entrada/salida → **CREADAS** ✅
- ❌ Cálculo automático de costo → **IMPLEMENTADO** ✅
- ❌ Vistas para ocupaciones activas → **CREADAS** ✅

**PRÓXIMOS PASOS:**
1. ✅ Ejecutar `mejora-flujo-reserva-ocupacion.sql` en Supabase
2. 🔲 Crear endpoints API para ocupaciones
3. 🔲 Actualizar `ReserveFlowScreen` para incluir `id_vehiculo`
4. 🔲 Crear `ActiveParkingScreen` para ver ocupación activa
5. 🔲 Agregar botón "Marcar Entrada" y "Marcar Salida"
