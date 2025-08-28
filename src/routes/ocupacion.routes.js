const express = require('express');
const router = express.Router();
const ocupacionController = require('../controllers/ocupacion.controller');
const { verifyToken, isOwner, isParkingAdmin } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, ocupacionController.getAllOcupaciones);
router.get('/activas', verifyToken, ocupacionController.getOcupacionesActivas);
router.get('/:id', verifyToken, ocupacionController.getOcupacionById);
router.get('/usuario/:userId', verifyToken, isOwner('params', 'userId'), ocupacionController.getOcupacionesByUserId);
router.get('/espacio/:espacioId', verifyToken, ocupacionController.getOcupacionesByEspacioId);
router.post('/', verifyToken, ocupacionController.createOcupacion);
router.patch('/:id/salida', verifyToken, ocupacionController.registrarSalida);
router.delete('/:id', verifyToken, ocupacionController.deleteOcupacion);

module.exports = router;