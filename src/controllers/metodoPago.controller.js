const MetodoPago = require('../models/metodoPago.model');

/**
 * Obtener todos los métodos de pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllMetodosPago = async (req, res) => {
  try {
    const metodosPago = await MetodoPago.getAll();
    
    res.status(200).json({
      success: true,
      data: metodosPago
    });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métodos de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un método de pago por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getMetodoPagoById = async (req, res) => {
  try {
    const { id } = req.params;
    const metodoPago = await MetodoPago.getById(id);
    
    if (!metodoPago) {
      return res.status(404).json({
        success: false,
        message: 'Método de pago no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: metodoPago
    });
  } catch (error) {
    console.error('Error al obtener método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener método de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo método de pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createMetodoPago = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Validar datos requeridos
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido'
      });
    }
    
    // Crear método de pago
    const metodoPagoData = {
      nombre,
      descripcion: descripcion || ''
    };
    
    const nuevoMetodoPago = await MetodoPago.create(metodoPagoData);
    
    res.status(201).json({
      success: true,
      message: 'Método de pago creado exitosamente',
      data: nuevoMetodoPago
    });
  } catch (error) {
    console.error('Error al crear método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear método de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un método de pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateMetodoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    // Verificar si el método de pago existe
    const existingMetodoPago = await MetodoPago.getById(id);
    if (!existingMetodoPago) {
      return res.status(404).json({
        success: false,
        message: 'Método de pago no encontrado'
      });
    }
    
    // Actualizar método de pago
    const metodoPagoData = {};
    if (nombre) metodoPagoData.nombre = nombre;
    if (descripcion !== undefined) metodoPagoData.descripcion = descripcion;
    
    const updatedMetodoPago = await MetodoPago.update(id, metodoPagoData);
    
    res.status(200).json({
      success: true,
      message: 'Método de pago actualizado exitosamente',
      data: updatedMetodoPago
    });
  } catch (error) {
    console.error('Error al actualizar método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar método de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un método de pago
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteMetodoPago = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el método de pago existe
    const existingMetodoPago = await MetodoPago.getById(id);
    if (!existingMetodoPago) {
      return res.status(404).json({
        success: false,
        message: 'Método de pago no encontrado'
      });
    }
    
    // Eliminar método de pago
    await MetodoPago.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Método de pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar método de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllMetodosPago,
  getMetodoPagoById,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago
};
