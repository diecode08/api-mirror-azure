-- Actualiza función de salida para flujo híbrido: solo solicita salida y calcula costo
-- Fecha: 2025-10-20

DO $$ BEGIN
  -- Si existe la función antigua, la reemplazamos
  PERFORM 1 FROM pg_proc WHERE proname = 'marcar_salida_parking';
END $$;

CREATE OR REPLACE FUNCTION marcar_salida_parking(
  p_id_ocupacion INTEGER
) RETURNS TABLE(
  costo_calculado NUMERIC,
  tiempo_total_horas NUMERIC
) AS $$
DECLARE
  v_id_espacio INTEGER;
  v_id_reserva INTEGER;
  v_id_parking INTEGER;
  v_hora_entrada TIMESTAMP WITH TIME ZONE;
  v_tarifa_hora NUMERIC;
  v_tiempo_horas NUMERIC;
  v_tiempo_minutos INTEGER;
  v_costo NUMERIC;
BEGIN
  -- Obtener datos de la ocupación y el parking
  SELECT o.id_espacio, o.id_reserva, o.hora_entrada, e.id_parking
  INTO v_id_espacio, v_id_reserva, v_hora_entrada, v_id_parking
  FROM ocupacion o
  JOIN espacio e ON o.id_espacio = e.id_espacio
  WHERE o.id_ocupacion = p_id_ocupacion
    AND o.hora_salida IS NULL; -- Debe estar aún activa

  IF v_id_espacio IS NULL THEN
    RAISE EXCEPTION 'Ocupación no encontrada o ya fue finalizada';
  END IF;

  -- Obtener tarifa por hora
  SELECT t.monto
  INTO v_tarifa_hora
  FROM tarifa t
  WHERE t.id_parking = v_id_parking AND t.tipo = 'hora'
  LIMIT 1;

  IF v_tarifa_hora IS NULL THEN
    v_tarifa_hora := 4.00; -- default
  END IF;

  -- Calcular tiempo y costo a este momento
  v_tiempo_horas := EXTRACT(EPOCH FROM (NOW() - v_hora_entrada)) / 3600.0;
  v_tiempo_minutos := FLOOR(EXTRACT(EPOCH FROM (NOW() - v_hora_entrada)) / 60.0);
  v_costo := CEIL(v_tiempo_horas) * v_tarifa_hora;

  -- Registrar solicitud de salida y guardar cálculo
  UPDATE ocupacion
  SET 
    hora_salida_solicitada = NOW(),
    tiempo_total_minutos = v_tiempo_minutos,
    monto_calculado = v_costo,
    estado = COALESCE(estado, 'en_uso')
  WHERE id_ocupacion = p_id_ocupacion;

  -- No liberar espacio ni completar reserva aquí. Eso sucede al validar pago.

  RETURN QUERY SELECT v_costo, ROUND(v_tiempo_horas, 2);
END;
$$ LANGUAGE plpgsql;
