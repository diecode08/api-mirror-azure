const Espacio = require('../models/espacio.model');
const Parking = require('../models/parking.model');

/**
 * Obtener todos los espacios
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllEspacios = async (req, res) => {
  try {
    const espacios = await Espacio.getAll();
    
    res.status(200).json({
      success: true,
      data: espacios
    });
  } catch (error) {
    console.error('Error al obtener espacios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacios',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un espacio por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getEspacioById = async (req, res) => {
  try {
    const { id } = req.params;
    const espacio = await Espacio.getById(id);
    
    if (!espacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: espacio
    });
  } catch (error) {
    console.error('Error al obtener espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener espacios por ID de parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getEspaciosByParkingId = async (req, res) => {
  try {
    const { parkingId } = req.params;
    
    // Verificar si el parking existe
    const parking = await Parking.getById(parkingId);
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    const espacios = await Espacio.getByParkingId(parkingId);
    
    res.status(200).json({
      success: true,
      data: espacios
    });
  } catch (error) {
    console.error('Error al obtener espacios del parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacios del parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener espacios disponibles por ID de parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getEspaciosDisponiblesByParkingId = async (req, res) => {
  try {
    const { parkingId } = req.params;
    
    // Verificar si el parking existe
    const parking = await Parking.getById(parkingId);
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    const espaciosDisponibles = await Espacio.getAvailableByParkingId(parkingId);
    
    res.status(200).json({
      success: true,
      data: espaciosDisponibles
    });
  } catch (error) {
    console.error('Error al obtener espacios disponibles del parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener espacios disponibles del parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createEspacio = async (req, res) => {
  try {
    const { id_parking, numero_espacio, estado = 'disponible' } = req.body;
    
    // Validar datos requeridos
    if (!id_parking || !numero_espacio) {
      return res.status(400).json({
        success: false,
        message: 'El ID del parking y el número de espacio son requeridos'
      });
    }
    
    // Verificar si el parking existe
    const parking = await Parking.getById(id_parking);
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear espacios en este parking'
      });
    }
    
    // Verificar si ya existe un espacio con ese número en el mismo parking
    const espacios = await Espacio.getByParkingId(id_parking);
    const espacioExistente = espacios.find(e => e.numero_espacio === numero_espacio);
    if (espacioExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un espacio con ese número en este parking'
      });
    }
    
    // Crear espacio
    const espacioData = {
      id_parking,
      numero_espacio,
      estado
    };
    
    const nuevoEspacio = await Espacio.create(espacioData);
    
    // Actualizar capacidad total del parking
    await Parking.update(id_parking, {
      capacidad_total: parking.capacidad_total + 1
    });
    
    res.status(201).json({
      success: true,
      message: 'Espacio creado exitosamente',
      data: nuevoEspacio
    });
  } catch (error) {
    console.error('Error al crear espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateEspacio = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_espacio, estado } = req.body;
    
    // Verificar si el espacio existe
    const existingEspacio = await Espacio.getById(id);
    if (!existingEspacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    const parking = await Parking.getById(existingEspacio.id_parking);
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar este espacio'
      });
    }
    
    // Actualizar espacio
    const espacioData = {};
    if (numero_espacio) espacioData.numero_espacio = numero_espacio;
    if (estado) espacioData.estado = estado;
    
    const updatedEspacio = await Espacio.update(id, espacioData);
    
    res.status(200).json({
      success: true,
      message: 'Espacio actualizado exitosamente',
      data: updatedEspacio
    });
  } catch (error) {
    console.error('Error al actualizar espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar estado de un espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateEstadoEspacio = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validar datos requeridos
    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }
    
    // Verificar si el espacio existe
    const existingEspacio = await Espacio.getById(id);
    if (!existingEspacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    const parking = await Parking.getById(existingEspacio.id_parking);
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar este espacio'
      });
    }
    
    // Actualizar estado del espacio
    const updatedEspacio = await Espacio.updateEstado(id, estado);
    
    res.status(200).json({
      success: true,
      message: 'Estado del espacio actualizado exitosamente',
      data: updatedEspacio
    });
  } catch (error) {
    console.error('Error al actualizar estado del espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado del espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteEspacio = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el espacio existe
    const existingEspacio = await Espacio.getById(id);
    if (!existingEspacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    const parking = await Parking.getById(existingEspacio.id_parking);
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar este espacio'
      });
    }
    
    // Eliminar espacio
    await Espacio.delete(id);
    
    // Actualizar capacidad total del parking
    await Parking.update(existingEspacio.id_parking, {
      capacidad_total: parking.capacidad_total - 1
    });
    
    res.status(200).json({
      success: true,
      message: 'Espacio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllEspacios,
  getEspacioById,
  getEspaciosByParkingId,
  getEspaciosDisponiblesByParkingId,
  createEspacio,
  updateEspacio,
  updateEstadoEspacio,
  deleteEspacio
};
