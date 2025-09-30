const Tarifa = require('../models/tarifa.model');
const Parking = require('../models/parking.model');

// Lista de tarifas por parking
const listByParking = async (req, res) => {
  try {
    const { id } = req.params; // parking id
    const parking = await Parking.getById(id);
    if (!parking) return res.status(404).json({ success: false, message: 'Parking no encontrado' });

    const tarifas = await Tarifa.getByParkingId(id);
    return res.status(200).json({ success: true, data: tarifas });
  } catch (error) {
    console.error('[tarifa.controller][listByParking] error:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener tarifas' });
  }
};

// Crear tarifa
const create = async (req, res) => {
  try {
    console.log('[tarifa.controller][create] Datos recibidos:', req.body);
    const { id } = req.params; // parking id
    const { tipo, monto, condiciones } = req.body || {};
    console.log('[tarifa.controller][create] Parámetros:', { id, tipo, monto, condiciones });

    if (!tipo || monto == null) {
      console.log('[tarifa.controller][create] Validación fallida: tipo o monto faltante');
      return res.status(400).json({ success: false, message: 'tipo y monto son requeridos' });
    }
    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][create] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }

    // seguridad extra (isParkingAdmin ya corre en rutas mutantes)
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      console.log('[tarifa.controller][create] Permisos insuficientes:', { userId: req.user.id, userRole: req.user.rol, parkingAdmin: parking.id_admin });
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
    }

    const tarifaData = {
      id_parking: Number(id),
      tipo,
      monto: Number(monto), // Asegurar que sea número
      condiciones: condiciones || null // Convertir undefined a null para campos nullable
    };
    console.log('[tarifa.controller][create] Datos a insertar:', tarifaData);

    const nueva = await Tarifa.create(tarifaData);
    console.log('[tarifa.controller][create] Tarifa creada exitosamente:', nueva);
    return res.status(201).json({ success: true, data: nueva });
  } catch (error) {
    console.error('[tarifa.controller][create] error:', error);
    return res.status(500).json({ success: false, message: 'Error al crear tarifa', error: error.message });
  }
};

// Actualizar tarifa
const update = async (req, res) => {
  try {
    console.log('[tarifa.controller][update] Datos recibidos:', req.body);
    const { id, tarifaId } = req.params;
    console.log('[tarifa.controller][update] Parámetros:', { id, tarifaId });

    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][update] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      console.log('[tarifa.controller][update] Permisos insuficientes:', { userId: req.user.id, userRole: req.user.rol, parkingAdmin: parking.id_admin });
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
    }

    const updateData = { ...req.body };

    // Convertir undefined a null para campos nullable
    if (updateData.condiciones !== undefined) {
      updateData.condiciones = updateData.condiciones || null;
    }
    if (updateData.monto !== undefined) {
      updateData.monto = Number(updateData.monto);
    }

    console.log('[tarifa.controller][update] Datos a actualizar:', updateData);

    const updated = await Tarifa.update(tarifaId, updateData);
    console.log('[tarifa.controller][update] Tarifa actualizada exitosamente:', updated);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('[tarifa.controller][update] error:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar tarifa', error: error.message });
  }
};

// Eliminar tarifa
const remove = async (req, res) => {
  try {
    console.log('[tarifa.controller][remove] Parámetros:', req.params);
    const { id, tarifaId } = req.params;
    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][remove] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      console.log('[tarifa.controller][remove] Permisos insuficientes:', { userId: req.user.id, userRole: req.user.rol, parkingAdmin: parking.id_admin });
      return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
    }

    console.log('[tarifa.controller][remove] Eliminando tarifa:', tarifaId);
    await Tarifa.delete(tarifaId);
    console.log('[tarifa.controller][remove] Tarifa eliminada exitosamente');
    return res.status(200).json({ success: true, message: 'Tarifa eliminada correctamente' });
  } catch (error) {
    console.error('[tarifa.controller][remove] error:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar tarifa', error: error.message });
  }
};

module.exports = { listByParking, create, update, remove };
