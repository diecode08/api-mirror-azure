-- 006-pagos-salida-hibrido.sql
-- Migración: campos y tablas necesarias para flujo híbrido (usuario solicita salida, admin valida pago y confirma salida)
BEGIN;

-- 1) Añadir columnas a la tabla ocupacion para soportar solicitud/confirmación de salida y cálculo
ALTER TABLE IF EXISTS public.ocupacion
  ADD COLUMN IF NOT EXISTS hora_salida_solicitada timestamptz,
  ADD COLUMN IF NOT EXISTS hora_salida_confirmada timestamptz,
  ADD COLUMN IF NOT EXISTS tiempo_total_minutos integer,
  ADD COLUMN IF NOT EXISTS monto_calculado numeric,
  ADD COLUMN IF NOT EXISTS estado character varying DEFAULT 'en_uso';

-- 2) Extender la tabla pago para validación y comprobantes
ALTER TABLE IF EXISTS public.pago
  ADD COLUMN IF NOT EXISTS es_simulado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referencia_pago character varying,
  ADD COLUMN IF NOT EXISTS comprobante_url text,
  ADD COLUMN IF NOT EXISTS validado_por uuid,
  ADD COLUMN IF NOT EXISTS validado_en timestamptz;

-- FK para validado_por hacia usuario (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'pago' AND kcu.column_name = 'validado_por'
  ) THEN
    BEGIN
      ALTER TABLE public.pago
        ADD CONSTRAINT pago_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public.usuario(id_usuario);
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;
  END IF;
END$$;

-- 3) Índices de apoyo
CREATE INDEX IF NOT EXISTS idx_ocupacion_estado ON public.ocupacion(estado);
CREATE INDEX IF NOT EXISTS idx_pago_estado ON public.pago(estado);
CREATE INDEX IF NOT EXISTS idx_pago_referencia ON public.pago(referencia_pago);

-- 4) Tabla para almacenar logs de comprobantes (opcional, útil para auditoría)
CREATE TABLE IF NOT EXISTS public.pago_comprobante (
  id serial PRIMARY KEY,
  id_pago integer REFERENCES public.pago(id_pago) ON DELETE CASCADE,
  url text NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now()
);

-- 5) Trigger: cuando un pago pasa a estado 'COMPLETADO' actualizar ocupacion/reserva
CREATE OR REPLACE FUNCTION public.fn_pago_completado_sync() RETURNS trigger AS $$
DECLARE
  v_ocupacion_id integer;
  v_reserva_id integer;
BEGIN
  -- solo actuar si el estado cambió a COMPLETADO
  IF TG_OP = 'UPDATE' AND NEW.estado = 'COMPLETADO' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    v_ocupacion_id := NEW.id_ocupacion;
    IF v_ocupacion_id IS NOT NULL THEN
      -- actualizar hora_salida_confirmada si no está establecida
      UPDATE public.ocupacion
        SET hora_salida_confirmada = COALESCE(hora_salida_confirmada, now()),
            tiempo_total_minutos = FLOOR(EXTRACT(epoch FROM (COALESCE(hora_salida_confirmada, now()) - hora_entrada))/60),
            monto_calculado = NEW.monto,
            costo_total = NEW.monto,
            estado = 'finalizada'
      WHERE id_ocupacion = v_ocupacion_id;

      -- si la ocupacion está ligada a una reserva, marcarla completada
      SELECT id_reserva INTO v_reserva_id FROM public.ocupacion WHERE id_ocupacion = v_ocupacion_id LIMIT 1;
      IF v_reserva_id IS NOT NULL THEN
        UPDATE public.reserva
          SET estado = 'completada',
              hora_fin = COALESCE(hora_fin, now())
        WHERE id_reserva = v_reserva_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- crear el trigger en la tabla pago
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pago_completado_sync') THEN
    CREATE TRIGGER trg_pago_completado_sync
      AFTER UPDATE ON public.pago
      FOR EACH ROW
      WHEN (OLD IS DISTINCT FROM NEW)
      EXECUTE FUNCTION public.fn_pago_completado_sync();
  END IF;
END$$;

COMMIT;
