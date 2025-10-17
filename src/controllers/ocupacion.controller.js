const Ocupacion = require('../models/ocupacion.model');
const Reserva = require('../models/reserva.model');
const Espacio = require('../models/espacio.model');
const Parking = require('../models/parking.model');
const Usuario = require('../models/usuario.model');
const Vehiculo = require('../models/vehiculo.model');
const Notificacion = require('../models/notificacion.model');

/**
 * Obtener todas las ocupaciones
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllOcupaciones = async (req, res) => {
  try {
    const ocupaciones = await Ocupacion.getAll();
    
    res.status(200).json({
      success: true,
      data: ocupaciones
    });
  } catch (error) {
    console.error('Error al obtener ocupaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener una ocupación por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getOcupacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const ocupacion = await Ocupacion.getById(id);
    
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: ocupacion
    });
  } catch (error) {
    console.error('Error al obtener ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener ocupaciones por ID de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getOcupacionesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario existe
    const usuario = await Usuario.getById(userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    const ocupaciones = await Ocupacion.getByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: ocupaciones
    });
  } catch (error) {
    console.error('Error al obtener ocupaciones del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener ocupaciones por ID de espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getOcupacionesByEspacioId = async (req, res) => {
  try {
    const { espacioId } = req.params;
    
    // Verificar si el espacio existe
    const espacio = await Espacio.getById(espacioId);
    if (!espacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    const ocupaciones = await Ocupacion.getByEspacioId(espacioId);
    
    res.status(200).json({
      success: true,
      data: ocupaciones
    });
  } catch (error) {
    console.error('Error al obtener ocupaciones del espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones del espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener ocupaciones activas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getOcupacionesActivas = async (req, res) => {
  try {
    const ocupacionesActivas = await Ocupacion.getActivas();
    
    res.status(200).json({
      success: true,
      data: ocupacionesActivas
    });
  } catch (error) {
    console.error('Error al obtener ocupaciones activas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones activas',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear una nueva ocupación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createOcupacion = async (req, res) => {
  try {
    const { id_espacio, id_vehiculo, id_reserva } = req.body;
    const id_usuario = req.user.id;
    
    // Validar datos requeridos
    if (!id_espacio || !id_vehiculo) {
      return res.status(400).json({
        success: false,
        message: 'El ID del espacio y el ID del vehículo son requeridos'
      });
    }
    
    // Verificar si el espacio existe
    const espacio = await Espacio.getById(id_espacio);
    if (!espacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    // Verificar si el espacio está disponible
    if (espacio.estado !== 'disponible') {
      return res.status(400).json({
        success: false,
        message: 'El espacio no está disponible'
      });
    }
    
    // Verificar si el vehículo existe y pertenece al usuario
    const vehiculo = await Vehiculo.getById(id_vehiculo);
    if (!vehiculo) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }
    
    if (vehiculo.id_usuario !== id_usuario && req.user.rol !== 'admin_general' && req.user.rol !== 'admin_parking') {
      return res.status(403).json({
        success: false,
        message: 'El vehículo no pertenece al usuario'
      });
    }
    
    // Si se proporciona una reserva, verificar que exista y esté confirmada
    let reserva = null;
    if (id_reserva) {
      reserva = await Reserva.getById(id_reserva);
      if (!reserva) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }
      
      if (reserva.estado !== 'confirmada') {
        return res.status(400).json({
          success: false,
          message: 'La reserva no está confirmada'
        });
      }
      
      if (reserva.id_espacio !== id_espacio) {
        return res.status(400).json({
          success: false,
          message: 'La reserva no corresponde al espacio seleccionado'
        });
      }
      
      if (reserva.id_vehiculo !== id_vehiculo) {
        return res.status(400).json({
          success: false,
          message: 'La reserva no corresponde al vehículo seleccionado'
        });
      }
    }
    
    // Crear ocupación
    const fecha_entrada = new Date();
    const ocupacionData = {
      id_usuario,
      id_espacio,
      id_vehiculo,
      id_reserva: id_reserva || null,
      fecha_entrada,
      fecha_salida: null,
      estado: 'activa'
    };
    
    const nuevaOcupacion = await Ocupacion.create(ocupacionData);
    
    // Actualizar estado del espacio a ocupado
    await Espacio.updateEstado(id_espacio, 'ocupado');
    
    // Si hay reserva, actualizar su estado a completada
    if (id_reserva) {
      await Reserva.updateEstado(id_reserva, 'completada');
    }
    
    // Obtener información del parking para la notificación
    const parking = await Parking.getById(espacio.id_parking);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario,
      
      mensaje: `Has iniciado una ocupación en ${parking.nombre} para el espacio ${espacio.numero_espacio} a las ${fecha_entrada.toLocaleString()}`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      
      mensaje: `Se ha iniciado una nueva ocupación en tu parking ${parking.nombre} para el espacio ${espacio.numero_espacio}`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    res.status(201).json({
      success: true,
      message: 'Ocupación iniciada exitosamente',
      data: nuevaOcupacion
    });
  } catch (error) {
    console.error('Error al crear ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear ocupación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Registrar salida de una ocupación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const registrarSalida = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la ocupación existe
    const existingOcupacion = await Ocupacion.getById(id);
    if (!existingOcupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    // Verificar si la ocupación está activa
    if (existingOcupacion.estado !== 'activa') {
      return res.status(400).json({
        success: false,
        message: 'La ocupación no está activa'
      });
    }
    
    // Verificar si el usuario es propietario de la ocupación o administrador del parking
    const espacio = await Espacio.getById(existingOcupacion.id_espacio);
    const parking = await Parking.getById(espacio.id_parking);
    
    if (existingOcupacion.id_usuario !== req.user.id && parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para registrar la salida de esta ocupación'
      });
    }
    
    // Registrar salida
    const fecha_salida = new Date();
    const updatedOcupacion = await Ocupacion.registrarSalida(id, fecha_salida);
    
    // Actualizar estado del espacio a disponible
    await Espacio.updateEstado(existingOcupacion.id_espacio, 'disponible');
    
    // Calcular duración de la ocupación en horas
    const fecha_entrada = new Date(existingOcupacion.fecha_entrada);
    const duracion_horas = (fecha_salida - fecha_entrada) / (1000 * 60 * 60);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: existingOcupacion.id_usuario,
      
      mensaje: `Has finalizado tu ocupación en ${parking.nombre} para el espacio ${espacio.numero_espacio}. Duración: ${duracion_horas.toFixed(2)} horas`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      
      mensaje: `Se ha finalizado una ocupación en tu parking ${parking.nombre} para el espacio ${espacio.numero_espacio}`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    res.status(200).json({
      success: true,
      message: 'Salida registrada exitosamente',
      data: updatedOcupacion
    });
  } catch (error) {
    console.error('Error al registrar salida:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar salida',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar una ocupación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteOcupacion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la ocupación existe
    const existingOcupacion = await Ocupacion.getById(id);
    if (!existingOcupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    // Solo los administradores pueden eliminar ocupaciones
    if (req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar ocupaciones'
      });
    }
    
    // Si la ocupación está activa, liberar el espacio
    if (existingOcupacion.estado === 'activa') {
      await Espacio.updateEstado(existingOcupacion.id_espacio, 'disponible');
    }
    
    // Eliminar ocupación
    await Ocupacion.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Ocupación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar ocupación',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Marcar entrada física al parking (usando función SQL)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const marcarEntrada = async (req, res) => {
  try {
    const { id_reserva } = req.body;
    const id_usuario = req.user.id;
    
    if (!id_reserva) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la reserva es requerido'
      });
    }
    
    // Verificar que la reserva exista y pertenezca al usuario
    const reserva = await Reserva.getById(id_reserva);
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    if (reserva.id_usuario !== id_usuario) {
      return res.status(403).json({
        success: false,
        message: 'Esta reserva no te pertenece'
      });
    }
    
    if (reserva.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: `La reserva ya está en estado: ${reserva.estado}`
      });
    }
    
    // Llamar a la función SQL marcar_entrada_parking
    const result = await Ocupacion.marcarEntrada(id_reserva);
    
    res.status(200).json({
      success: true,
      message: 'Entrada registrada exitosamente',
      data: { id_ocupacion: result }
    });
  } catch (error) {
    console.error('Error al marcar entrada:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al marcar entrada',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Marcar salida física del parking (usando función SQL)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const marcarSalida = async (req, res) => {
  try {
    const { id_ocupacion } = req.body;
    const id_usuario = req.user.id;
    
    if (!id_ocupacion) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la ocupación es requerido'
      });
    }
    
    // Verificar que la ocupación exista y pertenezca al usuario
    const ocupacion = await Ocupacion.getById(id_ocupacion);
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    if (ocupacion.id_usuario !== id_usuario) {
      return res.status(403).json({
        success: false,
        message: 'Esta ocupación no te pertenece'
      });
    }
    
    if (ocupacion.hora_salida !== null) {
      return res.status(400).json({
        success: false,
        message: 'Esta ocupación ya tiene salida registrada'
      });
    }
    
    // Llamar a la función SQL marcar_salida_parking
    const result = await Ocupacion.marcarSalida(id_ocupacion);
    
    res.status(200).json({
      success: true,
      message: 'Salida registrada exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error al marcar salida:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al marcar salida',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener ocupación activa del usuario autenticado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getOcupacionActiva = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    
    const ocupacionActiva = await Ocupacion.getActivaByUserId(id_usuario);
    
    res.status(200).json({
      success: true,
      data: ocupacionActiva || null
    });
  } catch (error) {
    console.error('Error al obtener ocupación activa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ocupación activa',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener historial de ocupaciones del usuario autenticado
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getHistorialOcupaciones = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const historial = await Ocupacion.getHistorialByUserId(id_usuario, limit);
    
    res.status(200).json({
      success: true,
      data: historial
    });
  } catch (error) {
    console.error('Error al obtener historial de ocupaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de ocupaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllOcupaciones,
  getOcupacionById,
  getOcupacionesByUserId,
  getOcupacionesByEspacioId,
  getOcupacionesActivas,
  createOcupacion,
  registrarSalida,
  deleteOcupacion,
  // Nuevas funciones
  marcarEntrada,
  marcarSalida,
  getOcupacionActiva,
  getHistorialOcupaciones
};
