-- 012-rls-insert-update-policies.sql
-- Políticas RLS para INSERT/UPDATE en reserva, ocupacion y pago
-- Permite que el flujo normal funcione (crear reservas, ocupaciones, pagos)

BEGIN;

-- 1) RESERVA: INSERT - cliente puede crear sus propias reservas
DROP POLICY IF EXISTS rls_insert_reserva ON public.reserva;
CREATE POLICY rls_insert_reserva
ON public.reserva
FOR INSERT
TO authenticated
WITH CHECK (id_usuario = auth.uid());

-- 2) RESERVA: UPDATE - cliente puede actualizar sus reservas, admin_parking/empleado las del parking
DROP POLICY IF EXISTS rls_update_reserva ON public.reserva;
CREATE POLICY rls_update_reserva
ON public.reserva
FOR UPDATE
TO authenticated
USING (
  id_usuario = auth.uid()
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

-- 3) OCUPACION: INSERT - cualquier autenticado puede crear (backend valida)
DROP POLICY IF EXISTS rls_insert_ocupacion ON public.ocupacion;
CREATE POLICY rls_insert_ocupacion
ON public.ocupacion
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4) OCUPACION: UPDATE - dueño o admin del parking
DROP POLICY IF EXISTS rls_update_ocupacion ON public.ocupacion;
CREATE POLICY rls_update_ocupacion
ON public.ocupacion
FOR UPDATE
TO authenticated
USING (
  id_usuario = auth.uid()
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

-- 5) PAGO: INSERT - cualquier autenticado (backend crea al solicitar salida)
DROP POLICY IF EXISTS rls_insert_pago ON public.pago;
CREATE POLICY rls_insert_pago
ON public.pago
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6) PAGO: UPDATE - admin_parking/empleado del parking o admin_general
DROP POLICY IF EXISTS rls_update_pago ON public.pago;
CREATE POLICY rls_update_pago
ON public.pago
FOR UPDATE
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
        up.id_usuario IS NOT NULL
        OR (u.rol = 'admin_general')
      )
  )
);

COMMIT;

-- Verificación:
-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
-- WHERE tablename IN ('reserva','ocupacion','pago') AND cmd IN ('INSERT','UPDATE')
-- ORDER BY tablename, cmd, policyname;
