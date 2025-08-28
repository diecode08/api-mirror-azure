const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacion.controller');
const { verifyToken, isOwner, hasRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, hasRole(['admin']), notificacionController.getAllNotificaciones);
router.get('/:id', verifyToken, notificacionController.getNotificacionById);
router.get('/usuario/:userId', verifyToken, isOwner('params', 'userId'), notificacionController.getNotificacionesByUserId);
router.get('/usuario/:userId/no-leidas', verifyToken, isOwner('params', 'userId'), notificacionController.getNotificacionesNoLeidasByUserId);
router.post('/', verifyToken, hasRole(['admin']), notificacionController.createNotificacion);
router.patch('/:id/leer', verifyToken, notificacionController.marcarComoLeida);
router.patch('/usuario/:userId/leer-todas', verifyToken, isOwner('params', 'userId'), notificacionController.marcarTodasComoLeidas);
router.delete('/:id', verifyToken, notificacionController.deleteNotificacion);

module.exports = router;