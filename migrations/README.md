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
- **Requerido:** Última migración (crítica para el funcionamiento)

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
- **Verificar** que cada script se ejecute sin errores antes de continuar
- **Hacer backup** antes de ejecutar en producción
- Si un script falla, revisar el error y corregirlo antes de continuar

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
