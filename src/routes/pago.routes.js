const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pago.controller');
const flujoController = require('../controllers/flujo.controller');
const { verifyToken, isOwner, hasRole } = require('../middleware/auth.middleware');

// Rutas protegidas por autenticación
router.get('/', verifyToken, pagoController.getAllPagos);
router.get('/pendientes', verifyToken, flujoController.listarPagosPendientes);
router.get('/:id', verifyToken, pagoController.getPagoById);
router.get('/ocupacion/:ocupacionId', verifyToken, pagoController.getPagosByOcupacionId);
router.post('/', verifyToken, pagoController.createPago);
router.put('/:id', verifyToken, pagoController.updatePago);
router.patch('/:id/estado', verifyToken, pagoController.updateEstadoPago);
router.delete('/:id', verifyToken, hasRole(['admin_general']), pagoController.deletePago);

// Flujo híbrido (COMENTADO - Ahora usamos marcarSalidaConPago en ocupacion.routes.js)
// TODO: Eliminar después de 1 semana de pruebas exitosas con nuevo flujo
// router.post('/ocupaciones/:id/solicitar-salida', verifyToken, flujoController.solicitarSalida);
// router.patch('/:id/validar', verifyToken, flujoController.validarPago); // requiere rol admin_parking/empleado en middleware real
router.post('/:id/simular', verifyToken, flujoController.simularPago);
router.get('/:id/comprobante', verifyToken, flujoController.obtenerComprobante);

module.exports = router;