const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pago.controller');
const { verifyToken, isOwner, hasRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, pagoController.getAllPagos);
router.get('/:id', verifyToken, pagoController.getPagoById);
router.get('/ocupacion/:ocupacionId', verifyToken, pagoController.getPagosByOcupacionId);
router.post('/', verifyToken, pagoController.createPago);
router.put('/:id', verifyToken, pagoController.updatePago);
router.patch('/:id/estado', verifyToken, pagoController.updateEstadoPago);
router.delete('/:id', verifyToken, hasRole(['admin_general']), pagoController.deletePago);

module.exports = router;