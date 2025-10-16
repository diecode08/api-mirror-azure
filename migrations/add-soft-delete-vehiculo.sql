-- Agregar campos de borrado lógico a la tabla vehiculo
-- Ejecutar este script en Supabase SQL Editor

ALTER TABLE public.vehiculo 
ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
ADD COLUMN IF NOT EXISTS deleted_by uuid,
ADD COLUMN IF NOT EXISTS motivo_baja text;

-- Agregar foreign key para deleted_by
ALTER TABLE public.vehiculo 
ADD CONSTRAINT vehiculo_deleted_by_fkey 
FOREIGN KEY (deleted_by) REFERENCES public.usuario(id_usuario);

-- Comentarios para documentación
COMMENT ON COLUMN public.vehiculo.deleted_at IS 'Fecha y hora de borrado lógico';
COMMENT ON COLUMN public.vehiculo.deleted_by IS 'ID del usuario que eliminó el vehículo';
COMMENT ON COLUMN public.vehiculo.motivo_baja IS 'Motivo de la baja del vehículo';
