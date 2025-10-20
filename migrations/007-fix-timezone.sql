-- 007-fix-timezone.sql
-- Migración: Corregir manejo de zonas horarias para Perú (UTC-5)
-- Convierte todas las columnas timestamp without time zone a timestamptz
-- Los valores existentes se interpretan como UTC (ya están guardados en UTC)

BEGIN;

-- Antes de alterar tipos, eliminar temporalmente vistas que dependen de columnas afectadas
-- para evitar: "cannot alter type of a column used by a view or rule"
DROP VIEW IF EXISTS public.vista_historial_ocupaciones;
DROP VIEW IF EXISTS public.vista_ocupaciones_activas;
DROP VIEW IF EXISTS public.vista_parkings_completos;

-- ============================================
-- 1. CONVERTIR COLUMNAS EN TABLA OCUPACION
-- ============================================
-- Interpretamos los valores existentes como UTC y los convertimos a timestamptz
ALTER TABLE ocupacion
  ALTER COLUMN hora_entrada TYPE timestamptz USING hora_entrada AT TIME ZONE 'UTC',
  ALTER COLUMN hora_salida TYPE timestamptz USING hora_salida AT TIME ZONE 'UTC';

-- ============================================
-- 2. CONVERTIR COLUMNAS EN TABLA RESERVA
-- ============================================
ALTER TABLE reserva
  ALTER COLUMN fecha_reserva TYPE timestamptz USING fecha_reserva AT TIME ZONE 'UTC',
  ALTER COLUMN hora_inicio TYPE timestamptz USING hora_inicio AT TIME ZONE 'UTC',
  ALTER COLUMN hora_fin TYPE timestamptz USING hora_fin AT TIME ZONE 'UTC';

-- ============================================
-- 3. CONVERTIR COLUMNAS EN TABLA PAGO
-- ============================================
ALTER TABLE pago
  ALTER COLUMN fecha_pago TYPE timestamptz USING fecha_pago AT TIME ZONE 'UTC';

-- ============================================
-- 4. CONVERTIR COLUMNAS EN TABLA NOTIFICACION
-- ============================================
ALTER TABLE notificacion
  ALTER COLUMN fecha_envio TYPE timestamptz USING fecha_envio AT TIME ZONE 'UTC';

-- ============================================
-- 5. CONVERTIR COLUMNAS EN TABLA USUARIO
-- ============================================
ALTER TABLE usuario
  ALTER COLUMN fecha_registro TYPE timestamptz USING fecha_registro AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

-- ============================================
-- 6. CONVERTIR COLUMNAS EN TABLA PARKING
-- ============================================
ALTER TABLE parking
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

-- ============================================
-- 7. CONVERTIR COLUMNAS EN TABLA VEHICULO
-- ============================================
ALTER TABLE vehiculo
  ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at AT TIME ZONE 'UTC';

-- ============================================
-- 8. CONVERTIR COLUMNAS EN TABLA USUARIO_PARKING
-- ============================================
ALTER TABLE usuario_parking
  ALTER COLUMN fecha_asignacion TYPE timestamptz USING fecha_asignacion AT TIME ZONE 'UTC';

-- ============================================
-- 9. COMENTARIOS PARA DOCUMENTAR CAMBIOS
-- ============================================
COMMENT ON COLUMN ocupacion.hora_entrada IS 
'Timestamp con zona horaria (timestamptz) - se guarda en UTC y se presenta según zona de sesión';

COMMENT ON COLUMN ocupacion.hora_salida IS 
'Timestamp con zona horaria (timestamptz) - se guarda en UTC y se presenta según zona de sesión';

COMMENT ON COLUMN reserva.hora_inicio IS 
'Timestamp con zona horaria (timestamptz) - para reservas futuras';

COMMENT ON COLUMN reserva.hora_fin IS 
'Timestamp con zona horaria (timestamptz) - hora estimada de fin de reserva';

-- ============================================
-- 10. RECREAR VISTAS DEPENDIENTES (con nuevos tipos)
-- ============================================

-- Vista de ocupaciones activas
CREATE OR REPLACE VIEW public.vista_ocupaciones_activas AS
SELECT 
  o.id_ocupacion,
  o.id_reserva,
  u.nombre || ' ' || u.apellido as cliente,
  v.placa as vehiculo_placa,
  p.nombre as parking,
  e.numero_espacio,
  o.hora_entrada,
  EXTRACT(EPOCH FROM (NOW() - o.hora_entrada)) / 3600.0 as horas_transcurridas,
  calcular_costo_ocupacion(o.id_ocupacion) as costo_actual,
  t.monto as tarifa_hora
FROM public.ocupacion o
JOIN public.usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN public.vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN public.espacio e ON o.id_espacio = e.id_espacio
JOIN public.parking p ON e.id_parking = p.id_parking
LEFT JOIN public.tarifa t ON p.id_parking = t.id_parking AND t.tipo = 'hora'
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

-- Vista de historial de ocupaciones
CREATE OR REPLACE VIEW public.vista_historial_ocupaciones AS
SELECT 
  o.id_ocupacion,
  o.id_reserva,
  u.nombre || ' ' || u.apellido as cliente,
  v.placa as vehiculo_placa,
  p.nombre as parking,
  e.numero_espacio,
  o.hora_entrada,
  o.hora_salida,
  EXTRACT(EPOCH FROM (o.hora_salida - o.hora_entrada)) / 3600.0 as horas_totales,
  o.costo_total,
  COALESCE(pg.estado, 'pendiente') as estado_pago
FROM public.ocupacion o
JOIN public.usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN public.vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN public.espacio e ON o.id_espacio = e.id_espacio
JOIN public.parking p ON e.id_parking = p.id_parking
LEFT JOIN public.pago pg ON pg.id_ocupacion = o.id_ocupacion
WHERE o.hora_salida IS NOT NULL
ORDER BY o.hora_salida DESC;

-- Vista de parkings completos (recreada tras cambios de tipo)
CREATE OR REPLACE VIEW public.vista_parkings_completos AS
SELECT 
  p.id_parking,
  p.nombre,
  p.direccion,
  p.capacidad_total,
  p.deleted_at,
  COUNT(DISTINCT e.id_espacio) as espacios_creados,
  COUNT(DISTINCT t.id_tarifa) as tarifas_creadas,
  CASE 
    WHEN COUNT(DISTINCT e.id_espacio) = 0 THEN 'SIN ESPACIOS'
    WHEN COUNT(DISTINCT t.id_tarifa) = 0 THEN 'SIN TARIFAS'
    WHEN p.deleted_at IS NOT NULL THEN 'ELIMINADO'
    ELSE 'COMPLETO'
  END as estado_configuracion
FROM public.parking p
LEFT JOIN public.espacio e ON p.id_parking = e.id_parking
LEFT JOIN public.tarifa t ON p.id_parking = t.id_parking
GROUP BY p.id_parking, p.nombre, p.direccion, p.capacidad_total, p.deleted_at
ORDER BY p.deleted_at NULLS FIRST, p.nombre;

-- ============================================
-- 11. VERIFICACIÓN DESPUÉS DE MIGRACIÓN
-- ============================================
-- Ejecuta estas queries después de aplicar la migración para verificar:
-- SELECT now() AS ahora_utc, now() AT TIME ZONE 'America/Lima' AS ahora_lima;
-- SELECT id_ocupacion, hora_entrada, hora_entrada AT TIME ZONE 'America/Lima' AS hora_entrada_lima FROM ocupacion LIMIT 3;

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES PARA EL EQUIPO
-- ============================================
/*
✅ DESPUÉS DE ESTA MIGRACIÓN:
1. Todas las columnas de fecha/hora son ahora timestamptz (almacenan zona)
2. Los valores se guardan internamente en UTC (estándar)
3. Al consultar desde frontend, Supabase JS automáticamente convierte a hora local del navegador
4. Al insertar con NOW() o CURRENT_TIMESTAMP, se guarda correctamente con zona
5. Las diferencias (hora_salida - hora_entrada) funcionan correctamente sin importar el día

⚠️ CAMBIOS NECESARIOS EN CÓDIGO (OPCIONALES PERO RECOMENDADOS):
- Frontend: No es necesario cambiar nada si usas new Date() o librerías como date-fns/luxon
- Backend API: NOW() seguirá funcionando correctamente
- Si envías timestamps desde cliente: usa formato ISO con Z (ej: "2025-10-20T17:25:31.000Z")

🔍 VERIFICAR FUNCIONALIDAD:
1. Crear una reserva y marcar entrada
2. Esperar unos minutos
3. Marcar salida y verificar que el costo se calcule correctamente
4. Verificar que las horas mostradas en frontend sean correctas (hora de Perú)

📚 RECURSOS:
- Postgres timestamptz: https://www.postgresql.org/docs/current/datatype-datetime.html
- Supabase date handling: https://supabase.com/docs/guides/api/working-with-dates
*/
