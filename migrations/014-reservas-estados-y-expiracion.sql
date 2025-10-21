-- 014: Ajustes de estados de reserva y expiración automática
-- Fecha: 2025-10-20

-- 1) Permitir marcar entrada cuando la reserva está 'pendiente' o 'confirmada'
-- Si existe con otra firma/retorno, eliminar primero para evitar error 42P13
DROP FUNCTION IF EXISTS marcar_entrada_parking(INTEGER);

CREATE OR REPLACE FUNCTION marcar_entrada_parking(
  p_id_reserva INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_id_ocupacion INTEGER;
  v_id_usuario UUID;
  v_id_espacio INTEGER;
  v_id_vehiculo INTEGER;
BEGIN
  -- Obtener datos de la reserva (permitir estados pendiente o confirmada)
  SELECT id_usuario, id_espacio, id_vehiculo
  INTO v_id_usuario, v_id_espacio, v_id_vehiculo
  FROM reserva
  WHERE id_reserva = p_id_reserva
    AND estado IN ('pendiente','confirmada');

  IF v_id_espacio IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada o en estado no válido para marcar entrada';
  END IF;

  -- Crear ocupación
  INSERT INTO ocupacion (
    id_reserva,
    id_usuario,
    id_espacio,
    id_vehiculo,
    hora_entrada
  )
  VALUES (
    p_id_reserva,
    v_id_usuario,
    v_id_espacio,
    v_id_vehiculo,
    NOW()
  )
  RETURNING id_ocupacion INTO v_id_ocupacion;

  -- Actualizar estado de reserva a activa
  UPDATE reserva 
  SET estado = 'activa'
  WHERE id_reserva = p_id_reserva;

  -- Actualizar estado del espacio a ocupado
  UPDATE espacio
  SET estado = 'ocupado'
  WHERE id_espacio = v_id_espacio;

  RETURN v_id_ocupacion;
END;
$$ LANGUAGE plpgsql;

-- 2) Función para expirar reservas que no tuvieron entrada en plazo de gracia
CREATE OR REPLACE FUNCTION marcar_reservas_expiradas(
  p_gracia_minutos INTEGER DEFAULT 10
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE reserva r
  SET estado = 'expirada'
  WHERE r.estado = 'pendiente'
    AND NOW() > r.hora_inicio + (p_gracia_minutos || ' minutes')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM ocupacion o
      WHERE o.id_reserva = r.id_reserva
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
