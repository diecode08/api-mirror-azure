const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verifyToken, hasRole, hasParkingRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, hasRole(['admin_general']), usuarioController.getAllUsuarios);
router.get('/empleados/scoped', verifyToken, usuarioController.getScopedEmployees);
router.post('/empleados', verifyToken, hasRole(['admin_general']), usuarioController.createEmpleado);
router.delete('/empleados/:id', verifyToken, hasRole(['admin_general']), usuarioController.deleteEmpleado);
router.get('/administradores-disponibles', verifyToken, hasRole(['admin_general']), usuarioController.getAdministradoresDisponibles);
router.get('/rol/:rol', verifyToken, hasRole(['admin_general']), usuarioController.getUsuariosByRol);
router.get('/:id', verifyToken, usuarioController.getUsuarioById);
router.put('/:id', verifyToken, usuarioController.updateUsuario);
router.delete('/:id', verifyToken, hasRole(['admin_general']), usuarioController.deleteUsuario);
router.patch('/:id/bloqueo', verifyToken, hasRole(['admin_general']), usuarioController.toggleBloqueoUsuario);

// Multiparking: gestión de asignaciones
router.get('/:id/parkings', verifyToken, usuarioController.getUserParkings);
// admin_general puede asignar en cualquier parking; admin_parking solo en sus parkings y solo empleados
router.post('/:id/parkings', verifyToken, hasRole(['admin_general','admin_parking']), usuarioController.assignParkingsToUser);
router.delete('/:id/parkings/:id_parking', verifyToken, hasRole(['admin_general','admin_parking']), usuarioController.removeParkingFromUser);

module.exports = router;