-- Ejecutar esta migración después de migrations 013 y 014
-- psql -h <host> -U postgres -d <database> -f migrations/015-vista-pagos-pendientes.sql
-- O desde Supabase SQL Editor

\echo '=== Ejecutando migración 015: Vista de pagos pendientes ==='

\i 015-vista-pagos-pendientes.sql

\echo '=== Migración 015 completada ==='
\echo 'Verificando vista...'

SELECT COUNT(*) as total_pagos_pendientes FROM vista_pagos_pendientes_parking;

\echo 'Vista creada exitosamente. Probando consulta por parking...'

-- Ejemplo de consulta (ajustar id_parking según tu caso)
-- SELECT * FROM vista_pagos_pendientes_parking WHERE id_parking = 1;
