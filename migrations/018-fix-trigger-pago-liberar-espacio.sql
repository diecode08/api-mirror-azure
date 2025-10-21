-- 018-fix-trigger-pago-liberar-espacio.sql
-- Corrige el trigger para que al completar pago también libere el espacio
-- y cierre correctamente la ocupación con hora_salida

BEGIN;

-- 1) Recrear función del trigger completa
CREATE OR REPLACE FUNCTION public.fn_pago_completado_sync() RETURNS trigger AS $$
DECLARE
  v_ocupacion_id integer;
  v_reserva_id integer;
  v_parking_id integer;
  v_espacio_id integer;
  v_serie varchar;
  v_numero integer;
BEGIN
  -- Solo actuar si el estado cambió a COMPLETADO
  IF TG_OP = 'UPDATE' AND NEW.estado = 'COMPLETADO' AND (OLD.estado IS DISTINCT FROM NEW.estado) THEN
    v_ocupacion_id := NEW.id_ocupacion;
    IF v_ocupacion_id IS NOT NULL THEN
      -- Obtener parking y espacio de la ocupación
      SELECT o.id_espacio, e.id_parking INTO v_espacio_id, v_parking_id
      FROM public.ocupacion o
      JOIN public.espacio e ON e.id_espacio = o.id_espacio
      WHERE o.id_ocupacion = v_ocupacion_id
      LIMIT 1;

      -- Asignar comprobante si no existe
      IF NEW.numero IS NULL OR NEW.serie IS NULL THEN
        v_serie := 'P-' || COALESCE(v_parking_id, 0)::text || '-' || to_char(now(), 'YYYY');
        SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero FROM public.pago WHERE serie = v_serie;

        UPDATE public.pago
          SET tipo_comprobante = COALESCE(tipo_comprobante, 'boleta'),
              serie = v_serie,
              numero = v_numero,
              emitido_en = COALESCE(emitido_en, now()),
              validado_en = COALESCE(NEW.validado_en, now())
        WHERE id_pago = NEW.id_pago;
      ELSE
        UPDATE public.pago
          SET emitido_en = COALESCE(emitido_en, now()),
              validado_en = COALESCE(NEW.validado_en, now())
        WHERE id_pago = NEW.id_pago;
      END IF;

      -- Cerrar ocupación: setear hora_salida si aún no está, confirmar salida, totales
      UPDATE public.ocupacion
        SET hora_salida = COALESCE(hora_salida, now()),
            hora_salida_confirmada = COALESCE(hora_salida_confirmada, now()),
            tiempo_total_minutos = FLOOR(EXTRACT(epoch FROM (COALESCE(hora_salida_confirmada, now()) - hora_entrada))/60),
            monto_calculado = NEW.monto,
            costo_total = NEW.monto,
            estado = 'finalizada'
      WHERE id_ocupacion = v_ocupacion_id;

      -- Liberar espacio: cambiar a 'disponible'
      IF v_espacio_id IS NOT NULL THEN
        UPDATE public.espacio
          SET estado = 'disponible'
        WHERE id_espacio = v_espacio_id;
      END IF;

      -- Completar reserva asociada (si aplica)
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

-- 2) Asegurar que el trigger existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pago_completado_sync') THEN
    CREATE TRIGGER trg_pago_completado_sync
      AFTER INSERT OR UPDATE ON public.pago
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_pago_completado_sync();
  END IF;
END $$;

COMMIT;

-- Verificación post-migración:
-- SELECT * FROM pg_trigger WHERE tgname = 'trg_pago_completado_sync';
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'fn_pago_completado_sync';
