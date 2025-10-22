const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historial.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// GET /historial/operaciones/:parkingId - Historial unificado con filtros
router.get('/operaciones/:parkingId', verifyToken, historialController.getOperacionesByParking);

module.exports = router;
