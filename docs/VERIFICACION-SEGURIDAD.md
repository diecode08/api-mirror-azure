# ✅ Verificación de Seguridad - Mejora Flujo Reserva-Ocupación

## 🔒 GARANTÍA DE SEGURIDAD

**Este script es 100% SEGURO porque:**

1. ✅ **NO usa `DROP TABLE`** - No elimina tablas
2. ✅ **NO usa `DELETE`** - No elimina datos
3. ✅ **NO usa `UPDATE`** - No modifica datos existentes
4. ✅ **Solo usa `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`** - Solo agrega columnas nuevas
5. ✅ **Solo crea funciones, triggers y vistas** - No afecta datos
6. ✅ **Es idempotente** - Se puede ejecutar múltiples veces sin problemas

---

## 📊 ANTES DE EJECUTAR - Verifica tus datos actuales

Ejecuta estas consultas en Supabase para guardar un "snapshot" de tus datos:

### 1. Contar registros actuales
```sql
-- Contar reservas
SELECT COUNT(*) as total_reservas FROM reserva;

-- Contar ocupaciones
SELECT COUNT(*) as total_ocupaciones FROM ocupacion;

-- Contar pagos
SELECT COUNT(*) as total_pagos FROM pago;

-- Contar vehículos
SELECT COUNT(*) as total_vehiculos FROM vehiculo;
```

### 2. Ver una muestra de datos
```sql
-- Ver últimas 5 reservas
SELECT id_reserva, id_usuario, id_espacio, estado, fecha_reserva 
FROM reserva 
ORDER BY fecha_reserva DESC 
LIMIT 5;

-- Ver últimas 5 ocupaciones
SELECT id_ocupacion, id_usuario, id_espacio, hora_entrada, hora_salida, costo_total
FROM ocupacion 
ORDER BY id_ocupacion DESC 
LIMIT 5;
```

### 3. Verificar estructura actual
```sql
-- Ver columnas de la tabla reserva
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reserva';

-- Ver columnas de la tabla ocupacion
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ocupacion';
```

**📝 GUARDA ESTOS RESULTADOS** para compararlos después.

---

## ⚡ EJECUTAR EL SCRIPT

1. Abre Supabase SQL Editor
2. Copia y pega **TODO** el contenido de `mejora-flujo-reserva-ocupacion.sql`
3. Click en **Run** (Ctrl+Enter)
4. Espera a que termine (verás mensajes en verde)

---

## ✅ DESPUÉS DE EJECUTAR - Verifica que todo esté bien

### 1. Contar registros (deben ser iguales)
```sql
-- Contar reservas (debe ser igual que antes)
SELECT COUNT(*) as total_reservas FROM reserva;

-- Contar ocupaciones (debe ser igual que antes)
SELECT COUNT(*) as total_ocupaciones FROM ocupacion;

-- Contar pagos (debe ser igual que antes)
SELECT COUNT(*) as total_pagos FROM pago;
```

### 2. Verificar nuevas columnas (deben existir con NULL)
```sql
-- Ver columnas nuevas en reserva
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reserva'
  AND column_name = 'id_vehiculo';

-- Ver columnas nuevas en ocupacion
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ocupacion'
  AND column_name = 'id_vehiculo';
```

**Resultado esperado:**
```
column_name  | data_type | is_nullable
-------------|-----------|------------
id_vehiculo  | integer   | YES
```

### 3. Verificar que datos antiguos tengan NULL
```sql
-- Ver reservas antiguas (id_vehiculo debe ser NULL)
SELECT id_reserva, id_usuario, id_espacio, id_vehiculo, estado 
FROM reserva 
ORDER BY fecha_reserva DESC 
LIMIT 5;

-- Ver ocupaciones antiguas (id_vehiculo debe ser NULL)
SELECT id_ocupacion, id_usuario, id_espacio, id_vehiculo, hora_entrada
FROM ocupacion 
ORDER BY id_ocupacion DESC 
LIMIT 5;
```

**Resultado esperado:** Los registros existentes tendrán `id_vehiculo = NULL`

### 4. Verificar funciones nuevas
```sql
-- Ver funciones creadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION'
  AND routine_name LIKE '%parking%';
```

**Resultado esperado:**
```
- crear_espacios_parking
- calcular_costo_ocupacion
- marcar_entrada_parking
- marcar_salida_parking
- (otras existentes...)
```

### 5. Verificar vistas nuevas
```sql
-- Ver vistas creadas
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE 'vista_%';
```

**Resultado esperado:**
```
- vista_parkings_completos
- vista_ocupaciones_activas
- vista_historial_ocupaciones
```

### 6. Verificar triggers nuevos
```sql
-- Ver triggers creados
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%parking%' OR trigger_name LIKE '%costo%';
```

**Resultado esperado:**
```
- trigger_calcular_costo (en tabla ocupacion)
- trigger_validar_espacios (en tabla parking)
- trigger_validar_tarifa (en tabla parking)
```

---

## 🧪 PRUEBA DE FUNCIONALIDAD

### Probar cálculo de costo
```sql
-- Simular una ocupación de 2.5 horas
INSERT INTO ocupacion (id_usuario, id_espacio, hora_entrada, hora_salida)
VALUES (
  (SELECT id_usuario FROM usuario LIMIT 1),
  (SELECT id_espacio FROM espacio LIMIT 1),
  NOW() - INTERVAL '2.5 hours',
  NOW()
);

-- Ver el costo calculado automáticamente
SELECT 
  id_ocupacion,
  hora_entrada,
  hora_salida,
  EXTRACT(EPOCH FROM (hora_salida - hora_entrada)) / 3600.0 as horas_reales,
  costo_total
FROM ocupacion
ORDER BY id_ocupacion DESC
LIMIT 1;
```

**Resultado esperado:**
- `horas_reales`: 2.5
- `costo_total`: 12.00 (3 fracciones × S/4.00)

### Probar vista de ocupaciones activas
```sql
-- Ver ocupaciones activas
SELECT * FROM vista_ocupaciones_activas;
```

---

## ❌ SI ALGO SALE MAL (Rollback)

**Opción 1: Eliminar columnas agregadas**
```sql
-- SOLO si necesitas revertir los cambios
ALTER TABLE reserva DROP COLUMN IF EXISTS id_vehiculo;
ALTER TABLE ocupacion DROP COLUMN IF EXISTS id_vehiculo;
```

**Opción 2: Eliminar funciones**
```sql
DROP FUNCTION IF EXISTS calcular_costo_ocupacion;
DROP FUNCTION IF EXISTS marcar_entrada_parking;
DROP FUNCTION IF EXISTS marcar_salida_parking;
```

**Opción 3: Eliminar vistas**
```sql
DROP VIEW IF EXISTS vista_ocupaciones_activas;
DROP VIEW IF EXISTS vista_historial_ocupaciones;
```

**⚠️ PERO ESTO NO DEBERÍA SER NECESARIO** porque el script es seguro.

---

## 📝 RESUMEN DE CAMBIOS

### Lo que se AGREGA:
- ✅ Columna `id_vehiculo` en tabla `reserva` (NULL en datos existentes)
- ✅ Columna `id_vehiculo` en tabla `ocupacion` (NULL en datos existentes)
- ✅ Función `calcular_costo_ocupacion()`
- ✅ Función `marcar_entrada_parking()`
- ✅ Función `marcar_salida_parking()`
- ✅ Trigger `trigger_calcular_costo`
- ✅ Vista `vista_ocupaciones_activas`
- ✅ Vista `vista_historial_ocupaciones`
- ✅ Comentarios en columnas para documentación

### Lo que NO se modifica:
- ✅ **Ningún dato existente**
- ✅ **Ninguna tabla existente** (solo se agregan columnas)
- ✅ **Ningún registro** en reserva, ocupacion, pago, vehiculo, etc.

---

## 🎯 CONFIRMACIÓN FINAL

Después de ejecutar y verificar, deberías poder responder **SÍ** a estas preguntas:

- [ ] ¿El número total de reservas es el mismo? → **SÍ**
- [ ] ¿El número total de ocupaciones es el mismo? → **SÍ**
- [ ] ¿El número total de pagos es el mismo? → **SÍ**
- [ ] ¿Las columnas nuevas existen? → **SÍ**
- [ ] ¿Las funciones nuevas existen? → **SÍ**
- [ ] ¿Las vistas nuevas existen? → **SÍ**
- [ ] ¿Los datos antiguos tienen id_vehiculo = NULL? → **SÍ**
- [ ] ¿La app móvil sigue funcionando sin errores? → **SÍ**

Si todas las respuestas son **SÍ**, ¡todo está perfecto! ✅
