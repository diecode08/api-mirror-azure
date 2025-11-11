-- 021 Soporte para reservas manuales de invitados (sin usuario registrado)
-- Fecha: 2025-11-10
-- Agrega campos guest_* y tipo_origen para permitir al admin crear reservas para visitantes

-- 1. Extender tabla reserva con datos de invitado
ALTER TABLE reserva
  ADD COLUMN guest_nombre TEXT,
  ADD COLUMN guest_documento TEXT,
  ADD COLUMN guest_telefono TEXT,
  ADD COLUMN tipo_origen TEXT NOT NULL DEFAULT 'movil',
  ADD CONSTRAINT reserva_tipo_origen_check CHECK (tipo_origen IN ('movil','manual'));

COMMENT ON COLUMN reserva.guest_nombre IS 'Nombre del visitante sin cuenta (solo reservas manuales)';
COMMENT ON COLUMN reserva.guest_documento IS 'DNI/CE del visitante (solo reservas manuales)';
COMMENT ON COLUMN reserva.guest_telefono IS 'Teléfono del visitante (solo reservas manuales)';
COMMENT ON COLUMN reserva.tipo_origen IS 'Origen de la reserva: movil (app) o manual (admin web)';

-- Índice para búsquedas por documento de invitado
CREATE INDEX idx_reserva_guest_documento ON reserva(guest_documento) WHERE guest_documento IS NOT NULL;

-- 2. Extender tabla ocupacion con tipo_origen para métricas
ALTER TABLE ocupacion
  ADD COLUMN tipo_origen TEXT NOT NULL DEFAULT 'movil';

COMMENT ON COLUMN ocupacion.tipo_origen IS 'Origen de la ocupación: movil (app) o manual (admin web)';

-- 3. Actualizar vista_ocupaciones_activas para incluir datos de invitado
DROP VIEW IF EXISTS vista_ocupaciones_activas;
CREATE OR REPLACE VIEW vista_ocupaciones_activas AS
SELECT 
  o.id_ocupacion,
  o.id_reserva,
  o.id_usuario,
  o.id_espacio,
  o.id_vehiculo,
  o.tipo_origen AS ocupacion_tipo_origen,
  -- Cliente: priorizar usuario registrado, si no, invitado
  COALESCE(u.nombre || ' ' || u.apellido, r.guest_nombre, 'Visitante') AS cliente,
  r.guest_nombre,
  r.guest_documento,
  r.guest_telefono,
  r.tipo_origen AS reserva_tipo_origen,
  v.placa AS vehiculo_placa,
  v.marca AS vehiculo_marca,
  v.modelo AS vehiculo_modelo,
  v.color AS vehiculo_color,
  p.nombre AS parking,
  e.numero_espacio,
  e.id_parking,
  o.hora_entrada,
  o.hora_salida_solicitada,
  EXTRACT(EPOCH FROM (NOW() - o.hora_entrada)) / 60.0 AS tiempo_total_minutos,
  calcular_costo_ocupacion(o.id_ocupacion) AS monto_calculado,
  calcular_costo_ocupacion(o.id_ocupacion) AS costo_actual,
  r.id_tarifa,
  tsel.tipo AS tarifa_tipo_seleccionada,
  tsel.monto AS tarifa_monto_seleccionada
FROM ocupacion o
LEFT JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN tarifa tsel ON r.id_tarifa = tsel.id_tarifa
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

COMMENT ON VIEW vista_ocupaciones_activas IS 'Ocupaciones activas con datos completos, incluye tarifa seleccionada, tipo_origen y datos de invitado.';

-- 4. Actualizar vista_pagos_pendientes_parking para incluir datos de invitado
DROP VIEW IF EXISTS vista_pagos_pendientes_parking;
CREATE OR REPLACE VIEW vista_pagos_pendientes_parking AS
SELECT 
  o.id_ocupacion,
  o.id_usuario,
  o.id_espacio,
  o.id_vehiculo,
  o.tipo_origen AS ocupacion_tipo_origen,
  COALESCE(u.nombre, r.guest_nombre, 'Visitante') AS nombre_usuario,
  COALESCE(u.apellido, '') AS apellido_usuario,
  COALESCE(u.nombre || ' ' || u.apellido, r.guest_nombre, 'Visitante') AS nombre_completo_usuario,
  r.guest_nombre,
  r.guest_documento,
  r.guest_telefono,
  r.tipo_origen AS reserva_tipo_origen,
  v.placa AS vehiculo_placa,
  v.marca AS vehiculo_marca,
  v.modelo AS vehiculo_modelo,
  v.color AS vehiculo_color,
  p.nombre AS parking_nombre,
  p.id_parking,
  e.numero_espacio,
  o.hora_entrada,
  o.hora_salida_solicitada,
  EXTRACT(EPOCH FROM (o.hora_salida_solicitada - o.hora_entrada)) / 60.0 AS tiempo_total_minutos,
  calcular_costo_ocupacion(o.id_ocupacion) AS monto_calculado,
  r.id_tarifa,
  tsel.tipo AS tarifa_tipo_seleccionada,
  tsel.monto AS tarifa_monto_seleccionada
FROM ocupacion o
LEFT JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN tarifa tsel ON r.id_tarifa = tsel.id_tarifa
WHERE o.hora_salida_solicitada IS NOT NULL
  AND o.hora_salida IS NULL
ORDER BY o.hora_salida_solicitada DESC;

COMMENT ON VIEW vista_pagos_pendientes_parking IS 'Ocupaciones con salida solicitada pendientes de pago, incluye datos de invitado y tarifa.';

-- 5. Actualizar valores existentes (opcional, para consistencia)
UPDATE reserva SET tipo_origen = 'movil' WHERE tipo_origen IS NULL;
UPDATE ocupacion SET tipo_origen = 'movil' WHERE tipo_origen IS NULL;
