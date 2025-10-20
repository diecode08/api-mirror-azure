-- 011-comprobantes-virtuales.sql
-- Comprobante virtual (boleta simple) generado al completar el pago
-- Agrega columnas en pago y actualiza el trigger fn_pago_completado_sync para asignar serie/numero

BEGIN;

-- 1) Columnas para comprobante
ALTER TABLE IF EXISTS public.pago
  ADD COLUMN IF NOT EXISTS tipo_comprobante varchar DEFAULT 'boleta',
  ADD COLUMN IF NOT EXISTS serie varchar,
  ADD COLUMN IF NOT EXISTS numero integer,
  ADD COLUMN IF NOT EXISTS emitido_en timestamptz;

-- Índice opcional para consultas por serie/numero
CREATE INDEX IF NOT EXISTS idx_pago_serie_numero ON public.pago(serie, numero);

-- 2) Actualizar función del trigger para asignar comprobante al completar
CREATE OR REPLACE FUNCTION public.fn_pago_completado_sync() RETURNS trigger AS $$
DECLARE
  v_ocupacion_id integer;
  v_reserva_id integer;
  v_parking_id integer;
  v_serie varchar;
  v_numero integer;
BEGIN
  -- solo actuar si el estado cambió a COMPLETADO
  IF TG_OP = 'UPDATE' AND NEW.estado = 'COMPLETADO' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    v_ocupacion_id := NEW.id_ocupacion;
    IF v_ocupacion_id IS NOT NULL THEN
      -- Determinar parking de la ocupación
      SELECT e.id_parking INTO v_parking_id
      FROM public.ocupacion o
      JOIN public.espacio e ON e.id_espacio = o.id_espacio
      WHERE o.id_ocupacion = v_ocupacion_id
      LIMIT 1;

      -- Asignar comprobante si no existe
      IF NEW.numero IS NULL OR NEW.serie IS NULL THEN
        v_serie := 'P-' || COALESCE(v_parking_id, 0)::text || '-' || to_char(now(), 'YYYY');
        -- próximo correlativo sencillo por serie (idempotente a nivel bajo; suficiente para proyecto)
        SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero FROM public.pago WHERE serie = v_serie;

        UPDATE public.pago
          SET tipo_comprobante = COALESCE(tipo_comprobante, 'boleta'),
              serie = v_serie,
              numero = v_numero,
              emitido_en = COALESCE(emitido_en, now()),
              validado_en = COALESCE(NEW.validado_en, now())
        WHERE id_pago = NEW.id_pago;
      ELSE
        -- Asegurar fecha de emisión
        UPDATE public.pago
          SET emitido_en = COALESCE(emitido_en, now()),
              validado_en = COALESCE(NEW.validado_en, now())
        WHERE id_pago = NEW.id_pago;
      END IF;

      -- actualizar ocupación (confirmar salida, totales)
      UPDATE public.ocupacion
        SET hora_salida_confirmada = COALESCE(hora_salida_confirmada, now()),
            tiempo_total_minutos = FLOOR(EXTRACT(epoch FROM (COALESCE(hora_salida_confirmada, now()) - hora_entrada))/60),
            monto_calculado = NEW.monto,
            costo_total = NEW.monto,
            estado = 'finalizada'
      WHERE id_ocupacion = v_ocupacion_id;

      -- actualizar reserva asociada (si aplica)
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

COMMIT;

-- Verificación sugerida:
-- 1) Completar un pago y revisar que serie/numero/emitido_en se llenen.
-- 2) SELECT serie, numero, emitido_en FROM pago WHERE id_pago = <id>;