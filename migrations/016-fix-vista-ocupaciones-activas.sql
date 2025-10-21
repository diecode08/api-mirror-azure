-- Migración 016: Corregir vista_ocupaciones_activas con todos los campos necesarios
-- Fecha: 2024
-- Descripción: Agregar campos faltantes a la vista para que la app móvil pueda mostrar todos los detalles

-- Primero eliminar la vista existente
DROP VIEW IF EXISTS public.vista_ocupaciones_activas CASCADE;

-- Recrear vista con todos los campos necesarios
CREATE VIEW public.vista_ocupaciones_activas AS
SELECT 
  o.id_ocupacion,
  o.id_reserva,
  o.id_usuario,
  o.id_espacio,
  o.id_vehiculo,
  u.nombre || ' ' || u.apellido as cliente,
  v.placa as vehiculo_placa,
  v.marca as vehiculo_marca,
  v.modelo as vehiculo_modelo,
  p.nombre as parking,
  p.id_parking,
  e.numero_espacio,
  o.hora_entrada,
  o.hora_salida_solicitada,
  o.hora_salida_confirmada,
  o.monto_calculado,
  o.tiempo_total_minutos,
  EXTRACT(EPOCH FROM (NOW() - o.hora_entrada)) / 3600.0 as horas_transcurridas,
  calcular_costo_ocupacion(o.id_ocupacion) as costo_actual,
  COALESCE(t.monto, 5.0) as tarifa_hora
FROM public.ocupacion o
JOIN public.usuario u ON o.id_usuario = u.id_usuario
LEFT JOIN public.vehiculo v ON o.id_vehiculo = v.id_vehiculo
JOIN public.espacio e ON o.id_espacio = e.id_espacio
JOIN public.parking p ON e.id_parking = p.id_parking
LEFT JOIN public.tarifa t ON p.id_parking = t.id_parking AND t.tipo = 'hora'
WHERE o.hora_salida_confirmada IS NULL
ORDER BY o.hora_entrada DESC;

-- Comentario
COMMENT ON VIEW public.vista_ocupaciones_activas IS 'Vista de ocupaciones activas con todos los campos necesarios para app móvil (incluye id_usuario, vehículo completo, parking, etc)';
