# Instrucciones para implementar Soft Delete en Vehículos

## 🎯 Objetivo
Implementar borrado lógico (soft delete) para la tabla `vehiculo` para mantener la integridad referencial con otras tablas del sistema.

## 📋 Pasos a seguir

### 1. Ejecutar el script SQL en Supabase

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**
4. Copia y pega el siguiente script:

```sql
-- Agregar campos de borrado lógico a la tabla vehiculo
ALTER TABLE public.vehiculo 
ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid,
ADD COLUMN IF NOT EXISTS motivo_baja text;

-- Agregar foreign key para deleted_by
ALTER TABLE public.vehiculo 
ADD CONSTRAINT vehiculo_deleted_by_fkey 
FOREIGN KEY (deleted_by) REFERENCES public.usuario(id_usuario);

-- Comentarios para documentación
COMMENT ON COLUMN public.vehiculo.deleted_at IS 'Fecha y hora de borrado lógico';
COMMENT ON COLUMN public.vehiculo.deleted_by IS 'ID del usuario que eliminó el vehículo';
COMMENT ON COLUMN public.vehiculo.motivo_baja IS 'Motivo de la baja del vehículo';
```

5. Haz clic en **Run** para ejecutar el script

### 2. Verificar que el script se ejecutó correctamente

Ejecuta esta consulta para verificar las nuevas columnas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehiculo' 
AND column_name IN ('deleted_at', 'deleted_by', 'motivo_baja');
```

Deberías ver 3 filas como resultado.

### 3. Reiniciar el API

En tu terminal, ejecuta:

```powershell
cd api-nodejs-parking
npm start
```

### 4. Probar en la app móvil

En Metro Bundler, presiona **`r`** para recargar la app.

## ✅ Funcionalidades implementadas

### Backend (API)
- ✅ Soft delete en modelo `Vehiculo`
- ✅ Filtrado de vehículos eliminados en todas las consultas
- ✅ Método `restore()` para recuperar vehículos eliminados
- ✅ Controlador actualizado para usar soft delete
- ✅ Se registra quién eliminó el vehículo y cuándo

### Frontend (App Móvil)
- ✅ Botón de editar vehículo (✏️)
- ✅ Botón de eliminar vehículo (🗑️)
- ✅ Modal de confirmación antes de eliminar
- ✅ Recarga automática de la lista después de editar/eliminar
- ✅ Formulario modal para agregar/editar vehículos
- ✅ Validación de campos requeridos (marca y placa)

## 🔍 Cómo funciona el Soft Delete

**Antes (Hard Delete):**
```javascript
DELETE FROM vehiculo WHERE id_vehiculo = 123;
```
❌ El registro se elimina permanentemente de la base de datos
❌ Si hay relaciones en otras tablas, se pierde la integridad

**Ahora (Soft Delete):**
```javascript
UPDATE vehiculo 
SET deleted_at = NOW(), 
    deleted_by = 'user_id', 
    motivo_baja = 'opcional'
WHERE id_vehiculo = 123;
```
✅ El registro permanece en la base de datos
✅ Se marca con una fecha de eliminación
✅ Se mantiene la integridad referencial
✅ Se puede restaurar si es necesario

## 📊 Consultas útiles

### Ver todos los vehículos (incluidos eliminados)
```sql
SELECT * FROM vehiculo;
```

### Ver solo vehículos eliminados
```sql
SELECT * FROM vehiculo WHERE deleted_at IS NOT NULL;
```

### Ver solo vehículos activos
```sql
SELECT * FROM vehiculo WHERE deleted_at IS NULL;
```

### Restaurar un vehículo eliminado
```sql
UPDATE vehiculo 
SET deleted_at = NULL, 
    deleted_by = NULL, 
    motivo_baja = NULL
WHERE id_vehiculo = 123;
```

## 🚀 Próximos pasos

Si deseas implementar una funcionalidad de "papelera" o "recuperar vehículos", puedes:

1. Crear un endpoint GET `/vehiculos/eliminados` que liste vehículos con `deleted_at IS NOT NULL`
2. Crear un endpoint POST `/vehiculos/:id/restaurar` que llame al método `Vehiculo.restore(id)`
3. En el frontend, crear una sección para ver y restaurar vehículos eliminados

## 📝 Notas importantes

- Los vehículos eliminados **NO aparecen** en las listas normales
- Solo administradores generales pueden ver vehículos eliminados (si implementas esa funcionalidad)
- El ID del usuario que eliminó el vehículo queda registrado en `deleted_by`
- La fecha exacta de eliminación queda en `deleted_at`
- Opcionalmente se puede registrar un motivo en `motivo_baja`
