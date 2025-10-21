-- Script diagnóstico y limpieza del estado actual
-- Ejecutar DESPUÉS de aplicar la migración 018

-- 1) Ver estado del trigger actual
SELECT 
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'trg_pago_completado_sync';

-- 2) Ver pagos completados sin ocupación cerrada
SELECT 
  p.id_pago,
  p.estado AS pago_estado,
  p.id_ocupacion,
  o.hora_salida,
  o.hora_salida_confirmada,
  o.estado AS ocupacion_estado,
  e.id_espacio,
  e.estado AS espacio_estado,
  r.id_reserva,
  r.estado AS reserva_estado
FROM pago p
LEFT JOIN ocupacion o ON o.id_ocupacion = p.id_ocupacion
LEFT JOIN espacio e ON e.id_espacio = o.id_espacio
LEFT JOIN reserva r ON r.id_reserva = o.id_reserva
WHERE p.estado = 'COMPLETADO'
  AND (o.hora_salida IS NULL OR e.estado != 'disponible' OR r.estado != 'completada');

-- 3) Corregir manualmente los casos que quedaron mal (ejecutar solo si hay resultados en #2)
-- IMPORTANTE: Ajusta los IDs según lo que veas en el punto 2

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT 
      p.id_pago,
      p.id_ocupacion,
      o.id_espacio,
      o.id_reserva,
      o.hora_entrada,
      p.monto
    FROM pago p
    JOIN ocupacion o ON o.id_ocupacion = p.id_ocupacion
    WHERE p.estado = 'COMPLETADO'
      AND (o.hora_salida IS NULL OR o.estado != 'finalizada')
  LOOP
    -- Cerrar ocupación
    UPDATE ocupacion
    SET hora_salida = COALESCE(hora_salida, NOW()),
        hora_salida_confirmada = COALESCE(hora_salida_confirmada, NOW()),
        tiempo_total_minutos = FLOOR(EXTRACT(EPOCH FROM (COALESCE(hora_salida_confirmada, NOW()) - hora_entrada)) / 60),
        monto_calculado = rec.monto,
        costo_total = rec.monto,
        estado = 'finalizada'
    WHERE id_ocupacion = rec.id_ocupacion;

    -- Liberar espacio
    IF rec.id_espacio IS NOT NULL THEN
      UPDATE espacio
      SET estado = 'disponible'
      WHERE id_espacio = rec.id_espacio;
    END IF;

    -- Completar reserva
    IF rec.id_reserva IS NOT NULL THEN
      UPDATE reserva
      SET estado = 'completada',
          hora_fin = COALESCE(hora_fin, NOW())
      WHERE id_reserva = rec.id_reserva;
    END IF;

    RAISE NOTICE 'Corregido: pago %, ocupacion %, espacio %, reserva %', 
      rec.id_pago, rec.id_ocupacion, rec.id_espacio, rec.id_reserva;
  END LOOP;
END $$;

-- 4) Verificación final
SELECT 
  (SELECT COUNT(*) FROM pago WHERE estado = 'COMPLETADO') AS pagos_completados,
  (SELECT COUNT(*) FROM ocupacion WHERE hora_salida IS NOT NULL AND estado = 'finalizada') AS ocupaciones_cerradas,
  (SELECT COUNT(*) FROM espacio WHERE estado = 'disponible') AS espacios_disponibles,
  (SELECT COUNT(*) FROM reserva WHERE estado = 'completada') AS reservas_completadas;
