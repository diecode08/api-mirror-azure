const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculo.controller');
const { verifyToken, isOwner } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, vehiculoController.getAllVehiculos);
router.get('/:id', verifyToken, vehiculoController.getVehiculoById);
router.get('/usuario/:userId', verifyToken, isOwner('params', 'userId'), vehiculoController.getVehiculosByUserId);
router.post('/', verifyToken, vehiculoController.createVehiculo);
router.put('/:id', verifyToken, vehiculoController.updateVehiculo);
router.delete('/:id', verifyToken, vehiculoController.deleteVehiculo);

module.exports = router;