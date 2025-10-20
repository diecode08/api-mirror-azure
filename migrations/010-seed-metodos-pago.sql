-- 010-seed-metodos-pago.sql
-- Semillas de métodos de pago usados en Perú para pruebas/demo
-- Inserta solo si no existen (idempotente)

BEGIN;

INSERT INTO public.metodopago (nombre)
SELECT 'Efectivo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.metodopago WHERE lower(nombre) = 'efectivo'
);

INSERT INTO public.metodopago (nombre)
SELECT 'Yape'
WHERE NOT EXISTS (
  SELECT 1 FROM public.metodopago WHERE lower(nombre) = 'yape'
);

INSERT INTO public.metodopago (nombre)
SELECT 'Plin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.metodopago WHERE lower(nombre) = 'plin'
);

INSERT INTO public.metodopago (nombre)
SELECT 'Deposito'
WHERE NOT EXISTS (
  SELECT 1 FROM public.metodopago WHERE lower(nombre) = 'deposito'
);

COMMIT;

-- Verificación:
-- SELECT * FROM public.metodopago ORDER BY id_metodo;