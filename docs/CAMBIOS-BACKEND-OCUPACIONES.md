# 🔧 Cambios en el Backend API - Flujo Ocupaciones

## ✅ Archivos Modificados

### 1. **`src/controllers/ocupacion.controller.js`** ✅

**Funciones agregadas:**

```javascript
// Marcar entrada física (usa función SQL marcar_entrada_parking)
marcarEntrada(req, res)
  - Recibe: { id_reserva }
  - Valida que la reserva pertenezca al usuario
  - Valida que esté en estado 'pendiente'
  - Llama a Ocupacion.marcarEntrada(id_reserva)
  - Retorna: { id_ocupacion }

// Marcar salida física (usa función SQL marcar_salida_parking)  
marcarSalida(req, res)
  - Recibe: { id_ocupacion }
  - Valida que la ocupación pertenezca al usuario
  - Valida que no tenga salida registrada
  - Llama a Ocupacion.marcarSalida(id_ocupacion)
  - Retorna: { costo_calculado, tiempo_total_horas }

// Obtener ocupación activa del usuario
getOcupacionActiva(req, res)
  - Obtiene id_usuario del token JWT
  - Llama a Ocupacion.getActivaByUserId(id_usuario)
  - Retorna ocupación activa o null

// Obtener historial de ocupaciones
getHistorialOcupaciones(req, res)
  - Obtiene id_usuario del token JWT
  - Lee query param 'limit' (default: 50)
  - Llama a Ocupacion.getHistorialByUserId(id_usuario, limit)
  - Retorna array de ocupaciones finalizadas
```

### 2. **`src/models/ocupacion.model.js`** ✅

**Métodos agregados:**

```javascript
// Llamar a función SQL marcar_entrada_parking
static async marcarEntrada(id_reserva)
  - Ejecuta: supabase.rpc('marcar_entrada_parking', { p_id_reserva })
  - Retorna: id_ocupacion

// Llamar a función SQL marcar_salida_parking
static async marcarSalida(id_ocupacion)
  - Ejecuta: supabase.rpc('marcar_salida_parking', { p_id_ocupacion })
  - Retorna: { costo_calculado, tiempo_total_horas }

// Obtener ocupación activa de un usuario (desde vista SQL)
static async getActivaByUserId(id_usuario)
  - Query: vista_ocupaciones_activas WHERE id_usuario = ?
  - Retorna: objeto ocupación o null

// Obtener historial de ocupaciones (desde vista SQL)
static async getHistorialByUserId(id_usuario, limit = 50)
  - Query: vista_historial_ocupaciones WHERE id_usuario = ?
  - Order by: hora_salida DESC
  - Limit: 50 (configurable)
  - Retorna: array de ocupaciones
```

### 3. **`src/routes/ocupacion.routes.js`** ✅

**Rutas agregadas:**

```javascript
// POST /api/ocupaciones/marcar-entrada
router.post('/marcar-entrada', verifyToken, ocupacionController.marcarEntrada);

// POST /api/ocupaciones/marcar-salida
router.post('/marcar-salida', verifyToken, ocupacionController.marcarSalida);

// GET /api/ocupaciones/activa
router.get('/activa', verifyToken, ocupacionController.getOcupacionActiva);

// GET /api/ocupaciones/historial?limit=50
router.get('/historial', verifyToken, ocupacionController.getHistorialOcupaciones);
```

**⚠️ IMPORTANTE:** Las nuevas rutas están ANTES de `/:id` para evitar conflictos de routing.

---

## 📋 Endpoints Disponibles

### **POST `/api/ocupaciones/marcar-entrada`**
Marca la entrada física al parking.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "id_reserva": 123
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Entrada registrada exitosamente",
  "data": {
    "id_ocupacion": 456
  }
}
```

**Errores:**
- `400`: ID de reserva no proporcionado
- `404`: Reserva no encontrada
- `403`: La reserva no pertenece al usuario
- `400`: La reserva ya está en estado activa/completada
- `500`: Error del servidor

---

### **POST `/api/ocupaciones/marcar-salida`**
Marca la salida física del parking.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "id_ocupacion": 456
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Salida registrada exitosamente",
  "data": {
    "costo_calculado": 12.00,
    "tiempo_total_horas": 2.5
  }
}
```

**Errores:**
- `400`: ID de ocupación no proporcionado
- `404`: Ocupación no encontrada
- `403`: La ocupación no pertenece al usuario
- `400`: La ocupación ya tiene salida registrada
- `500`: Error del servidor

---

### **GET `/api/ocupaciones/activa`**
Obtiene la ocupación activa del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id_ocupacion": 456,
    "id_reserva": 123,
    "id_usuario": "uuid-abc-123",
    "id_espacio": 45,
    "id_vehiculo": 12,
    "hora_entrada": "2025-10-17T14:30:00Z",
    "hora_salida": null,
    "costo_total": null,
    "cliente": "Juan Pérez",
    "vehiculo_placa": "ABC-123",
    "parking": "Parking Central",
    "numero_espacio": "A-05",
    "horas_transcurridas": 2.5,
    "costo_actual": 12.00,
    "tarifa_hora": 4.00
  }
}
```

**Si no hay ocupación activa:**
```json
{
  "success": true,
  "data": null
}
```

---

### **GET `/api/ocupaciones/historial?limit=50`**
Obtiene el historial de ocupaciones finalizadas del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `limit` (opcional): Número máximo de resultados (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id_ocupacion": 455,
      "id_reserva": 122,
      "cliente": "Juan Pérez",
      "vehiculo_placa": "ABC-123",
      "parking": "Parking Central",
      "numero_espacio": "A-05",
      "hora_entrada": "2025-10-16T10:00:00Z",
      "hora_salida": "2025-10-16T12:30:00Z",
      "horas_totales": 2.5,
      "costo_total": 12.00,
      "estado_pago": "completado"
    },
    {
      "id_ocupacion": 450,
      "id_reserva": 120,
      "cliente": "Juan Pérez",
      "vehiculo_placa": "XYZ-789",
      "parking": "Parking Norte",
      "numero_espacio": "B-12",
      "hora_entrada": "2025-10-15T14:00:00Z",
      "hora_salida": "2025-10-15T16:00:00Z",
      "horas_totales": 2.0,
      "costo_total": 8.00,
      "estado_pago": "pendiente"
    }
  ]
}
```

---

## 🔄 Flujo Completo Backend

```
1. Usuario crea reserva
   POST /api/reservas
   Body: { id_espacio, id_vehiculo, fecha_inicio, fecha_fin }
   → Crea registro en tabla 'reserva' (estado: 'pendiente')

2. Usuario llega físicamente al parking
   POST /api/ocupaciones/marcar-entrada
   Body: { id_reserva }
   → Llama función SQL marcar_entrada_parking()
   → Crea registro en 'ocupacion' (hora_entrada = NOW())
   → Cambia reserva.estado = 'activa'
   → Cambia espacio.estado = 'ocupado'

3. Usuario consulta tiempo y costo en tiempo real
   GET /api/ocupaciones/activa
   → Lee desde vista 'vista_ocupaciones_activas'
   → Retorna datos con horas_transcurridas y costo_actual

4. Usuario sale del parking
   POST /api/ocupaciones/marcar-salida
   Body: { id_ocupacion }
   → Llama función SQL marcar_salida_parking()
   → Actualiza ocupacion.hora_salida = NOW()
   → Calcula ocupacion.costo_total (trigger automático)
   → Cambia espacio.estado = 'disponible'
   → Cambia reserva.estado = 'completada'

5. Usuario consulta historial
   GET /api/ocupaciones/historial
   → Lee desde vista 'vista_historial_ocupaciones'
   → Retorna ocupaciones finalizadas ordenadas por fecha
```

---

## 🗃️ Funciones SQL Utilizadas

Estas funciones fueron creadas en el script `mejora-flujo-reserva-ocupacion.sql`:

### **`marcar_entrada_parking(p_id_reserva INTEGER)`**
- Valida que la reserva esté en estado 'pendiente'
- Crea registro en tabla `ocupacion`
- Actualiza `reserva.estado = 'activa'`
- Actualiza `espacio.estado = 'ocupado'`
- Retorna `id_ocupacion`

### **`marcar_salida_parking(p_id_ocupacion INTEGER)`**
- Valida que la ocupación esté activa (sin hora_salida)
- Actualiza `ocupacion.hora_salida = NOW()`
- **Trigger automático** calcula `ocupacion.costo_total`
- Actualiza `espacio.estado = 'disponible'`
- Actualiza `reserva.estado = 'completada'`
- Retorna `{ costo_calculado, tiempo_total_horas }`

### **`calcular_costo_ocupacion(p_id_ocupacion INTEGER)`**
- Calcula horas transcurridas
- Redondea hacia arriba (CEIL)
- Multiplica por tarifa por hora
- Retorna costo total

---

## 🧪 Pruebas con Postman/Thunder Client

### 1. **Crear Reserva**
```
POST http://localhost:3000/api/reservas
Authorization: Bearer <tu-token>
Content-Type: application/json

{
  "id_espacio": 45,
  "id_vehiculo": 12,
  "fecha_inicio": "2025-10-17T16:00:00Z",
  "fecha_fin": "2025-10-17T18:00:00Z"
}
```

### 2. **Marcar Entrada**
```
POST http://localhost:3000/api/ocupaciones/marcar-entrada
Authorization: Bearer <tu-token>
Content-Type: application/json

{
  "id_reserva": 123
}
```

### 3. **Ver Ocupación Activa**
```
GET http://localhost:3000/api/ocupaciones/activa
Authorization: Bearer <tu-token>
```

### 4. **Marcar Salida**
```
POST http://localhost:3000/api/ocupaciones/marcar-salida
Authorization: Bearer <tu-token>
Content-Type: application/json

{
  "id_ocupacion": 456
}
```

### 5. **Ver Historial**
```
GET http://localhost:3000/api/ocupaciones/historial?limit=10
Authorization: Bearer <tu-token>
```

---

## ✅ Validaciones Implementadas

### En `marcarEntrada`:
- ✅ Token JWT válido
- ✅ `id_reserva` es requerido
- ✅ Reserva existe
- ✅ Reserva pertenece al usuario autenticado
- ✅ Reserva está en estado 'pendiente'

### En `marcarSalida`:
- ✅ Token JWT válido
- ✅ `id_ocupacion` es requerido
- ✅ Ocupación existe
- ✅ Ocupación pertenece al usuario autenticado
- ✅ Ocupación no tiene salida registrada (hora_salida = NULL)

### En `getOcupacionActiva`:
- ✅ Token JWT válido
- ✅ Solo retorna ocupación del usuario autenticado

### En `getHistorialOcupaciones`:
- ✅ Token JWT válido
- ✅ Solo retorna ocupaciones del usuario autenticado
- ✅ Ordenadas por fecha descendente
- ✅ Limitadas a N resultados

---

## 📝 Notas Importantes

1. **Nombres de tablas en Supabase:**
   - Si tus tablas tienen nombres en minúsculas (`ocupacion`, `reserva`), necesitas cambiar en los modelos:
   ```javascript
   .from('ocupacion')  // en lugar de .from('Ocupacion')
   ```

2. **Vistas SQL:**
   - Las vistas `vista_ocupaciones_activas` y `vista_historial_ocupaciones` deben existir en Supabase
   - Se crean con el script `mejora-flujo-reserva-ocupacion.sql`

3. **Funciones SQL:**
   - Las funciones `marcar_entrada_parking` y `marcar_salida_parking` deben existir
   - Se crean con el script `mejora-flujo-reserva-ocupacion.sql`

4. **Nombres de columnas:**
   - Asegúrate de que coincidan con tu base de datos:
   - `hora_entrada` vs `fecha_entrada`
   - `hora_salida` vs `fecha_salida`
   - `id_ocupacion` vs otros nombres

---

## 🚀 Siguiente Paso

**Reiniciar el servidor:**
```bash
cd api-nodejs-parking
npm start
```

**Probar endpoints con la app móvil o Postman**

¡Todo listo para usar! 🎉
