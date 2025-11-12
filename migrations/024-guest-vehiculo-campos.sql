-- 024-guest-vehiculo-campos.sql
-- Agrega campos de vehículo invitado a reserva y ocupacion
-- Para permitir registro de datos del vehículo sin crear usuario/vehiculo en tablas principales

BEGIN;

-- 1. Agregar campos de vehículo invitado a RESERVA
ALTER TABLE public.reserva
  ADD COLUMN IF NOT EXISTS guest_vehiculo_placa TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_marca TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_modelo TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_color TEXT;

COMMENT ON COLUMN reserva.guest_vehiculo_placa IS 'Placa del vehículo del visitante (solo reservas manuales)';
COMMENT ON COLUMN reserva.guest_vehiculo_marca IS 'Marca del vehículo del visitante (solo reservas manuales)';
COMMENT ON COLUMN reserva.guest_vehiculo_modelo IS 'Modelo del vehículo del visitante (solo reservas manuales)';
COMMENT ON COLUMN reserva.guest_vehiculo_color IS 'Color del vehículo del visitante (solo reservas manuales)';

-- Índice para búsquedas por placa
CREATE INDEX IF NOT EXISTS idx_reserva_guest_placa ON reserva(guest_vehiculo_placa) WHERE guest_vehiculo_placa IS NOT NULL;

-- 2. Agregar campos de vehículo invitado a OCUPACION
ALTER TABLE public.ocupacion
  ADD COLUMN IF NOT EXISTS guest_vehiculo_placa TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_marca TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_modelo TEXT,
  ADD COLUMN IF NOT EXISTS guest_vehiculo_color TEXT;

COMMENT ON COLUMN ocupacion.guest_vehiculo_placa IS 'Placa del vehículo del visitante (solo ocupaciones manuales)';
COMMENT ON COLUMN ocupacion.guest_vehiculo_marca IS 'Marca del vehículo del visitante (solo ocupaciones manuales)';
COMMENT ON COLUMN ocupacion.guest_vehiculo_modelo IS 'Modelo del vehículo del visitante (solo ocupaciones manuales)';
COMMENT ON COLUMN ocupacion.guest_vehiculo_color IS 'Color del vehículo del visitante (solo ocupaciones manuales)';

-- Índice para búsquedas por placa
CREATE INDEX IF NOT EXISTS idx_ocupacion_guest_placa ON ocupacion(guest_vehiculo_placa) WHERE guest_vehiculo_placa IS NOT NULL;

-- 3. Actualizar vista_ocupaciones_activas para incluir datos de vehículo invitado
DROP VIEW IF EXISTS vista_ocupaciones_activas;
CREATE OR REPLACE VIEW vista_ocupaciones_activas AS
SELECT
  o.id_ocupacion,
  o.id_reserva,
  o.id_usuario,
  o.id_espacio,
  o.id_vehiculo,
  o.hora_entrada,
  o.hora_salida,
  o.costo_total,
  o.tipo_origen,
  e.numero_espacio,
  e.id_parking,
  p.nombre AS parking,
  -- Cliente: prioriza usuario registrado, luego guest_nombre de reserva
  COALESCE(u.nombre || ' ' || u.apellido, r.guest_nombre, 'Visitante') AS cliente,
  r.guest_nombre,
  r.guest_documento,
  r.guest_telefono,
  -- Vehículo: prioriza vehículo registrado, luego guest_vehiculo_* de ocupacion, luego de reserva
  COALESCE(v.placa, o.guest_vehiculo_placa, r.guest_vehiculo_placa) AS vehiculo_placa,
  COALESCE(v.marca, o.guest_vehiculo_marca, r.guest_vehiculo_marca) AS vehiculo_marca,
  COALESCE(v.modelo, o.guest_vehiculo_modelo, r.guest_vehiculo_modelo) AS vehiculo_modelo,
  COALESCE(v.color, o.guest_vehiculo_color, r.guest_vehiculo_color) AS vehiculo_color,
  r.id_tarifa,
  t.tipo AS tarifa_tipo,
  t.monto AS tarifa_hora,
  -- Calcular horas transcurridas y costo actual
  EXTRACT(EPOCH FROM (NOW() - o.hora_entrada)) / 3600 AS horas_transcurridas,
  ROUND(CAST((EXTRACT(EPOCH FROM (NOW() - o.hora_entrada)) / 3600) * COALESCE(t.monto, 5.0) AS numeric), 2) AS costo_actual
FROM public.ocupacion o
LEFT JOIN public.espacio e ON o.id_espacio = e.id_espacio
LEFT JOIN public.parking p ON e.id_parking = p.id_parking
LEFT JOIN public.reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN public.usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN public.vehiculo v ON o.id_vehiculo = v.id_vehiculo
LEFT JOIN public.tarifa t ON r.id_tarifa = t.id_tarifa
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

COMMENT ON VIEW vista_ocupaciones_activas IS 'Ocupaciones activas con datos completos de usuario/invitado y vehículo registrado/invitado';

-- 4. Actualizar vista_pagos_pendientes_parking
DROP VIEW IF EXISTS vista_pagos_pendientes_parking;
CREATE OR REPLACE VIEW vista_pagos_pendientes_parking AS
SELECT
  o.id_ocupacion,
  o.hora_entrada,
  o.hora_salida_solicitada,
  o.id_espacio,
  e.numero_espacio,
  p.id_parking,
  p.nombre AS parking_nombre,
  COALESCE(u.nombre, r.guest_nombre, 'Visitante') AS nombre_usuario,
  u.email AS email_usuario,
  COALESCE(u.nombre || ' ' || u.apellido, r.guest_nombre, 'Visitante') AS nombre_completo_usuario,
  r.guest_nombre,
  r.guest_documento,
  r.guest_telefono,
  COALESCE(v.placa, o.guest_vehiculo_placa, r.guest_vehiculo_placa) AS vehiculo_placa,
  COALESCE(v.marca, o.guest_vehiculo_marca, r.guest_vehiculo_marca) AS vehiculo_marca,
  COALESCE(v.modelo, o.guest_vehiculo_modelo, r.guest_vehiculo_modelo) AS vehiculo_modelo,
  COALESCE(v.color, o.guest_vehiculo_color, r.guest_vehiculo_color) AS vehiculo_color,
  r.id_tarifa,
  t.tipo AS tarifa_tipo,
  t.monto AS tarifa_monto,
  pago.id_pago,
  pago.monto AS monto_calculado,
  pago.estado AS estado_pago,
  pago.fecha_pago
FROM public.ocupacion o
INNER JOIN public.espacio e ON o.id_espacio = e.id_espacio
INNER JOIN public.parking p ON e.id_parking = p.id_parking
LEFT JOIN public.reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN public.usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN public.vehiculo v ON o.id_vehiculo = v.id_vehiculo
LEFT JOIN public.tarifa t ON r.id_tarifa = t.id_tarifa
LEFT JOIN public.pago ON pago.id_ocupacion = o.id_ocupacion
WHERE o.hora_salida_solicitada IS NOT NULL
  AND o.hora_salida IS NULL
ORDER BY o.hora_salida_solicitada DESC;

COMMENT ON VIEW vista_pagos_pendientes_parking IS 'Ocupaciones con salida solicitada pendientes de pago, incluye datos de invitado y vehículo invitado.';

COMMIT;

-- Verificación:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name IN ('reserva','ocupacion') AND column_name LIKE 'guest_vehiculo%';
