# 🚀 Mejoras de Integridad de Datos - Sistema de Parking

## 📋 Resumen

Este script SQL soluciona los siguientes problemas:

1. ✅ **Parkings sin espacios** → Crea espacios automáticamente
2. ✅ **Parkings sin tarifas** → Crea 4 tarifas estándar (hora, día, mes, noche)
3. ✅ **Métodos de pago faltantes** → Agrega métodos comunes
4. ✅ **Validaciones futuras** → Triggers para advertir sobre datos incompletos
5. ✅ **Vista de verificación** → Para monitorear el estado de los parkings

---

## 🎯 ¿Qué hace este script?

### 1. Crear Espacios Automáticamente
Para cada parking activo sin espacios, crea espacios distribuidos en zonas:
- **Zona A, B, C, D** según la capacidad
- **Numeración correlativa**: A-01, A-02, B-01, B-02, etc.
- **Estado inicial**: `disponible`

**Ejemplo:**
```
Parking "Dirangre" (capacidad 11):
├─ A-01, A-02, A-03 (zona A)
├─ B-01, B-02, B-03 (zona B)
├─ C-01, C-02, C-03 (zona C)
└─ D-01, D-02 (zona D)
```

### 2. Crear Tarifas Inteligentes
Para cada parking sin tarifas, crea 4 tarifas con precios según capacidad:

| Capacidad | Precio/Hora Base |
|-----------|-----------------|
| ≥ 50 espacios | S/ 3.00 |
| 30-49 espacios | S/ 3.50 |
| 20-29 espacios | S/ 4.00 |
| < 20 espacios | S/ 4.50 |

**Tarifas creadas:**
- **Hora**: Precio base
- **Día**: Base × 20 × 0.75 (25% descuento)
- **Mes**: Base × 20 × 30 × 0.50 (50% descuento)
- **Noche**: Base × 0.70 (30% descuento, 8PM-6AM)

### 3. Métodos de Pago
Agrega los siguientes métodos si no existen:
- Efectivo
- Tarjeta de Crédito
- Tarjeta de Débito
- Yape
- Plin
- Transferencia Bancaria

### 4. Vista de Verificación
Crea `vista_parkings_completos` para monitorear:
```sql
SELECT * FROM vista_parkings_completos;
```

Columnas:
- `id_parking`, `nombre`, `direccion`
- `espacios_creados`: Cantidad de espacios
- `tarifas_creadas`: Cantidad de tarifas
- `estado_configuracion`: COMPLETO, SIN ESPACIOS, SIN TARIFAS, ELIMINADO

---

## 🔧 Cómo Ejecutar

### Paso 1: Abrir Supabase SQL Editor
1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Click en **"SQL Editor"** en el menú lateral
3. Click en **"New query"**

### Paso 2: Copiar y Pegar
1. Abre el archivo `mejoras-datos-parking.sql`
2. Copia **TODO** el contenido
3. Pégalo en el editor SQL de Supabase

### Paso 3: Ejecutar
1. Click en **"Run"** (o presiona `Ctrl + Enter`)
2. Espera a que termine (puede tomar 10-30 segundos)
3. Revisa los mensajes **NOTICE** que aparecen:
   ```
   NOTICE: Creando 11 espacios para parking: Dirangre
   NOTICE: Creando tarifas para parking: Dirangre (Base: S/ 4.00)
   NOTICE: Creando 20 espacios para parking: Montalva
   ...
   ```

### Paso 4: Verificar
Ejecuta esta consulta para ver el resultado:
```sql
SELECT * FROM vista_parkings_completos 
WHERE deleted_at IS NULL;
```

Deberías ver todos tus parkings activos con:
- `espacios_creados > 0`
- `tarifas_creadas >= 4`
- `estado_configuracion = 'COMPLETO'`

---

## 📊 Consultas Útiles

### Ver parkings incompletos
```sql
SELECT 
  id_parking,
  nombre,
  espacios_creados,
  tarifas_creadas,
  estado_configuracion
FROM vista_parkings_completos
WHERE deleted_at IS NULL 
  AND (espacios_creados = 0 OR tarifas_creadas = 0);
```

### Estadísticas generales
```sql
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as parkings_activos,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND espacios_creados > 0) as con_espacios,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND tarifas_creadas > 0) as con_tarifas,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND espacios_creados > 0 AND tarifas_creadas > 0) as completos
FROM vista_parkings_completos;
```

### Ver espacios de un parking específico
```sql
SELECT numero_espacio, estado
FROM espacio
WHERE id_parking = 29  -- Cambiar por tu ID
ORDER BY numero_espacio;
```

### Ver tarifas de un parking específico
```sql
SELECT tipo, monto, condiciones
FROM tarifa
WHERE id_parking = 29  -- Cambiar por tu ID
ORDER BY monto;
```

---

## 🆕 Crear Nuevos Parkings Completos

En el futuro, usa esta función para crear parkings con todo incluido:

```sql
SELECT crear_parking_completo(
  'Mi Nuevo Parking',           -- nombre
  'Av. Principal 123',          -- dirección
  -12.0464,                     -- latitud
  -77.0428,                     -- longitud
  25,                           -- capacidad
  'ccadcb3e-244a-4862-8e22-9d4b6a2d2c54',  -- tu UUID de admin
  3.50                          -- precio base/hora (opcional)
);
```

Esto creará automáticamente:
- ✅ El parking
- ✅ 25 espacios distribuidos en zonas
- ✅ 4 tarifas (hora, día, mes, noche)

---

## ⚠️ Notas Importantes

### Datos Existentes
- ✅ El script **NO** afecta parkings que ya tienen espacios/tarifas
- ✅ Solo crea lo que falta
- ✅ Es seguro ejecutarlo múltiples veces

### Triggers Creados
El script crea 2 triggers que **solo muestran advertencias** (no bloquean):
- `trigger_validar_tarifa`: Advierte si actualizas un parking sin tarifas
- `trigger_validar_espacios`: Advierte si actualizas un parking sin espacios

### Performance
- Para ~35 parkings: 5-10 segundos
- Para 100+ parkings: 30-60 segundos

---

## 🐛 Problemas Comunes

### Error: "función crear_espacios_parking no existe"
**Solución**: Ejecuta TODO el script de una vez, no por partes.

### Error: "permiso denegado"
**Solución**: Asegúrate de ejecutar en el SQL Editor de Supabase con tu usuario admin.

### No se crean espacios/tarifas
**Solución**: Verifica que los parkings estén activos (`deleted_at IS NULL`)

### Espacios duplicados
**Solución**: El script usa `ON CONFLICT DO NOTHING`, no crea duplicados.

---

## 📈 Beneficios

Después de ejecutar este script:

1. ✅ **App móvil funciona**: Los clientes pueden ver espacios disponibles
2. ✅ **Precios mostrados**: Los clientes ven tarifas reales
3. ✅ **Reservas completas**: Se pueden hacer reservas de principio a fin
4. ✅ **Datos consistentes**: No hay parkings incompletos
5. ✅ **Fácil mantenimiento**: Vista para monitorear estado

---

## 🔄 Actualizaciones Futuras

Si agregas más parkings en el futuro, tienes 2 opciones:

**Opción 1: Crear todo de una vez**
```sql
SELECT crear_parking_completo(...);
```

**Opción 2: Volver a ejecutar este script**
- Es seguro ejecutarlo nuevamente
- Solo creará lo que falta en parkings nuevos

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los mensajes de error en Supabase
2. Ejecuta las consultas de verificación
3. Comprueba que tus parkings tengan `deleted_at IS NULL`

---

**Fecha de creación**: 17 de octubre de 2025  
**Versión**: 1.0  
**Autor**: Sistema de Parking - Mejoras de Integridad
