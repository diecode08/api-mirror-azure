-- Script para verificar y ajustar las políticas RLS de la tabla vehiculo
-- Ejecutar en Supabase SQL Editor

-- Ver las políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'vehiculo';

-- Si RLS está habilitado y causa problemas, puedes deshabilitarlo temporalmente:
-- ALTER TABLE public.vehiculo DISABLE ROW LEVEL SECURITY;

-- O puedes crear/actualizar políticas que permitan el soft delete:

-- Política para permitir actualizar campos de soft delete
DROP POLICY IF EXISTS "Usuarios pueden marcar sus vehiculos como eliminados" ON public.vehiculo;

CREATE POLICY "Usuarios pueden marcar sus vehiculos como eliminados"
ON public.vehiculo
FOR UPDATE
USING (
  auth.uid() = id_usuario 
  OR 
  EXISTS (
    SELECT 1 FROM public.usuario 
    WHERE id_usuario = auth.uid() 
    AND rol = 'admin_general'
  )
)
WITH CHECK (
  auth.uid() = id_usuario 
  OR 
  EXISTS (
    SELECT 1 FROM public.usuario 
    WHERE id_usuario = auth.uid() 
    AND rol = 'admin_general'
  )
);

-- Verificar que se aplicó correctamente
SELECT * FROM pg_policies WHERE tablename = 'vehiculo' AND policyname LIKE '%eliminados%';
