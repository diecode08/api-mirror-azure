# 🗄️ Migraciones de Base de Datos

Este directorio contiene todas las migraciones SQL para la base de datos de Supabase.

## 📋 Orden de Ejecución

Ejecutar los scripts en el siguiente orden:

### 1️⃣ `001-soft-delete-vehiculo.sql`
- Implementa soft delete para vehículos
- Agrega campo `deleted_at` y `activo`
- **Requerido:** Primera migración

### 2️⃣ `002-fix-vehiculo-rls-policies.sql`
- Corrige políticas RLS (Row Level Security) de vehículos
- Mejora seguridad de acceso a datos
- **Requerido:** Después de 001

### 3️⃣ `003-mejoras-datos-parking.sql`
- Mejoras en la estructura de datos de parkings
- Optimizaciones de índices y constraints
- **Requerido:** Después de 002

### 4️⃣ `004-flujo-reserva-ocupacion.sql`
- Implementa flujo completo de reserva → ocupación → pago
- Funciones y triggers para gestión de estados
- **Requerido:** Después de 003

### 5️⃣ `005-estados-espacios.sql`
- Sistema de estados automáticos para espacios
- ENUM: `disponible`, `reservado`, `ocupado`, `deshabilitado`
- Triggers para actualización automática de estados
- Funciones: `marcar_entrada_parking()`, `marcar_salida_parking()`
- Vista: `vista_espacios_disponibles`
- **Requerido:** Crítica para el funcionamiento

### 6️⃣ `007-fix-timezone.sql` ⚠️ **EJECUTAR ANTES DE 006**
- Convierte todas las columnas `timestamp` a `timestamptz`
- Soluciona problema de zonas horarias (Perú UTC-5)
- Los valores existentes se interpretan como UTC
- **CRÍTICO:** Ejecutar ANTES de la migración 006
- **Backup recomendado** antes de ejecutar

### 7️⃣ `006-pagos-salida-hibrido.sql`
- Implementa flujo híbrido de salida y pago
- Nuevas columnas: `hora_salida_solicitada`, `hora_salida_confirmada`, `monto_calculado`
- Tabla `pago_comprobante` para auditoría
- Trigger `trg_pago_completado_sync` para sincronización automática
- Soporte para Yape/Plin/efectivo/simulado
- **Requerido:** Después de 007 (zonas horarias)

## 🚀 Cómo Ejecutar

### Opción 1: Supabase Dashboard (Recomendado)
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Copia y pega el contenido de cada archivo SQL en orden
4. Ejecuta cada script haciendo clic en **Run**

### Opción 2: Supabase CLI
```bash
# Ejecutar todas las migraciones en orden
supabase db push

# O ejecutar individualmente
psql -h db.xxx.supabase.co -U postgres -d postgres -f 001-soft-delete-vehiculo.sql
psql -h db.xxx.supabase.co -U postgres -d postgres -f 002-fix-vehiculo-rls-policies.sql
# ... y así sucesivamente
```

## ⚠️ Importante

- **NO** alterar el orden de ejecución
- **CRÍTICO:** Ejecutar `007-fix-timezone.sql` ANTES de `006-pagos-salida-hibrido.sql`
- **Verificar** que cada script se ejecute sin errores antes de continuar
- **Hacer backup** antes de ejecutar en producción (especialmente 007)
- Si un script falla, revisar el error y corregirlo antes de continuar

## 🕒 Nota Importante sobre Zonas Horarias

La migración `007-fix-timezone.sql` soluciona el problema de zonas horarias en Perú:
- Convierte todas las columnas `timestamp without time zone` a `timestamptz`
- Los timestamps se guardan internamente en UTC
- Se presentan automáticamente en la zona local del cliente
- El cálculo de diferencia de horas funciona correctamente entre días diferentes

**Ejemplo:**
```sql
-- Antes (problema):
hora_entrada: "2025-10-18 22:25:31" -- ambiguo, ¿UTC o Lima?

-- Después (correcto):
hora_entrada: "2025-10-18 22:25:31+00" -- claramente UTC
-- Al mostrar en Perú: "2025-10-18 17:25:31-05" (automático)
```

## 📝 Notas

- Todos los scripts son **idempotentes**: pueden ejecutarse múltiples veces sin causar errores (usan `CREATE OR REPLACE`, `DROP IF EXISTS`, etc.)
- Para más detalles técnicos de cada migración, consultar `/docs/` del proyecto

## 🔍 Verificación Post-Migración

Después de ejecutar todas las migraciones, verificar:

```sql
-- Verificar que los triggers existen
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Verificar que las funciones existen
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Verificar que el ENUM existe
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'estado_espacio_enum'::regtype;

-- Verificar espacios disponibles
SELECT * FROM vista_espacios_disponibles LIMIT 5;
```

Si todo está correcto, deberías ver los triggers, funciones, el ENUM con 4 valores y espacios disponibles.
