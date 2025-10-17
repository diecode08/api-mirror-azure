-- ============================================
-- MEJORAS DE INTEGRIDAD DE DATOS - PARKING SYSTEM
-- Fecha: 17 de octubre de 2025
-- ============================================

-- ============================================
-- 1. CREAR ESPACIOS PARA PARKINGS ACTIVOS SIN ESPACIOS
-- ============================================

-- Función para crear espacios automáticamente
CREATE OR REPLACE FUNCTION crear_espacios_parking(
  p_id_parking INTEGER,
  p_capacidad INTEGER
) RETURNS VOID AS $$
DECLARE
  i INTEGER;
  zona CHAR(1);
  numero INTEGER;
BEGIN
  -- Crear espacios distribuidos en zonas A, B, C, D
  FOR i IN 1..p_capacidad LOOP
    -- Determinar la zona según el número
    IF i <= p_capacidad / 4 THEN
      zona := 'A';
      numero := i;
    ELSIF i <= p_capacidad / 2 THEN
      zona := 'B';
      numero := i - (p_capacidad / 4);
    ELSIF i <= (3 * p_capacidad) / 4 THEN
      zona := 'C';
      numero := i - (p_capacidad / 2);
    ELSE
      zona := 'D';
      numero := i - ((3 * p_capacidad) / 4);
    END IF;
    
    -- Insertar espacio si no existe
    INSERT INTO espacio (id_parking, numero_espacio, estado)
    VALUES (
      p_id_parking, 
      zona || '-' || LPAD(numero::TEXT, 2, '0'),
      'disponible'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Crear espacios para todos los parkings activos que no tienen espacios
DO $$
DECLARE
  parking_record RECORD;
  espacios_existentes INTEGER;
BEGIN
  FOR parking_record IN 
    SELECT id_parking, nombre, capacidad_total 
    FROM parking 
    WHERE deleted_at IS NULL
  LOOP
    -- Contar espacios existentes
    SELECT COUNT(*) INTO espacios_existentes
    FROM espacio
    WHERE id_parking = parking_record.id_parking;
    
    -- Si no tiene espacios, crearlos
    IF espacios_existentes = 0 THEN
      RAISE NOTICE 'Creando % espacios para parking: %', parking_record.capacidad_total, parking_record.nombre;
      PERFORM crear_espacios_parking(parking_record.id_parking, parking_record.capacidad_total);
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 2. CREAR TARIFAS PARA PARKINGS ACTIVOS SIN TARIFAS
-- ============================================

-- Crear tarifas estándar para parkings sin tarifas
DO $$
DECLARE
  parking_record RECORD;
  tarifas_existentes INTEGER;
  precio_base NUMERIC;
BEGIN
  FOR parking_record IN 
    SELECT id_parking, nombre, capacidad_total 
    FROM parking 
    WHERE deleted_at IS NULL
  LOOP
    -- Contar tarifas existentes
    SELECT COUNT(*) INTO tarifas_existentes
    FROM tarifa
    WHERE id_parking = parking_record.id_parking;
    
    -- Si no tiene tarifas, crearlas
    IF tarifas_existentes = 0 THEN
      -- Calcular precio base según capacidad (parkings más grandes = más baratos por hora)
      IF parking_record.capacidad_total >= 50 THEN
        precio_base := 3.00;
      ELSIF parking_record.capacidad_total >= 30 THEN
        precio_base := 3.50;
      ELSIF parking_record.capacidad_total >= 20 THEN
        precio_base := 4.00;
      ELSE
        precio_base := 4.50;
      END IF;
      
      RAISE NOTICE 'Creando tarifas para parking: % (Base: S/ %)', parking_record.nombre, precio_base;
      
      -- Tarifa por hora
      INSERT INTO tarifa (id_parking, tipo, monto, condiciones)
      VALUES (
        parking_record.id_parking,
        'hora',
        precio_base,
        'Tarifa estándar por hora'
      );
      
      -- Tarifa por día (20 horas equivalentes con descuento)
      INSERT INTO tarifa (id_parking, tipo, monto, condiciones)
      VALUES (
        parking_record.id_parking,
        'dia',
        precio_base * 20 * 0.75, -- 25% descuento
        '24 horas completas - 25% descuento'
      );
      
      -- Tarifa mensual (30 días con descuento)
      INSERT INTO tarifa (id_parking, tipo, monto, condiciones)
      VALUES (
        parking_record.id_parking,
        'mes',
        precio_base * 20 * 30 * 0.50, -- 50% descuento
        'Pago anticipado mensual - 50% descuento'
      );
      
      -- Tarifa nocturna (más barata)
      INSERT INTO tarifa (id_parking, tipo, monto, condiciones)
      VALUES (
        parking_record.id_parking,
        'noche',
        precio_base * 0.70, -- 30% descuento
        'De 8:00 PM a 6:00 AM - 30% descuento'
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 3. AGREGAR RESTRICCIONES (CONSTRAINTS) PARA FUTURO
-- ============================================

-- Nota: Estas restricciones se aplicarán solo a NUEVOS registros
-- No afectarán los datos existentes

-- Trigger para validar que un parking tenga al menos una tarifa antes de activarse
CREATE OR REPLACE FUNCTION validar_parking_tiene_tarifa()
RETURNS TRIGGER AS $$
DECLARE
  tarifa_count INTEGER;
BEGIN
  -- Solo validar si el parking está activo (no eliminado)
  IF NEW.deleted_at IS NULL THEN
    SELECT COUNT(*) INTO tarifa_count
    FROM tarifa
    WHERE id_parking = NEW.id_parking;
    
    IF tarifa_count = 0 THEN
      RAISE WARNING 'El parking "%" no tiene tarifas configuradas. Se recomienda agregar tarifas.', NEW.nombre;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (solo advertencia, no bloquea)
DROP TRIGGER IF EXISTS trigger_validar_tarifa ON parking;
CREATE TRIGGER trigger_validar_tarifa
  BEFORE UPDATE ON parking
  FOR EACH ROW
  EXECUTE FUNCTION validar_parking_tiene_tarifa();

-- Trigger para validar que un parking tenga espacios
CREATE OR REPLACE FUNCTION validar_parking_tiene_espacios()
RETURNS TRIGGER AS $$
DECLARE
  espacio_count INTEGER;
BEGIN
  IF NEW.deleted_at IS NULL THEN
    SELECT COUNT(*) INTO espacio_count
    FROM espacio
    WHERE id_parking = NEW.id_parking;
    
    IF espacio_count = 0 THEN
      RAISE WARNING 'El parking "%" no tiene espacios configurados. Se recomienda agregar espacios.', NEW.nombre;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_validar_espacios ON parking;
CREATE TRIGGER trigger_validar_espacios
  BEFORE UPDATE ON parking
  FOR EACH ROW
  EXECUTE FUNCTION validar_parking_tiene_espacios();

-- ============================================
-- 4. CREAR MÉTODOS DE PAGO POR DEFECTO
-- ============================================

-- Insertar métodos de pago si no existen
INSERT INTO metodopago (nombre) 
VALUES 
  ('Efectivo'),
  ('Tarjeta de Crédito'),
  ('Tarjeta de Débito'),
  ('Yape'),
  ('Plin'),
  ('Transferencia Bancaria')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. VISTA PARA VERIFICAR PARKINGS COMPLETOS
-- ============================================

CREATE OR REPLACE VIEW vista_parkings_completos AS
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
FROM parking p
LEFT JOIN espacio e ON p.id_parking = e.id_parking
LEFT JOIN tarifa t ON p.id_parking = t.id_parking
GROUP BY p.id_parking, p.nombre, p.direccion, p.capacidad_total, p.deleted_at
ORDER BY p.deleted_at NULLS FIRST, p.nombre;

-- ============================================
-- 6. CONSULTA DE VERIFICACIÓN
-- ============================================

-- Ver el estado de todos los parkings
SELECT * FROM vista_parkings_completos;

-- Ver parkings activos incompletos
SELECT 
  id_parking,
  nombre,
  espacios_creados,
  tarifas_creadas,
  estado_configuracion
FROM vista_parkings_completos
WHERE deleted_at IS NULL 
  AND (espacios_creados = 0 OR tarifas_creadas = 0);

-- Estadísticas generales
SELECT 
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as parkings_activos,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as parkings_eliminados,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND espacios_creados > 0) as con_espacios,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND tarifas_creadas > 0) as con_tarifas,
  COUNT(*) FILTER (WHERE deleted_at IS NULL AND espacios_creados > 0 AND tarifas_creadas > 0) as completos
FROM vista_parkings_completos;

-- ============================================
-- 7. FUNCIÓN HELPER PARA CREAR PARKING COMPLETO
-- ============================================

CREATE OR REPLACE FUNCTION crear_parking_completo(
  p_nombre VARCHAR,
  p_direccion TEXT,
  p_latitud NUMERIC,
  p_longitud NUMERIC,
  p_capacidad INTEGER,
  p_id_admin UUID,
  p_precio_base NUMERIC DEFAULT 4.00
) RETURNS INTEGER AS $$
DECLARE
  nuevo_id_parking INTEGER;
BEGIN
  -- Crear parking
  INSERT INTO parking (nombre, direccion, latitud, longitud, capacidad_total, id_admin)
  VALUES (p_nombre, p_direccion, p_latitud, p_longitud, p_capacidad, p_id_admin)
  RETURNING id_parking INTO nuevo_id_parking;
  
  -- Crear espacios
  PERFORM crear_espacios_parking(nuevo_id_parking, p_capacidad);
  
  -- Crear tarifas
  INSERT INTO tarifa (id_parking, tipo, monto, condiciones) VALUES
    (nuevo_id_parking, 'hora', p_precio_base, 'Tarifa estándar por hora'),
    (nuevo_id_parking, 'dia', p_precio_base * 20 * 0.75, '24 horas completas - 25% descuento'),
    (nuevo_id_parking, 'mes', p_precio_base * 20 * 30 * 0.50, 'Pago anticipado mensual - 50% descuento'),
    (nuevo_id_parking, 'noche', p_precio_base * 0.70, 'De 8:00 PM a 6:00 AM - 30% descuento');
  
  RAISE NOTICE 'Parking "%" creado con ID: % (% espacios y 4 tarifas)', p_nombre, nuevo_id_parking, p_capacidad;
  
  RETURN nuevo_id_parking;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================

/*
PARA EJECUTAR ESTE SCRIPT:

1. Abre tu editor SQL de Supabase
2. Copia y pega TODO este archivo
3. Ejecuta el script completo
4. Revisa los mensajes de NOTICE para ver qué se creó

RESULTADOS ESPERADOS:
- Todos los parkings activos tendrán espacios creados automáticamente
- Todos los parkings activos tendrán 4 tarifas (hora, día, mes, noche)
- Se crearán métodos de pago por defecto
- Tendrás una vista para verificar el estado de configuración

PARA CREAR UN NUEVO PARKING COMPLETO EN EL FUTURO:
SELECT crear_parking_completo(
  'Nombre del Parking',
  'Dirección completa',
  -12.0464,  -- latitud
  -77.0428,  -- longitud
  30,        -- capacidad
  'uuid-del-admin',
  3.50       -- precio base por hora (opcional, default 4.00)
);

PARA VERIFICAR PARKINGS:
SELECT * FROM vista_parkings_completos WHERE deleted_at IS NULL;
*/
