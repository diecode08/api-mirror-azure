const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parking.controller');
const { verifyToken, hasRole, isParkingAdmin } = require('../middleware/auth.middleware');
const tarifaController = require('../controllers/tarifa.controller');
const espacioController = require('../controllers/espacio.controller');
const Espacio = require('../models/espacio.model');
const Parking = require('../models/parking.model');
const UsuarioParking = require('../models/usuario_parking.model');
const supabase = require('../config/supabase')

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
  isParkingAdmin('id'),
  parkingController.updateParking
);
router.put('/:id/assign-admin', verifyToken, hasRole(['admin_general']), parkingController.assignAdminToParking);
router.delete(
  '/:id',
  verifyToken,
  isParkingAdmin('id'),
  parkingController.deleteParking
);

// ---- Gestión avanzada: Tarifas ----
router.get('/:id/tarifas', verifyToken, (req, res, next) => { res.set('Cache-Control','no-store'); return tarifaController.listByParking(req, res, next); });
router.post('/:id/tarifas', verifyToken, isParkingAdmin('id'), tarifaController.create);
router.put('/:id/tarifas/:tarifaId', verifyToken, isParkingAdmin('id'), tarifaController.update);
router.delete('/:id/tarifas/:tarifaId', verifyToken, isParkingAdmin('id'), tarifaController.remove);

// ---- RUTA DE PRUEBA PARA DEBUGGING ----
router.post('/:id/tarifas-test', verifyToken, async (req, res) => {
  try {
    console.log('[RUTA DE PRUEBA] INICIO');
    const { id } = req.params;
    const { tipo, monto, condiciones } = req.body || {};
    console.log('[RUTA DE PRUEBA] Datos recibidos:', { id, tipo, monto, condiciones });

    // Consulta básica directa sin middleware complejo
    console.log('[RUTA DE PRUEBA] Consultando parking...');
    const { data: parking, error: parkingError } = await supabase
      .from('parking')
      .select('id_admin')
      .eq('id_parking', id)
      .single();

    console.log('[RUTA DE PRUEBA] Parking result:', parking, 'error:', parkingError);

    if (parkingError) {
      console.log('[RUTA DE PRUEBA] Error en parking:', parkingError.message);
      return res.status(404).json({ success: false, message: 'Parking no encontrado', error: parkingError.message });
    }

    // Verificación simple de permisos
    const esAdminDirecto = parking.id_admin === req.user.id;
    const esAdminGeneral = req.user.rol === 'admin_general';

    console.log('[RUTA DE PRUEBA] esAdminDirecto:', esAdminDirecto, 'esAdminGeneral:', esAdminGeneral);

    if (!esAdminDirecto && !esAdminGeneral) {
      console.log('[RUTA DE PRUEBA] Permisos insuficientes');
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
    }

    console.log('[RUTA DE PRUEBA] Creando tarifa directamente...');
    const tarifaData = {
      id_parking: Number(id),
      tipo,
      monto: Number(monto),
      condiciones: condiciones || null
    };

    const { data: nueva, error: createError } = await supabase
      .from('tarifa')
      .insert([tarifaData])
      .select();

    console.log('[RUTA DE PRUEBA] Tarifa creada:', nueva, 'error:', createError);

    if (createError) {
      console.log('[RUTA DE PRUEBA] Error creando tarifa:', createError.message);
      return res.status(500).json({ success: false, message: 'Error creando tarifa', error: createError.message });
    }

    console.log('[RUTA DE PRUEBA] Éxito total');
    return res.status(201).json({ success: true, data: nueva[0] });

  } catch (error) {
    console.error('[RUTA DE PRUEBA] Error atrapado:', error);
    return res.status(500).json({ success: false, message: 'Error general', error: error.message });
  }
});

// ---- Gestión avanzada: alias Espacios bajo /parking ----
router.get('/:id/spaces', verifyToken, (req, res, next) => {
  // reusar lógica existente: espacios por parking
  req.params.parkingId = req.params.id;
  res.set('Cache-Control','no-store');
  return espacioController.getEspaciosByParkingId(req, res, next);
});
router.get('/:id/spaces/disponibles', verifyToken, (req, res, next) => {
  req.params.parkingId = req.params.id;
  res.set('Cache-Control','no-store');
  return espacioController.getEspaciosDisponiblesByParkingId(req, res, next);
});
router.patch('/:id/spaces/:spaceId/toggle-enabled', verifyToken, async (req, res) => {
  try {
    const { id: parkingId, spaceId } = req.params;

    // Fast permission check
    if (req.user?.rol !== 'admin_general') {
      try {
        const ok = await Promise.race([
          UsuarioParking.hasRole(req.user.id, parseInt(parkingId, 10), 'admin_parking'),
          new Promise((resolve, reject) => setTimeout(() => reject(new Error('TIMEOUT_PERM')), 3000))
        ]);
        if (!ok) {
          // fallback to direct ownership via Parking.id_admin
          const p = await Promise.race([
            Parking.getById(parkingId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_PERM_PARKING')), 3000))
          ]);
          if (!p || p.id_admin !== req.user.id) {
            return res.status(403).json({ success:false, message:'No tiene permisos para administrar este parking' });
          }
        }
      } catch (e) {
        if (e && (e.message === 'TIMEOUT_PERM' || e.message === 'TIMEOUT_PERM_PARKING')) {
          return res.status(504).json({ success:false, message:'Timeout verificando permisos' });
        }
        // otros errores
      }
    }
    const startLookup = Date.now();
    const espacio = await Promise.race([
      Espacio.getById(spaceId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_ESPACIO_LOOKUP')), 5000))
    ]);
    try { console.log(`[toggle-enabled] lookup in ${Date.now()-startLookup}ms espacio=${spaceId}`); } catch(_) {}
    if (!espacio) return res.status(404).json({ success:false, message:'Espacio no encontrado' });
    if (String(espacio.id_parking) !== String(parkingId)) {
      return res.status(400).json({ success:false, message:'El espacio no pertenece a este parking' });
    }

    // Regla de negocio: solo alternar entre 'disponible' <-> 'inhabilitado'.
    // Si está 'ocupado' o 'reservado', bloquear con 409.
    if (espacio.estado === 'ocupado' || espacio.estado === 'reservado') {
      return res.status(409).json({ success:false, message:`No se puede cambiar el estado mientras está '${espacio.estado}'.` });
    }

    const nextEstado = espacio.estado === 'inhabilitado' ? 'disponible' : 'inhabilitado';
    // Responder de inmediato y procesar en background para evitar timeouts de cliente
    res.status(202).json({ success: true, data: { ...espacio, estado: nextEstado }, message: 'Cambio de estado en proceso' });
    ;(async () => {
      try {
        const start = Date.now();
        const updatePromise = Espacio.updateEstado(spaceId, nextEstado);
        await Promise.race([
          updatePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_ESPACIO_UPDATE')), 5000))
        ]);
        const ms = Date.now() - start;
        try { console.log(`[toggle-enabled][bg] updated in ${ms}ms espacio=${spaceId} -> ${nextEstado}`); } catch(_) {}
      } catch (e) {
        if (e && e.message === 'TIMEOUT_ESPACIO_UPDATE') {
          console.error('[toggle-enabled][bg] timeout actualizando estado');
        } else {
          console.error('[toggle-enabled][bg] error', e);
        }
      }
    })();
    return; // ya respondimos 202
  } catch (e) {
    if (e && e.message === 'TIMEOUT_ESPACIO_LOOKUP') {
      console.error('[parking.routes] toggle-enabled lookup timeout');
      return res.status(504).json({ success:false, message:'Timeout consultando el espacio' });
    }
    if (e && e.message === 'TIMEOUT_ESPACIO_UPDATE') {
      console.error('[parking.routes] toggle-enabled timeout');
      return res.status(504).json({ success:false, message:'Timeout actualizando estado del espacio' });
    }
    console.error('[parking.routes] toggle-enabled error', e);
    return res.status(500).json({ success:false, message:'Error al cambiar estado del espacio' });
  }
});

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