const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parking.controller');
const { verifyToken, hasRole, isParkingAdmin } = require('../middleware/auth.middleware');

// Rutas públicas
router.get('/', parkingController.getAllParkings);
router.get('/cercanos', parkingController.findNearbyParkings);
router.get('/:id', parkingController.getParkingById);

// Rutas protegidas por autenticación
router.get('/admin/:adminId', verifyToken, parkingController.getParkingsByAdminId);
router.post('/', verifyToken, hasRole(['admin_general']), parkingController.createParking);
router.put('/:id', verifyToken, isParkingAdmin, parkingController.updateParking);
router.delete('/:id', verifyToken, isParkingAdmin, parkingController.deleteParking);

module.exports = router;