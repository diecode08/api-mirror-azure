const Notificacion = require('../models/notificacion.model');

/**
 * Obtener todas las notificaciones
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllNotificaciones = async (req, res) => {
  try {
    // Solo los administradores pueden ver todas las notificaciones
    if (req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver todas las notificaciones'
      });
    }
    
    const notificaciones = await Notificacion.getAll();
    
    res.status(200).json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener una notificación por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getNotificacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const notificacion = await Notificacion.getById(id);
    
    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Verificar si el usuario es el propietario de la notificación o un administrador
    if (notificacion.usuario_id !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta notificación'
      });
    }
    
    res.status(200).json({
      success: true,
      data: notificacion
    });
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener notificaciones por ID de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getNotificacionesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario es el propietario de las notificaciones o un administrador
    if (userId !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estas notificaciones'
      });
    }
    
    const notificaciones = await Notificacion.getByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('Error al obtener notificaciones por usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones por usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener notificaciones no leídas por ID de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getNotificacionesNoLeidasByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario es el propietario de las notificaciones o un administrador
    if (userId !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estas notificaciones'
      });
    }
    
    const notificaciones = await Notificacion.getNoLeidasByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas por usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones no leídas por usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear una nueva notificación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createNotificacion = async (req, res) => {
  try {
    // Solo los administradores pueden crear notificaciones manualmente
    if (req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para crear notificaciones'
      });
    }
    
    const { usuario_id, titulo, mensaje, tipo } = req.body;
    
    // Validar datos requeridos
    if (!usuario_id || !titulo || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Usuario, título y mensaje son requeridos'
      });
    }
    
    // Crear notificación
    const notificacionData = {
      usuario_id,
      titulo,
      mensaje,
      tipo: tipo || 'general',
      leido: false
    };
    
    const nuevaNotificacion = await Notificacion.create(notificacionData);
    
    res.status(201).json({
      success: true,
      message: 'Notificación creada exitosamente',
      data: nuevaNotificacion
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear notificación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Marcar una notificación como leída
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const marcarComoLeida = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la notificación existe
    const notificacion = await Notificacion.getById(id);
    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Verificar si el usuario es el propietario de la notificación
    if (notificacion.usuario_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar esta notificación como leída'
      });
    }
    
    // Marcar como leída
    const updatedNotificacion = await Notificacion.marcarComoLeida(id);
    
    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída exitosamente',
      data: updatedNotificacion
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Marcar todas las notificaciones de un usuario como leídas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const marcarTodasComoLeidas = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario es el propietario de las notificaciones
    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar estas notificaciones como leídas'
      });
    }
    
    // Marcar todas como leídas
    await Notificacion.marcarTodasComoLeidas(userId);
    
    res.status(200).json({
      success: true,
      message: 'Todas las notificaciones marcadas como leídas exitosamente'
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas las notificaciones como leídas',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar una notificación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la notificación existe
    const notificacion = await Notificacion.getById(id);
    if (!notificacion) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada'
      });
    }
    
    // Verificar si el usuario es el propietario de la notificación o un administrador
    if (notificacion.usuario_id !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta notificación'
      });
    }
    
    // Eliminar notificación
    await Notificacion.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllNotificaciones,
  getNotificacionById,
  getNotificacionesByUserId,
  getNotificacionesNoLeidasByUserId,
  createNotificacion,
  marcarComoLeida,
  marcarTodasComoLeidas,
  deleteNotificacion
};
