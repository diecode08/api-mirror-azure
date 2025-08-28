const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const { verifyToken, hasRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, hasRole(['admin']), usuarioController.getAllUsuarios);
router.get('/rol/:rol', verifyToken, hasRole(['admin']), usuarioController.getUsuariosByRol);
router.get('/:id', verifyToken, usuarioController.getUsuarioById);
router.put('/:id', verifyToken, usuarioController.updateUsuario);
router.delete('/:id', verifyToken, hasRole(['admin']), usuarioController.deleteUsuario);

module.exports = router;