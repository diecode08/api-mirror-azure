const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parking.controller');
const { verifyToken, hasRole, isParkingAdmin } = require('../middleware/auth.middleware');

// Logger del router de parking para depuración
router.use((req, res, next) => {
  try {
    console.log(`[parking.routes] ${req.method} ${req.originalUrl}`);
  } catch (_) {}
  next();
});

// Rutas públicas
router.get('/', parkingController.getAllParkings);
router.get('/cercanos', parkingController.findNearbyParkings);

// Rutas protegidas por autenticación
router.get('/admin/:adminId', verifyToken, parkingController.getParkingsByAdminId);
router.get('/user/:userId', verifyToken, parkingController.getParkingsByUser);
router.get('/check-admin/:userId/:parkingId', verifyToken, parkingController.checkUserParkingAdmin);
router.post('/', verifyToken, hasRole(['admin_general']), parkingController.createParking);
// Logger inline para trazar el flujo de PUT
// TODO: restaurar isParkingAdmin cuando terminemos de depurar el posible cuelgue en este middleware
router.put(
  '/:id',
  verifyToken,
  (req, res, next) => {
    try {
      console.log('[parking.routes][PUT /:id] pasó verifyToken. user.id:', req.user?.id, 'params.id:', req.params?.id);
    } catch (_) {}
    next();
  },
  // isParkingAdmin,
  (req, res, next) => {
    try {
      console.log('[parking.routes][PUT /:id] (DEBUG) saltando isParkingAdmin. El controlador validará permisos.');
    } catch (_) {}
    next();
  },
  parkingController.updateParking
);
router.put('/:id/assign-admin', verifyToken, hasRole(['admin_general']), parkingController.assignAdminToParking);
router.delete('/:id', verifyToken, isParkingAdmin, parkingController.deleteParking);

// Rutas de gestión de eliminados (solo admin_general)
router.get('/admin-deleted/list', verifyToken, hasRole(['admin_general']), parkingController.getDeletedParkings);
router.patch('/:id/restore', verifyToken, hasRole(['admin_general']), parkingController.restoreParking);

// Esta ruta dinámica debe ir al final para evitar colisiones con rutas más específicas
router.get('/:id', parkingController.getParkingById);

// Manejador de errores para capturar cualquier error no manejado
router.use((err, req, res, next) => {
  console.error('[parking.routes] Error no manejado:', err);
  res.status(500).send({ message: 'Error interno del servidor' });
});

module.exports = router;