-- ============================================================================
-- ACTUALIZACIÓN: Estados de Espacios y Validaciones de Reserva
-- ============================================================================
-- Propósito: 
--   1. Definir correctamente los estados de espacios (disponible, ocupado, reservado, deshabilitado)
--   2. Actualizar automáticamente el estado cuando se reserva o se marca entrada/salida
--   3. Validar que no se puedan reservar espacios no disponibles
-- ============================================================================

-- 1. Actualizar el tipo de dato del estado para usar un ENUM (más seguro)
DO $$ 
BEGIN
  -- Verificar si el tipo ya existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_espacio_enum') THEN
    CREATE TYPE estado_espacio_enum AS ENUM ('disponible', 'reservado', 'ocupado', 'deshabilitado');
  END IF;
END $$;

-- 2. Modificar la columna estado de la tabla espacio para usar el ENUM
-- (Solo si no está ya usando el tipo)
DO $$ 
BEGIN
  ALTER TABLE espacio 
    ALTER COLUMN estado TYPE estado_espacio_enum 
    USING estado::estado_espacio_enum;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'La columna estado ya usa el tipo estado_espacio_enum';
END $$;

-- 3. Asegurar que el valor por defecto sea 'disponible'
ALTER TABLE espacio 
  ALTER COLUMN estado SET DEFAULT 'disponible'::estado_espacio_enum;

-- ============================================================================
-- FUNCIÓN: Validar disponibilidad de espacio antes de reservar
-- ============================================================================
CREATE OR REPLACE FUNCTION validar_espacio_disponible(p_id_espacio INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_estado estado_espacio_enum;
BEGIN
  SELECT estado INTO v_estado
  FROM espacio
  WHERE id_espacio = p_id_espacio;
  
  -- Retornar true solo si está disponible
  RETURN v_estado = 'disponible';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Actualizar estado de espacio a 'reservado' al crear reserva
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_estado_espacio_reserva()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar si la reserva está activa
  IF NEW.estado = 'activa' THEN
    UPDATE espacio
    SET estado = 'reservado'
    WHERE id_espacio = NEW.id_espacio;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS trg_reserva_actualizar_espacio ON reserva;
CREATE TRIGGER trg_reserva_actualizar_espacio
  AFTER INSERT OR UPDATE ON reserva
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_espacio_reserva();

-- ============================================================================
-- TRIGGER: Actualizar estado de espacio a 'ocupado' al marcar entrada
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_estado_espacio_ocupacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Al marcar entrada (INSERT), cambiar a ocupado
  IF TG_OP = 'INSERT' THEN
    UPDATE espacio
    SET estado = 'ocupado'
    WHERE id_espacio = NEW.id_espacio;
    
    -- También actualizar el estado de la reserva a 'completada'
    IF NEW.id_reserva IS NOT NULL THEN
      UPDATE reserva
      SET estado = 'completada'
      WHERE id_reserva = NEW.id_reserva;
    END IF;
  END IF;
  
  -- Al marcar salida (UPDATE con hora_salida), volver a disponible
  IF TG_OP = 'UPDATE' AND NEW.hora_salida IS NOT NULL AND OLD.hora_salida IS NULL THEN
    UPDATE espacio
    SET estado = 'disponible'
    WHERE id_espacio = NEW.id_espacio;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS trg_ocupacion_actualizar_espacio ON ocupacion;
CREATE TRIGGER trg_ocupacion_actualizar_espacio
  AFTER INSERT OR UPDATE ON ocupacion
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_espacio_ocupacion();

-- ============================================================================
-- TRIGGER: Liberar espacio si se cancela una reserva
-- ============================================================================
CREATE OR REPLACE FUNCTION liberar_espacio_reserva_cancelada()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se cancela la reserva, volver el espacio a disponible
  IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
    UPDATE espacio
    SET estado = 'disponible'
    WHERE id_espacio = NEW.id_espacio;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS trg_reserva_cancelada_liberar_espacio ON reserva;
CREATE TRIGGER trg_reserva_cancelada_liberar_espacio
  AFTER UPDATE ON reserva
  FOR EACH ROW
  EXECUTE FUNCTION liberar_espacio_reserva_cancelada();

-- ============================================================================
-- ACTUALIZAR FUNCIÓN: marcar_entrada_parking (validar estado)
-- ============================================================================
-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS marcar_entrada_parking(INTEGER);

CREATE OR REPLACE FUNCTION marcar_entrada_parking(
  p_id_reserva INTEGER
) RETURNS TABLE (
  id_ocupacion INTEGER,
  hora_entrada TIMESTAMP,
  mensaje TEXT
) AS $$
DECLARE
  v_id_usuario UUID;
  v_id_espacio INTEGER;
  v_id_vehiculo INTEGER;
  v_estado_reserva VARCHAR;
  v_estado_espacio estado_espacio_enum;
  v_nueva_ocupacion INTEGER;
BEGIN
  -- Obtener datos de la reserva
  SELECT r.id_usuario, r.id_espacio, r.id_vehiculo, r.estado, e.estado
  INTO v_id_usuario, v_id_espacio, v_id_vehiculo, v_estado_reserva, v_estado_espacio
  FROM reserva r
  INNER JOIN espacio e ON r.id_espacio = e.id_espacio
  WHERE r.id_reserva = p_id_reserva;
  
  -- Validaciones
  IF v_id_usuario IS NULL THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  
  IF v_estado_reserva != 'activa' THEN
    RAISE EXCEPTION 'La reserva no está activa (estado: %)', v_estado_reserva;
  END IF;
  
  IF v_estado_espacio != 'reservado' THEN
    RAISE EXCEPTION 'El espacio no está reservado (estado: %)', v_estado_espacio;
  END IF;
  
  -- Crear ocupación
  INSERT INTO ocupacion (id_reserva, id_usuario, id_espacio, id_vehiculo, hora_entrada)
  VALUES (p_id_reserva, v_id_usuario, v_id_espacio, v_id_vehiculo, NOW())
  RETURNING ocupacion.id_ocupacion INTO v_nueva_ocupacion;
  
  -- Retornar resultado
  RETURN QUERY
  SELECT v_nueva_ocupacion, NOW(), 'Entrada registrada exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VISTA: Espacios con su estado actual
-- ============================================================================
CREATE OR REPLACE VIEW vista_espacios_disponibles AS
SELECT 
  e.id_espacio,
  e.id_parking,
  e.numero_espacio,
  e.estado,
  p.nombre as nombre_parking,
  CASE 
    WHEN e.estado = 'disponible' THEN 'Disponible para reservar'
    WHEN e.estado = 'reservado' THEN 'Reservado'
    WHEN e.estado = 'ocupado' THEN 'Actualmente ocupado'
    WHEN e.estado = 'deshabilitado' THEN 'No disponible (mantenimiento)'
  END as descripcion_estado
FROM espacio e
INNER JOIN parking p ON e.id_parking = p.id_parking
ORDER BY p.nombre, e.numero_espacio;

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TYPE estado_espacio_enum IS 'Estados posibles de un espacio: disponible, reservado, ocupado, deshabilitado';
COMMENT ON FUNCTION validar_espacio_disponible IS 'Valida si un espacio está disponible para reservar';
COMMENT ON FUNCTION actualizar_estado_espacio_reserva IS 'Cambia el estado del espacio a reservado cuando se crea una reserva activa';
COMMENT ON FUNCTION actualizar_estado_espacio_ocupacion IS 'Cambia el estado del espacio a ocupado/disponible según entrada/salida';
COMMENT ON FUNCTION liberar_espacio_reserva_cancelada IS 'Libera el espacio cuando se cancela una reserva';
COMMENT ON VIEW vista_espacios_disponibles IS 'Vista de todos los espacios con su estado actual y descripción legible';

-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================
-- Ejecutar este script en Supabase SQL Editor
-- Los triggers actualizarán automáticamente los estados de los espacios
-- ============================================================================
