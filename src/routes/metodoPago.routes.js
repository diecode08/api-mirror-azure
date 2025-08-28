const express = require('express');
const router = express.Router();
const metodoPagoController = require('../controllers/metodoPago.controller');
const { verifyToken, hasRole } = require('../middleware/auth.middleware');

// Rutas públicas
router.get('/', metodoPagoController.getAllMetodosPago);
router.get('/:id', metodoPagoController.getMetodoPagoById);

// Rutas protegidas - solo administradores pueden crear, actualizar o eliminar métodos de pago
router.post('/', verifyToken, hasRole(['admin']), metodoPagoController.createMetodoPago);
router.put('/:id', verifyToken, hasRole(['admin']), metodoPagoController.updateMetodoPago);
router.delete('/:id', verifyToken, hasRole(['admin']), metodoPagoController.deleteMetodoPago);

module.exports = router;