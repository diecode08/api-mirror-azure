-- 023-fix-rls-reserva-manual.sql
-- Ajustar política RLS de INSERT en reserva para permitir reservas manuales (invitado)
-- Los admin_parking pueden crear reservas con id_usuario NULL (guest)

BEGIN;

-- Eliminar la política INSERT restrictiva anterior
DROP POLICY IF EXISTS rls_insert_reserva ON public.reserva;

-- Nueva política INSERT: permite al usuario crear su propia reserva
-- O permite a admin_parking/admin_general crear reservas para invitados (id_usuario NULL)
CREATE POLICY rls_insert_reserva
ON public.reserva
FOR INSERT
TO authenticated
WITH CHECK (
  -- Usuario normal: puede crear su propia reserva
  id_usuario = auth.uid()
  OR
  -- Admin del parking o admin_general: puede crear reserva manual (id_usuario NULL)
  (
    id_usuario IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.espacio e
      JOIN public.usuario_parking up
        ON up.id_parking = e.id_parking AND up.id_usuario = auth.uid()
      LEFT JOIN public.usuario u ON u.id_usuario = auth.uid()
      WHERE e.id_espacio = reserva.id_espacio
        AND (
          up.id_usuario IS NOT NULL  -- admin_parking o empleado del parking
          OR u.rol = 'admin_general'  -- admin general
        )
    )
  )
);

COMMIT;

-- Verificación:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'reserva' AND cmd = 'INSERT';
