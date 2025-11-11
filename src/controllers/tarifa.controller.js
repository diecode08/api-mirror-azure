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

// Catálogo fijo de tipos permitidos (valor canónico en minúsculas)
const ALLOWED_TYPES = ['hora','medio dia','dia','semana','mes'];

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

    // Normalizar tipo
    const tipoCanon = String(tipo).trim().toLowerCase();
    if (!ALLOWED_TYPES.includes(tipoCanon)) {
      return res.status(400).json({ success: false, message: 'Tipo de tarifa inválido' });
    }

    // Verificar que el parking existe (sin validación de permisos duplicada; isParkingAdmin middleware ya lo cubre)
    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][create] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }

    // Verificar duplicado (misma tarifa activa en el parking)
    const existentes = await Tarifa.getByParkingId(id);
    const existeMismoTipo = existentes.some(t => String(t.tipo).toLowerCase() === tipoCanon);
    if (existeMismoTipo) {
      return res.status(409).json({ success: false, message: `Ya existe una tarifa de tipo "${tipoCanon}" en este parking` });
    }

    const tarifaData = {
      id_parking: Number(id),
      tipo: tipoCanon,
      monto: Number(monto),
      condiciones: condiciones || null
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

    // Verificar que el parking existe (isParkingAdmin middleware ya validó permisos)
    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][update] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }

    // Obtener tarifa actual para validaciones adicionales
    const actual = await Tarifa.getById(tarifaId);
    if (!actual || actual.deleted_at) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada' });
    }
    if (Number(actual.id_parking) !== Number(id)) {
      return res.status(404).json({ success: false, message: 'Tarifa no pertenece a este parking' });
    }

    const updateData = { ...req.body };

    // Si se intenta cambiar el tipo, validar catálogo y duplicados
    if (updateData.tipo !== undefined) {
      const nuevoTipoCanon = String(updateData.tipo).trim().toLowerCase();
      if (!ALLOWED_TYPES.includes(nuevoTipoCanon)) {
        return res.status(400).json({ success: false, message: 'Tipo de tarifa inválido' });
      }
      // Obtener tarifas activas para ver duplicados (excluyendo la actual)
      const existentes = await Tarifa.getByParkingId(id);
      const duplicado = existentes.some(t => t.id_tarifa != tarifaId && String(t.tipo).toLowerCase() === nuevoTipoCanon);
      if (duplicado) {
        return res.status(409).json({ success: false, message: `Ya existe una tarifa de tipo "${nuevoTipoCanon}" en este parking` });
      }
      // Asegurar que no se elimine el último 'hora' al cambiar tipo desde 'hora' a otro
      const actualTipoCanon = String(actual.tipo).trim().toLowerCase();
      if (actualTipoCanon === 'hora' && nuevoTipoCanon !== 'hora') {
        const horasActivas = existentes.filter(t => String(t.tipo).toLowerCase() === 'hora' && t.id_tarifa != tarifaId);
        if (horasActivas.length === 0) {
          return res.status(409).json({ success: false, message: "Debe existir al menos una tarifa de tipo 'hora' en el parking" });
        }
      }
      updateData.tipo = nuevoTipoCanon; // normalizar
    }

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

// Eliminar tarifa (soft delete)
const remove = async (req, res) => {
  try {
    console.log('[tarifa.controller][remove] Parámetros:', req.params);
    const { id, tarifaId } = req.params;
    const userId = req.user.id;

    // Verificar que el parking existe (isParkingAdmin middleware ya validó permisos)
    const parking = await Parking.getById(id);
    if (!parking) {
      console.log('[tarifa.controller][remove] Parking no encontrado:', id);
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }

    // Obtener la tarifa a eliminar para validar reglas
    const objetivo = await Tarifa.getById(tarifaId);
    if (!objetivo || objetivo.deleted_at) {
      return res.status(404).json({ success: false, message: 'Tarifa no encontrada' });
    }
    if (Number(objetivo.id_parking) !== Number(id)) {
      return res.status(404).json({ success: false, message: 'Tarifa no pertenece a este parking' });
    }

    // Evitar eliminar la última tarifa 'hora'
    const tipoCanon = String(objetivo.tipo).trim().toLowerCase();
    if (tipoCanon === 'hora') {
      const existentes = await Tarifa.getByParkingId(objetivo.id_parking);
      const horasActivas = existentes.filter(t => String(t.tipo).toLowerCase() === 'hora');
      if (horasActivas.length <= 1) {
        return res.status(409).json({ success: false, message: "No puedes eliminar la última tarifa de tipo 'hora'" });
      }
    }

    console.log('[tarifa.controller][remove] Eliminando tarifa (soft delete):', tarifaId);
    await Tarifa.softDelete(tarifaId, userId);
    console.log('[tarifa.controller][remove] Tarifa eliminada exitosamente');
    return res.status(200).json({ success: true, message: 'Tarifa eliminada correctamente' });
  } catch (error) {
    console.error('[tarifa.controller][remove] error:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar tarifa', error: error.message });
  }
};

module.exports = { listByParking, create, update, remove };
