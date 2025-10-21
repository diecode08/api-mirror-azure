-- Migración 015: Vista de pagos pendientes con información de ocupación
-- Fecha: 2024
-- Descripción: Crea vista optimizada para listar pagos pendientes por parking

-- Eliminar vista si existe
DROP VIEW IF EXISTS vista_pagos_pendientes_parking;

-- Crear vista de pagos pendientes con toda la información necesaria
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
  v.modelo
FROM pago p
INNER JOIN ocupacion o ON p.id_ocupacion = o.id_ocupacion
INNER JOIN usuario u ON o.id_usuario = u.id_usuario
INNER JOIN espacio e ON o.id_espacio = e.id_espacio
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN vehiculo v ON r.id_vehiculo = v.id_vehiculo
WHERE p.estado IN ('PENDIENTE', 'pendiente', 'pendiente_validacion')
  AND o.hora_salida_solicitada IS NOT NULL
  AND o.hora_salida_confirmada IS NULL;

-- Comentario de la vista
COMMENT ON VIEW vista_pagos_pendientes_parking IS 'Vista de pagos pendientes con información completa de ocupación, usuario y vehículo para validación';
