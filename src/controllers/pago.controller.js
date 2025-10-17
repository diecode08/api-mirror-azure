const Pago = require('../models/pago.model');
const Ocupacion = require('../models/ocupacion.model');
const Notificacion = require('../models/notificacion.model');
const Usuario = require('../models/usuario.model');

/**
 * Obtener todos los pagos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllPagos = async (req, res) => {
  try {
    const pagos = await Pago.getAll();
    
    res.status(200).json({
      success: true,
      data: pagos
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un pago por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getPagoById = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await Pago.getById(id);
    
    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: pago
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener pagos por ID de ocupación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getPagosByOcupacionId = async (req, res) => {
  try {
    const { ocupacionId } = req.params;
    const pagos = await Pago.getByOcupacionId(ocupacionId);
    
    res.status(200).json({
      success: true,
      data: pagos
    });
  } catch (error) {
    console.error('Error al obtener pagos por ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pagos por ocupación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createPago = async (req, res) => {
  try {
    const { ocupacion_id, metodo_pago_id, monto, referencia } = req.body;
    const userId = req.user.id;
    
    // Validar datos requeridos
    if (!ocupacion_id || !metodo_pago_id || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Ocupación, método de pago y monto son requeridos'
      });
    }
    
    // Verificar si la ocupación existe
    const ocupacion = await Ocupacion.getById(ocupacion_id);
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    // Verificar si el usuario es el propietario de la ocupación o un administrador
    if (ocupacion.usuario_id !== userId && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para crear un pago para esta ocupación'
      });
    }
    
    // Crear pago
    const pagoData = {
      ocupacion_id,
      metodo_pago_id,
      monto,
      referencia: referencia || '',
      estado: 'pendiente',
      fecha_pago: new Date().toISOString()
    };
    
    const nuevoPago = await Pago.create(pagoData);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: ocupacion.usuario_id,
      mensaje: `Se ha registrado un pago de $${monto} para tu ocupación. Estado: Pendiente.`,
      tipo: 'pago',
      estado: 'no_leido'
    });
    
    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      data: nuevoPago
    });
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updatePago = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo_pago_id, monto, referencia } = req.body;
    const userId = req.user.id;
    
    // Verificar si el pago existe
    const existingPago = await Pago.getById(id);
    if (!existingPago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    // Obtener la ocupación asociada al pago
    const ocupacion = await Ocupacion.getById(existingPago.ocupacion_id);
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación asociada no encontrada'
      });
    }
    
    // Verificar si el usuario es el propietario de la ocupación o un administrador
    if (ocupacion.usuario_id !== userId && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este pago'
      });
    }
    
    // Verificar si el pago ya está completado
    if (existingPago.estado === 'completado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede actualizar un pago que ya está completado'
      });
    }
    
    // Actualizar pago
    const pagoData = {};
    if (metodo_pago_id) pagoData.metodo_pago_id = metodo_pago_id;
    if (monto) pagoData.monto = monto;
    if (referencia !== undefined) pagoData.referencia = referencia;
    
    const updatedPago = await Pago.update(id, pagoData);
    
    res.status(200).json({
      success: true,
      message: 'Pago actualizado exitosamente',
      data: updatedPago
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar el estado de un pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateEstadoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validar estado
    if (!estado || !['pendiente', 'procesando', 'completado', 'rechazado'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: pendiente, procesando, completado o rechazado'
      });
    }
    
    // Verificar si el pago existe
    const existingPago = await Pago.getById(id);
    if (!existingPago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    // Solo administradores pueden cambiar el estado a completado o rechazado
    if ((estado === 'completado' || estado === 'rechazado') && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden marcar un pago como completado o rechazado'
      });
    }
    
    // Actualizar estado del pago
    const updatedPago = await Pago.updateEstado(id, estado);
    
    // Obtener información del usuario para la notificación
    const ocupacion = await Ocupacion.getById(existingPago.ocupacion_id);
    const usuario = await Usuario.getById(ocupacion.usuario_id);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: ocupacion.usuario_id,
      mensaje: `El estado de tu pago de $${existingPago.monto} ha sido actualizado a: ${estado}.`,
      tipo: 'pago',
      estado: 'no_leido'
    });
    
    res.status(200).json({
      success: true,
      message: 'Estado de pago actualizado exitosamente',
      data: updatedPago
    });
  } catch (error) {
    console.error('Error al actualizar estado de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deletePago = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el pago existe
    const existingPago = await Pago.getById(id);
    if (!existingPago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }
    
    // Solo administradores pueden eliminar pagos
    if (req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden eliminar pagos'
      });
    }
    
    // No permitir eliminar pagos completados
    if (existingPago.estado === 'completado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un pago que ya está completado'
      });
    }
    
    // Eliminar pago
    await Pago.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllPagos,
  getPagoById,
  getPagosByOcupacionId,
  createPago,
  updatePago,
  updateEstadoPago,
  deletePago
};
