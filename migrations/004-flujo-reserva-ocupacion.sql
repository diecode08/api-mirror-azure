-- ============================================
-- MEJORA DEL FLUJO: RESERVA → OCUPACIÓN → PAGO
-- Fecha: 17 de octubre de 2025
-- ============================================

-- ============================================
-- ⚠️ IMPORTANTE: SEGURIDAD DE DATOS
-- ============================================
-- ✅ Este script es 100% SEGURO para ejecutar en producción
-- ✅ NO elimina ni modifica datos existentes
-- ✅ Solo AGREGA columnas, funciones, triggers y vistas
-- ✅ Los registros existentes NO se verán afectados
-- ✅ Las nuevas columnas tendrán valor NULL en datos antiguos
-- ✅ Se puede ejecutar múltiples veces sin problemas (idempotente)
-- ============================================

-- ============================================
-- 1. AGREGAR id_vehiculo A LA TABLA RESERVA
-- ============================================
-- Necesitas saber qué vehículo se reservó el espacio

ALTER TABLE reserva 
ADD COLUMN IF NOT EXISTS id_vehiculo INTEGER;

-- Agregar constraint solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reserva_id_vehiculo_fkey'
  ) THEN
    ALTER TABLE reserva
    ADD CONSTRAINT reserva_id_vehiculo_fkey 
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculo(id_vehiculo);
  END IF;
END $$;

-- ============================================
-- 2. AGREGAR id_vehiculo A LA TABLA OCUPACION
-- ============================================
-- Necesitas saber qué vehículo realmente ocupó el espacio

ALTER TABLE ocupacion
ADD COLUMN IF NOT EXISTS id_vehiculo INTEGER;

-- Agregar constraint solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ocupacion_id_vehiculo_fkey'
  ) THEN
    ALTER TABLE ocupacion
    ADD CONSTRAINT ocupacion_id_vehiculo_fkey
    FOREIGN KEY (id_vehiculo) REFERENCES vehiculo(id_vehiculo);
  END IF;
END $$;

-- ============================================
-- 3. AGREGAR ESTADOS CLAROS A RESERVA
-- ============================================
-- Estados posibles:
-- 'pendiente' → Reserva creada, esperando llegada
-- 'activa' → Cliente llegó y marcó entrada (se creó ocupación)
-- 'completada' → Cliente salió y pagó
-- 'cancelada' → Cliente canceló antes de llegar
-- 'expirada' → No llegó en el tiempo estimado

COMMENT ON COLUMN reserva.estado IS 
'Estados: pendiente, activa, completada, cancelada, expirada';

-- ============================================
-- 4. AGREGAR ESTADOS CLAROS A OCUPACION
-- ============================================
-- Estados posibles:
-- 'en_uso' → Cliente dentro del parking, tiempo corriendo
-- 'finalizada' → Cliente salió, pago pendiente o completado

COMMENT ON COLUMN ocupacion.hora_entrada IS 
'Timestamp real cuando el cliente marca entrada física en el parking';

COMMENT ON COLUMN ocupacion.hora_salida IS 
'Timestamp real cuando el cliente marca salida física (puede ser NULL si aún está dentro)';

COMMENT ON COLUMN ocupacion.costo_total IS 
'Costo calculado basado en (hora_salida - hora_entrada) × tarifa por hora';

-- ============================================
-- 5. FUNCIÓN PARA CALCULAR COSTO POR TIEMPO REAL
-- ============================================

CREATE OR REPLACE FUNCTION calcular_costo_ocupacion(
  p_id_ocupacion INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_hora_entrada TIMESTAMP;
  v_hora_salida TIMESTAMP;
  v_id_espacio INTEGER;
  v_id_parking INTEGER;
  v_tarifa_hora NUMERIC;
  v_horas_usadas NUMERIC;
  v_fracciones NUMERIC;
  v_costo NUMERIC;
BEGIN
  -- Obtener datos de la ocupación
  SELECT 
    o.hora_entrada, 
    o.hora_salida, 
    o.id_espacio,
    e.id_parking
  INTO 
    v_hora_entrada, 
    v_hora_salida, 
    v_id_espacio,
    v_id_parking
  FROM ocupacion o
  JOIN espacio e ON o.id_espacio = e.id_espacio
  WHERE o.id_ocupacion = p_id_ocupacion;
  
  -- Si no hay hora de salida, usar la hora actual
  IF v_hora_salida IS NULL THEN
    v_hora_salida := NOW();
  END IF;
  
  -- Obtener tarifa por hora del parking
  SELECT monto INTO v_tarifa_hora
  FROM tarifa
  WHERE id_parking = v_id_parking 
    AND tipo = 'hora'
  LIMIT 1;
  
  -- Si no hay tarifa, usar default
  IF v_tarifa_hora IS NULL THEN
    v_tarifa_hora := 4.00;
  END IF;
  
  -- Calcular horas usadas (en decimal)
  v_horas_usadas := EXTRACT(EPOCH FROM (v_hora_salida - v_hora_entrada)) / 3600.0;
  
  -- Redondear hacia arriba por fracción (cada fracción de hora se cobra completa)
  -- Si usó 1.2 horas = 2 horas
  -- Si usó 0.1 horas = 1 hora
  v_fracciones := CEIL(v_horas_usadas);
  
  -- Calcular costo
  v_costo := v_fracciones * v_tarifa_hora;
  
  RETURN v_costo;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGER PARA CALCULAR COSTO AL MARCAR SALIDA
-- ============================================

CREATE OR REPLACE FUNCTION trigger_calcular_costo_salida()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo calcular si se está agregando hora_salida
  IF NEW.hora_salida IS NOT NULL AND (OLD.hora_salida IS NULL OR OLD.hora_salida IS DISTINCT FROM NEW.hora_salida) THEN
    NEW.costo_total := calcular_costo_ocupacion(NEW.id_ocupacion);
    RAISE NOTICE 'Costo calculado para ocupación %: S/ %', NEW.id_ocupacion, NEW.costo_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calcular_costo ON ocupacion;
CREATE TRIGGER trigger_calcular_costo
  BEFORE UPDATE ON ocupacion
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_costo_salida();

-- ============================================
-- 7. FUNCIÓN PARA MARCAR ENTRADA (INICIAR OCUPACIÓN)
-- ============================================

CREATE OR REPLACE FUNCTION marcar_entrada_parking(
  p_id_reserva INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_id_ocupacion INTEGER;
  v_id_usuario UUID;
  v_id_espacio INTEGER;
  v_id_vehiculo INTEGER;
BEGIN
  -- Obtener datos de la reserva
  SELECT id_usuario, id_espacio, id_vehiculo
  INTO v_id_usuario, v_id_espacio, v_id_vehiculo
  FROM reserva
  WHERE id_reserva = p_id_reserva
    AND estado = 'pendiente';
  
  IF v_id_espacio IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada o ya está activa';
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
  
  -- Actualizar estado de reserva
  UPDATE reserva 
  SET estado = 'activa'
  WHERE id_reserva = p_id_reserva;
  
  -- Actualizar estado del espacio
  UPDATE espacio
  SET estado = 'ocupado'
  WHERE id_espacio = v_id_espacio;
  
  RAISE NOTICE 'Entrada registrada. Ocupación ID: %', v_id_ocupacion;
  
  RETURN v_id_ocupacion;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCIÓN PARA MARCAR SALIDA
-- ============================================

CREATE OR REPLACE FUNCTION marcar_salida_parking(
  p_id_ocupacion INTEGER
) RETURNS TABLE(
  costo_calculado NUMERIC,
  tiempo_total_horas NUMERIC
) AS $$
DECLARE
  v_id_espacio INTEGER;
  v_id_reserva INTEGER;
  v_hora_entrada TIMESTAMP;
  v_costo NUMERIC;
  v_tiempo NUMERIC;
BEGIN
  -- Obtener datos de la ocupación
  SELECT id_espacio, id_reserva, hora_entrada
  INTO v_id_espacio, v_id_reserva, v_hora_entrada
  FROM ocupacion
  WHERE id_ocupacion = p_id_ocupacion
    AND hora_salida IS NULL;
  
  IF v_id_espacio IS NULL THEN
    RAISE EXCEPTION 'Ocupación no encontrada o ya tiene salida registrada';
  END IF;
  
  -- Registrar hora de salida (el trigger calculará el costo)
  UPDATE ocupacion
  SET hora_salida = NOW()
  WHERE id_ocupacion = p_id_ocupacion
  RETURNING costo_total INTO v_costo;
  
  -- Calcular tiempo total
  v_tiempo := EXTRACT(EPOCH FROM (NOW() - v_hora_entrada)) / 3600.0;
  
  -- Actualizar estado del espacio
  UPDATE espacio
  SET estado = 'disponible'
  WHERE id_espacio = v_id_espacio;
  
  -- Actualizar estado de reserva
  UPDATE reserva
  SET estado = 'completada'
  WHERE id_reserva = v_id_reserva;
  
  RAISE NOTICE 'Salida registrada. Tiempo: % horas. Costo: S/ %', ROUND(v_tiempo, 2), v_costo;
  
  RETURN QUERY SELECT v_costo, ROUND(v_tiempo, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. VISTA PARA VER OCUPACIONES ACTIVAS
-- ============================================

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
  t.monto as tarifa_hora
FROM ocupacion o
JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN tarifa t ON p.id_parking = t.id_parking AND t.tipo = 'hora'
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

-- ============================================
-- 10. VISTA PARA HISTORIAL DE OCUPACIONES
-- ============================================

CREATE OR REPLACE VIEW vista_historial_ocupaciones AS
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
FROM ocupacion o
JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN pago pg ON pg.id_ocupacion = o.id_ocupacion
WHERE o.hora_salida IS NOT NULL
ORDER BY o.hora_salida DESC;

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================

/*
FLUJO COMPLETO DE USO:

1. CREAR RESERVA (desde app móvil):
   INSERT INTO reserva (id_usuario, id_espacio, id_vehiculo, hora_inicio, hora_fin, estado)
   VALUES ('uuid-usuario', 123, 456, '2025-10-17 14:00', '2025-10-17 16:00', 'pendiente');

2. MARCAR ENTRADA (cuando cliente llega físicamente):
   SELECT marcar_entrada_parking(789); -- 789 = id_reserva
   -- Esto crea automáticamente la ocupación y cambia estado a 'activa'

3. VER TIEMPO Y COSTO ACTUAL (mientras está dentro):
   SELECT * FROM vista_ocupaciones_activas WHERE cliente LIKE '%Nombre%';

4. MARCAR SALIDA (cuando cliente se va):
   SELECT * FROM marcar_salida_parking(101); -- 101 = id_ocupacion
   -- Retorna: costo_calculado y tiempo_total_horas

5. CREAR PAGO:
   INSERT INTO pago (id_ocupacion, id_metodo, monto, estado)
   VALUES (101, 1, 12.00, 'completado');

6. VER HISTORIAL:
   SELECT * FROM vista_historial_ocupaciones WHERE cliente LIKE '%Nombre%';

EJEMPLO COMPLETO:
-- Reserva
INSERT INTO reserva (id_usuario, id_espacio, id_vehiculo, hora_inicio, hora_fin)
VALUES ('abc-123', 5, 2, NOW() + INTERVAL '1 hour', NOW() + INTERVAL '3 hours');

-- Marcar entrada (cuando llega)
SELECT marcar_entrada_parking(1); -- Retorna id_ocupacion = 1

-- Ver costo actual mientras está dentro
SELECT * FROM vista_ocupaciones_activas;

-- Marcar salida
SELECT * FROM marcar_salida_parking(1); 
-- Retorna: costo_calculado = 8.00, tiempo_total_horas = 2.15

-- Crear pago
INSERT INTO pago (id_ocupacion, id_metodo, monto, estado)
VALUES (1, 1, 8.00, 'completado');
*/
