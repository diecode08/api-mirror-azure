-- ============================================================================
-- MIGRACIÓN 022: Corregir inconsistencia inhabilitado vs deshabilitado
-- ============================================================================
-- Problema: El enum tiene 'deshabilitado' pero hay 28 espacios con 'inhabilitado'
-- Solución: Agregar 'inhabilitado' al enum y normalizar valores
-- ============================================================================

-- 1. Agregar 'inhabilitado' al enum si no existe
DO $$ 
BEGIN
  -- Intentar agregar el valor al enum
  ALTER TYPE estado_espacio_enum ADD VALUE IF NOT EXISTS 'inhabilitado';
  RAISE NOTICE 'Valor inhabilitado agregado al enum';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'El valor inhabilitado ya existe en el enum';
END $$;

-- 2. Normalizar todos los espacios 'inhabilitado' a 'deshabilitado' 
-- para mantener consistencia con la migración original
UPDATE espacio
SET estado = 'deshabilitado'::estado_espacio_enum
WHERE estado = 'inhabilitado';

-- 3. Verificar el resultado
DO $$
DECLARE
  v_count_deshabilitado INTEGER;
  v_count_inhabilitado INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_deshabilitado FROM espacio WHERE estado = 'deshabilitado';
  SELECT COUNT(*) INTO v_count_inhabilitado FROM espacio WHERE estado = 'inhabilitado';
  
  RAISE NOTICE 'Espacios con estado deshabilitado: %', v_count_deshabilitado;
  RAISE NOTICE 'Espacios con estado inhabilitado: %', v_count_inhabilitado;
  
  IF v_count_inhabilitado > 0 THEN
    RAISE WARNING 'Aún hay % espacios con estado inhabilitado', v_count_inhabilitado;
  ELSE
    RAISE NOTICE '✓ Normalización completada exitosamente';
  END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- - Se agrega 'inhabilitado' al enum para evitar errores futuros
-- - Se normalizan todos los valores a 'deshabilitado' (estándar de migración 005)
-- - El backend debe usar 'deshabilitado' en lugar de 'inhabilitado'
-- ============================================================================
