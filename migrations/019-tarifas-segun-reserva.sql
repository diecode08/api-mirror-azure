-- 019 - Tarifas según reserva y actualización de vistas
-- Fecha: 2025-11-09

-- 1) Actualizar función de cálculo para considerar la tarifa seleccionada en la reserva
CREATE OR REPLACE FUNCTION calcular_costo_ocupacion(
  p_id_ocupacion INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_hora_entrada TIMESTAMP;
  v_hora_salida TIMESTAMP;
  v_id_espacio INTEGER;
  v_id_parking INTEGER;
  v_id_reserva INTEGER;
  v_minutos INTEGER;
  v_tipo TEXT;
  v_monto NUMERIC;
  v_result NUMERIC := 0;
BEGIN
  -- Datos base de ocupación y parking
  SELECT 
    o.hora_entrada, 
    o.hora_salida, 
    o.id_espacio,
    o.id_reserva,
    e.id_parking
  INTO 
    v_hora_entrada, 
    v_hora_salida, 
    v_id_espacio,
    v_id_reserva,
    v_id_parking
  FROM ocupacion o
  JOIN espacio e ON o.id_espacio = e.id_espacio
  WHERE o.id_ocupacion = p_id_ocupacion;

  IF v_hora_entrada IS NULL THEN
    RETURN 0;
  END IF;

  IF v_hora_salida IS NULL THEN
    v_hora_salida := NOW();
  END IF;

  v_minutos := GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (v_hora_salida - v_hora_entrada)) / 60));

  -- 1.a) Si la reserva tiene tarifa seleccionada, usarla
  IF v_id_reserva IS NOT NULL THEN
    SELECT LOWER(t.tipo), t.monto
    INTO v_tipo, v_monto
    FROM reserva r
    JOIN tarifa t ON t.id_tarifa = r.id_tarifa
    WHERE r.id_reserva = v_id_reserva
      AND t.deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_tipo IS NOT NULL AND v_monto IS NOT NULL THEN
    -- Calcular según tipo seleccionado
    IF v_tipo = 'hora' THEN
      v_result := CEIL(v_minutos / 60.0) * v_monto;
      RETURN v_result;
    ELSIF v_tipo = 'medio dia' THEN
      IF v_minutos <= 720 THEN
        RETURN v_monto;
      ELSE
        v_result := v_monto + CEIL((v_minutos - 720) / 60.0) * (v_monto / 12.0);
        RETURN v_result;
      END IF;
    ELSIF v_tipo = 'dia' THEN
      IF v_minutos <= 1440 THEN
        RETURN v_monto;
      ELSE
        v_result := v_monto + CEIL((v_minutos - 1440) / 1440.0) * v_monto;
        RETURN v_result;
      END IF;
    ELSIF v_tipo = 'semana' THEN
      IF v_minutos <= 10080 THEN
        RETURN v_monto;
      ELSE
        v_result := v_monto + CEIL((v_minutos - 10080) / 10080.0) * v_monto;
        RETURN v_result;
      END IF;
    ELSIF v_tipo = 'mes' THEN
      IF v_minutos <= 43200 THEN
        RETURN v_monto;
      ELSE
        v_result := v_monto + CEIL((v_minutos - 43200) / 43200.0) * v_monto;
        RETURN v_result;
      END IF;
    ELSE
      -- Desconocido: cobrar por hora
      v_result := CEIL(v_minutos / 60.0) * v_monto;
      RETURN v_result;
    END IF;
  END IF;

  -- 1.b) Fallback: usar tarifa 'hora' del parking
  SELECT t.monto INTO v_monto
  FROM tarifa t
  WHERE t.id_parking = v_id_parking AND LOWER(t.tipo) = 'hora' AND t.deleted_at IS NULL
  LIMIT 1;

  IF v_monto IS NOT NULL THEN
    v_result := CEIL(v_minutos / 60.0) * v_monto;
    RETURN v_result;
  END IF;

  -- 1.c) Fallback final: S/ 5 por hora
  v_result := CEIL(v_minutos / 60.0) * 5.0;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 2) Actualizar vista de ocupaciones activas para incluir información de tarifa seleccionada
DROP VIEW IF EXISTS vista_ocupaciones_activas;
CREATE OR REPLACE VIEW vista_ocupaciones_activas AS
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
  r.id_tarifa,
  tsel.tipo as tarifa_tipo_seleccionada,
  tsel.monto as tarifa_monto_seleccionada
FROM ocupacion o
JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN tarifa tsel ON r.id_tarifa = tsel.id_tarifa
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

-- 3) Actualizar vista de pagos pendientes para incluir tarifa seleccionada
DROP VIEW IF EXISTS vista_pagos_pendientes_parking;
CREATE OR REPLACE VIEW vista_pagos_pendientes_parking AS
SELECT 
  p.id_pago,
  p.monto,
  p.estado,
  p.id_ocupacion,
  o.hora_salida_solicitada,
  o.tiempo_total_minutos,
  o.monto_calculado,
  o.id_usuario,
  u.nombre AS nombre_usuario,
  u.apellido AS apellido_usuario,
  CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo_usuario,
  e.numero_espacio,
  e.id_parking,
  v.placa,
  v.marca,
  v.modelo,
  r.id_tarifa,
  tsel.tipo AS tarifa_tipo_seleccionada,
  tsel.monto AS tarifa_monto_seleccionada
FROM pago p
INNER JOIN ocupacion o ON p.id_ocupacion = o.id_ocupacion
INNER JOIN usuario u ON o.id_usuario = u.id_usuario
INNER JOIN espacio e ON o.id_espacio = e.id_espacio
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN vehiculo v ON r.id_vehiculo = v.id_vehiculo
LEFT JOIN tarifa tsel ON r.id_tarifa = tsel.id_tarifa
WHERE p.estado IN ('PENDIENTE', 'pendiente', 'pendiente_validacion')
  AND o.hora_salida_solicitada IS NOT NULL
  AND o.hora_salida_confirmada IS NULL;
