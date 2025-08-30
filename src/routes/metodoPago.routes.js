const express = require('express');
const router = express.Router();
const metodoPagoController = require('../controllers/metodoPago.controller');
const { verifyToken, hasRole } = require('../middleware/auth.middleware');

// Rutas públicas
router.get('/', metodoPagoController.getAllMetodosPago);
router.get('/:id', metodoPagoController.getMetodoPagoById);

// Rutas protegidas - solo administrador general puede crear, actualizar o eliminar métodos de pago
router.post('/', verifyToken, hasRole(['admin_general']), metodoPagoController.createMetodoPago);
router.put('/:id', verifyToken, hasRole(['admin_general']), metodoPagoController.updateMetodoPago);
router.delete('/:id', verifyToken, hasRole(['admin_general']), metodoPagoController.deleteMetodoPago);

module.exports = router;