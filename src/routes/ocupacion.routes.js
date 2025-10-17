const express = require('express');
const router = express.Router();
const ocupacionController = require('../controllers/ocupacion.controller');
const { verifyToken, isOwner, isParkingAdmin } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, ocupacionController.getAllOcupaciones);
router.get('/activas', verifyToken, ocupacionController.getOcupacionesActivas);

// Nuevas rutas para el flujo móvil
router.post('/marcar-entrada', verifyToken, ocupacionController.marcarEntrada);
router.post('/marcar-salida', verifyToken, ocupacionController.marcarSalida);
router.get('/activa', verifyToken, ocupacionController.getOcupacionActiva);
router.get('/historial', verifyToken, ocupacionController.getHistorialOcupaciones);

// Rutas existentes
router.get('/:id', verifyToken, ocupacionController.getOcupacionById);
router.get('/usuario/:userId', verifyToken, isOwner('params', 'userId'), ocupacionController.getOcupacionesByUserId);
router.get('/espacio/:espacioId', verifyToken, ocupacionController.getOcupacionesByEspacioId);
router.post('/', verifyToken, ocupacionController.createOcupacion);
router.patch('/:id/salida', verifyToken, ocupacionController.registrarSalida);
router.delete('/:id', verifyToken, ocupacionController.deleteOcupacion);

module.exports = router;