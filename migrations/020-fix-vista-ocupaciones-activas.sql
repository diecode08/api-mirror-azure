-- 020 Fix vista_ocupaciones_activas para incluir columnas esperadas por el backend
-- Fecha: 2025-11-09
-- Esta migración ajusta la vista creada en 019 para restaurar campos utilizados en getOcupacionesActivas
-- y añade la información de tarifa seleccionada.

-- El backend espera en la vista (según ocupacion.controller.js):
-- id_ocupacion, id_reserva, id_usuario, id_espacio, id_vehiculo, hora_entrada,
-- hora_salida_solicitada, tiempo_total_minutos, monto_calculado, costo_actual,
-- cliente (nombre_usuario), numero_espacio, vehiculo_placa, vehiculo_marca,
-- vehiculo_modelo, vehiculo_color
-- Además ahora necesitamos: id_tarifa, tarifa_tipo_seleccionada, tarifa_monto_seleccionada

-- Re-creamos la función calcular_costo_ocupacion sólo si no está ya actualizada.
-- (Opcional: omitido, asumimos que 019 ya la actualizó.)

DROP VIEW IF EXISTS vista_ocupaciones_activas;
CREATE OR REPLACE VIEW vista_ocupaciones_activas AS
SELECT 
  o.id_ocupacion,
  o.id_reserva,
  o.id_usuario,
  o.id_espacio,
  o.id_vehiculo,
  u.nombre || ' ' || u.apellido AS cliente,
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
JOIN usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN espacio e ON o.id_espacio = e.id_espacio
JOIN parking p ON e.id_parking = p.id_parking
LEFT JOIN reserva r ON o.id_reserva = r.id_reserva
LEFT JOIN tarifa tsel ON r.id_tarifa = tsel.id_tarifa
WHERE o.hora_salida IS NULL
ORDER BY o.hora_entrada DESC;

COMMENT ON VIEW vista_ocupaciones_activas IS 'Ocupaciones activas con datos completos, incluye tarifa seleccionada y costo actual.';
