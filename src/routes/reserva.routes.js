const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reserva.controller');
const { verifyToken, isOwner, isParkingAdmin } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, reservaController.getAllReservas);
router.get('/mis-reservas', verifyToken, reservaController.getMisReservas); // Nueva ruta
router.get('/:id', verifyToken, reservaController.getReservaById);
router.get('/usuario/:userId', verifyToken, isOwner('params', 'userId'), reservaController.getReservasByUserId);
router.get('/espacio/:espacioId', verifyToken, reservaController.getReservasByEspacioId);
router.post('/verificar-disponibilidad', verifyToken, reservaController.verificarDisponibilidad);
router.post('/', verifyToken, reservaController.createReserva);
router.put('/:id', verifyToken, reservaController.updateReserva);
router.patch('/:id/estado', verifyToken, reservaController.updateEstadoReserva);
router.patch('/:id/aceptar', verifyToken, reservaController.aceptarReserva);
router.delete('/:id', verifyToken, reservaController.deleteReserva);

module.exports = router;