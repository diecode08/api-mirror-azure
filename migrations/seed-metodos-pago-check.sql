-- Verificar y crear métodos de pago si no existen
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar métodos de pago existentes
SELECT * FROM metodopago ORDER BY id_metodo;

-- 2. Insertar métodos de pago si la tabla está vacía
INSERT INTO metodopago (nombre) 
VALUES 
  ('Efectivo'),
  ('Tarjeta de Crédito/Débito'),
  ('Yape'),
  ('QR/Billetera Digital')
ON CONFLICT DO NOTHING;

-- 3. Verificar inserción
SELECT * FROM metodopago ORDER BY id_metodo;
