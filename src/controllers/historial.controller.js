const Historial = require('../models/historial.model');

/**
 * Obtener historial unificado de operaciones de un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * Query params: estado, fecha_desde, fecha_hasta, q, limit
 */
const getOperacionesByParking = async (req, res) => {
  try {
    const { parkingId } = req.params;
    const { estado, fecha_desde, fecha_hasta, q, limit } = req.query;

    if (!parkingId) {
      return res.status(400).json({
        success: false,
        message: 'El ID del parking es requerido'
      });
    }

    const filters = {};
    if (estado) filters.estado = estado;
    if (fecha_desde) filters.fecha_desde = fecha_desde;
    if (fecha_hasta) filters.fecha_hasta = fecha_hasta;
    if (q) filters.q = q;
    if (limit) filters.limit = parseInt(limit, 10);

    const operaciones = await Historial.getOperacionesByParkingId(parkingId, filters);

    res.status(200).json({
      success: true,
      data: operaciones
    });
  } catch (error) {
    console.error('Error al obtener historial de operaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de operaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getOperacionesByParking
};
