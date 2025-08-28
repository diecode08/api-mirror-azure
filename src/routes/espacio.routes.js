const express = require('express');
const router = express.Router();
const espacioController = require('../controllers/espacio.controller');
const { verifyToken, isParkingAdmin } = require('../middleware/auth.middleware');

// Rutas públicas
router.get('/', espacioController.getAllEspacios);
router.get('/:id', espacioController.getEspacioById);
router.get('/parking/:parkingId', espacioController.getEspaciosByParkingId);
router.get('/parking/:parkingId/disponibles', espacioController.getEspaciosDisponiblesByParkingId);

// Rutas protegidas por autenticación
router.post('/', verifyToken, isParkingAdmin, espacioController.createEspacio);
router.put('/:id', verifyToken, isParkingAdmin, espacioController.updateEspacio);
router.patch('/:id/estado', verifyToken, isParkingAdmin, espacioController.updateEstadoEspacio);
router.delete('/:id', verifyToken, isParkingAdmin, espacioController.deleteEspacio);

module.exports = router;