const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verifyToken, hasRole, hasParkingRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, hasRole(['admin_general']), usuarioController.getAllUsuarios);
router.get('/rol/:rol', verifyToken, hasRole(['admin_general']), usuarioController.getUsuariosByRol);
router.get('/:id', verifyToken, usuarioController.getUsuarioById);
router.put('/:id', verifyToken, usuarioController.updateUsuario);
router.delete('/:id', verifyToken, hasRole(['admin_general']), usuarioController.deleteUsuario);

// Multiparking: gestión de asignaciones
router.get('/:id/parkings', verifyToken, usuarioController.getUserParkings);
// admin_general puede asignar en cualquier parking; admin_parking solo en sus parkings y solo empleados
router.post('/:id/parkings', verifyToken, hasRole(['admin_general','admin_parking']), usuarioController.assignParkingsToUser);
router.delete('/:id/parkings/:id_parking', verifyToken, hasRole(['admin_general','admin_parking']), usuarioController.removeParkingFromUser);

module.exports = router;