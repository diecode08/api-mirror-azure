-- 008-enable-realtime.sql
-- Habilita Supabase Realtime para tablas clave del flujo (pago, ocupacion, reserva)
-- Acciones:
--   - Asegura que exista la publicación 'supabase_realtime'
--   - Añade las tablas a la publicación
--   - Configura REPLICA IDENTITY FULL para capturar OLD/NEW en UPDATE/DELETE
-- Notas:
--   - Esto NO expone datos por sí mismo. Realtime respeta tus políticas RLS.
--   - Para pruebas, puedes crear una política SELECT temporal para 'authenticated'.

BEGIN;

-- 1) Asegurar que exista la publicación usada por Supabase Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;
END$$;

-- 2) Asegurar REPLICA IDENTITY FULL en tablas (necesario para obtener OLD/NEW en eventos)
ALTER TABLE IF EXISTS public.pago SET (autovacuum_enabled = true);
ALTER TABLE IF EXISTS public.ocupacion SET (autovacuum_enabled = true);
ALTER TABLE IF EXISTS public.reserva SET (autovacuum_enabled = true);

ALTER TABLE IF EXISTS public.pago REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.ocupacion REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.reserva REPLICA IDENTITY FULL;

-- 3) Añadir tablas a la publicación de Realtime (sin IF NOT EXISTS, usando verificación previa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pago'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pago';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ocupacion'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ocupacion';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reserva'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reserva';
  END IF;
END$$;

COMMIT;

-- Verificación (opcionales, ejecutar en el editor SQL):
-- SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
-- SELECT relname, relreplident FROM pg_class WHERE relname IN ('pago','ocupacion','reserva'); -- debe mostrar 'f' (FULL)

-- Política de prueba (opcional, solo en desarrollo; quita o restringe luego):
-- ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "realtime_read_pagos_dev" ON public.pago
--   FOR SELECT TO authenticated USING (true);
-- Repite con ocupacion/reserva si necesitas escuchar esos cambios desde el cliente.
