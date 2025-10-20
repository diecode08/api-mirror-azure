-- 009-rls-realtime-policies.sql
-- Políticas RLS mínimas para que Realtime funcione en clientes autenticados
-- Permisos: SOLO SELECT (lectura). Dueño del recurso, admins/empleados del parking, o admin_general.

BEGIN;

-- 0) Habilitar RLS en tablas objetivo
ALTER TABLE IF EXISTS public.pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ocupacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reserva ENABLE ROW LEVEL SECURITY;

-- 1) Pago: lectura para dueño, admins/empleados del parking de la ocupación, o admin_general
DROP POLICY IF EXISTS rls_select_pago_realtime ON public.pago;
CREATE POLICY rls_select_pago_realtime
ON public.pago
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ocupacion o
    LEFT JOIN public.espacio e ON e.id_espacio = o.id_espacio
    LEFT JOIN public.usuario_parking up
      ON up.id_parking = e.id_parking AND up.id_usuario = auth.uid()
    LEFT JOIN public.usuario u ON u.id_usuario = auth.uid()
    WHERE o.id_ocupacion = public.pago.id_ocupacion
      AND (
        o.id_usuario = auth.uid()
        OR up.id_usuario IS NOT NULL
        OR (u.rol = 'admin_general')
      )
  )
);

-- 2) Ocupacion: lectura para dueño, admins/empleados del parking del espacio, o admin_general
DROP POLICY IF EXISTS rls_select_ocupacion_realtime ON public.ocupacion;
CREATE POLICY rls_select_ocupacion_realtime
ON public.ocupacion
FOR SELECT
TO authenticated
USING (
  ocupacion.id_usuario = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.espacio e
    JOIN public.usuario_parking up
      ON up.id_parking = e.id_parking AND up.id_usuario = auth.uid()
    LEFT JOIN public.usuario u ON u.id_usuario = auth.uid()
    WHERE e.id_espacio = ocupacion.id_espacio
      OR (u.rol = 'admin_general')
  )
);

-- 3) Reserva: lectura para dueño, admins/empleados del parking del espacio, o admin_general
DROP POLICY IF EXISTS rls_select_reserva_realtime ON public.reserva;
CREATE POLICY rls_select_reserva_realtime
ON public.reserva
FOR SELECT
TO authenticated
USING (
  reserva.id_usuario = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.espacio e
    JOIN public.usuario_parking up
      ON up.id_parking = e.id_parking AND up.id_usuario = auth.uid()
    LEFT JOIN public.usuario u ON u.id_usuario = auth.uid()
    WHERE e.id_espacio = reserva.id_espacio
      OR (u.rol = 'admin_general')
  )
);

COMMIT;

-- Verificación (opcionales):
-- SELECT * FROM pg_policies WHERE tablename IN ('pago','ocupacion','reserva') ORDER BY tablename, policyname;
-- Probar con un usuario 'cliente' y con uno 'admin_parking' asignado en usuario_parking.
