-- ==========================================
-- SCRIPT DE LIMPIEZA PARA NUEVO FLUJO
-- ==========================================
-- Como estás en fase de pruebas, limpiamos todo para empezar fresh
-- Ejecutar en Supabase SQL Editor

-- 1. Limpiar todas las tablas relacionadas
TRUNCATE TABLE 
  pago_comprobante,
  pago,
  ocupacion,
  reserva
RESTART IDENTITY CASCADE;

-- 2. Resetear todos los espacios a disponible
UPDATE espacio SET estado = 'disponible';

-- 3. Verificar limpieza
SELECT 
  (SELECT COUNT(*) FROM reserva) as total_reservas,
  (SELECT COUNT(*) FROM ocupacion) as total_ocupaciones,
  (SELECT COUNT(*) FROM pago) as total_pagos,
  (SELECT COUNT(*) FROM espacio WHERE estado = 'disponible') as espacios_disponibles,
  (SELECT COUNT(*) FROM espacio WHERE estado != 'disponible') as espacios_ocupados;

-- Debería mostrar: 0, 0, 0, N (total espacios), 0
