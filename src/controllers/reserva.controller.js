const Reserva = require('../models/reserva.model');
const Espacio = require('../models/espacio.model');
const Parking = require('../models/parking.model');
const Usuario = require('../models/usuario.model');
const Vehiculo = require('../models/vehiculo.model');
const Notificacion = require('../models/notificacion.model');

/**
 * Obtener todas las reservas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllReservas = async (req, res) => {
  try {
    const reservas = await Reserva.getAll();
    
    res.status(200).json({
      success: true,
      data: reservas
    });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener una reserva por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getReservaById = async (req, res) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.getById(id);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: reserva
    });
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener reservas por ID de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getReservasByUserId = async (req, res) => {
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
    
    const reservas = await Reserva.getByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: reservas
    });
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener reservas por ID de espacio
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getReservasByEspacioId = async (req, res) => {
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
    
    const reservas = await Reserva.getByEspacioId(espacioId);
    
    res.status(200).json({
      success: true,
      data: reservas
    });
  } catch (error) {
    console.error('Error al obtener reservas del espacio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reservas del espacio',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Verificar disponibilidad de un espacio para una reserva
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const verificarDisponibilidad = async (req, res) => {
  try {
    const { id_espacio, fecha_inicio, fecha_fin } = req.body;
    
    // Validar datos requeridos
    if (!id_espacio || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'El ID del espacio, fecha de inicio y fecha de fin son requeridos'
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
    
    // Verificar disponibilidad
    const disponible = await Reserva.verificarDisponibilidad(id_espacio, fecha_inicio, fecha_fin);
    
    res.status(200).json({
      success: true,
      disponible
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar disponibilidad',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear una nueva reserva
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createReserva = async (req, res) => {
  try {
    const { id_espacio, id_vehiculo, fecha_inicio, fecha_fin } = req.body;
    const id_usuario = req.user.id;
    
    // Validar datos requeridos
    if (!id_espacio || !id_vehiculo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'El ID del espacio, ID del vehículo, fecha de inicio y fecha de fin son requeridos'
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
    
    // Verificar si el vehículo existe y pertenece al usuario
    const vehiculo = await Vehiculo.getById(id_vehiculo);
    if (!vehiculo) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }
    
    if (vehiculo.id_usuario !== id_usuario) {
      return res.status(403).json({
        success: false,
        message: 'El vehículo no pertenece al usuario'
      });
    }
    
    // Verificar disponibilidad
    const disponible = await Reserva.verificarDisponibilidad(id_espacio, fecha_inicio, fecha_fin);
    if (!disponible) {
      return res.status(400).json({
        success: false,
        message: 'El espacio no está disponible para el período seleccionado'
      });
    }
    
    // Crear reserva
    const reservaData = {
      id_usuario,
      id_espacio,
      id_vehiculo,
      fecha_inicio,
      fecha_fin,
      estado: 'pendiente'
    };
    
    const nuevaReserva = await Reserva.create(reservaData);
    
    // Obtener información del parking para la notificación
    const parking = await Parking.getById(espacio.id_parking);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario,
      titulo: 'Reserva creada',
      mensaje: `Has creado una reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} desde ${new Date(fecha_inicio).toLocaleString()} hasta ${new Date(fecha_fin).toLocaleString()}`,
      tipo: 'reserva',
      leida: false
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      titulo: 'Nueva reserva',
      mensaje: `Se ha creado una nueva reserva en tu parking ${parking.nombre} para el espacio ${espacio.numero_espacio}`,
      tipo: 'reserva',
      leida: false
    });
    
    res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      data: nuevaReserva
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar una reserva
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_vehiculo, fecha_inicio, fecha_fin } = req.body;
    
    // Verificar si la reserva existe
    const existingReserva = await Reserva.getById(id);
    if (!existingReserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    // Verificar si el usuario es propietario de la reserva
    if (existingReserva.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar esta reserva'
      });
    }
    
    // Verificar si la reserva ya está cancelada o completada
    if (existingReserva.estado === 'cancelada' || existingReserva.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar una reserva ${existingReserva.estado}`
      });
    }
    
    // Actualizar reserva
    const reservaData = {};
    
    // Si se cambia el vehículo, verificar que pertenezca al usuario
    if (id_vehiculo) {
      const vehiculo = await Vehiculo.getById(id_vehiculo);
      if (!vehiculo) {
        return res.status(404).json({
          success: false,
          message: 'Vehículo no encontrado'
        });
      }
      
      if (vehiculo.id_usuario !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'El vehículo no pertenece al usuario'
        });
      }
      
      reservaData.id_vehiculo = id_vehiculo;
    }
    
    // Si se cambian las fechas, verificar disponibilidad
    if (fecha_inicio || fecha_fin) {
      const nuevaFechaInicio = fecha_inicio || existingReserva.fecha_inicio;
      const nuevaFechaFin = fecha_fin || existingReserva.fecha_fin;
      
      // Verificar disponibilidad excluyendo la reserva actual
      const disponible = await Reserva.verificarDisponibilidad(
        existingReserva.id_espacio,
        nuevaFechaInicio,
        nuevaFechaFin,
        id
      );
      
      if (!disponible) {
        return res.status(400).json({
          success: false,
          message: 'El espacio no está disponible para el período seleccionado'
        });
      }
      
      if (fecha_inicio) reservaData.fecha_inicio = fecha_inicio;
      if (fecha_fin) reservaData.fecha_fin = fecha_fin;
    }
    
    // Si no hay cambios, retornar la reserva sin modificar
    if (Object.keys(reservaData).length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No se realizaron cambios en la reserva',
        data: existingReserva
      });
    }
    
    const updatedReserva = await Reserva.update(id, reservaData);
    
    // Obtener información del espacio y parking para la notificación
    const espacio = await Espacio.getById(existingReserva.id_espacio);
    const parking = await Parking.getById(espacio.id_parking);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: existingReserva.id_usuario,
      titulo: 'Reserva actualizada',
      mensaje: `Tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido actualizada`,
      tipo: 'reserva',
      leida: false
    });
    
    res.status(200).json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      data: updatedReserva
    });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar estado de una reserva
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateEstadoReserva = async (req, res) => {
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
    
    // Verificar si la reserva existe
    const existingReserva = await Reserva.getById(id);
    if (!existingReserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    // Verificar si el usuario es propietario de la reserva o administrador del parking
    const espacio = await Espacio.getById(existingReserva.id_espacio);
    const parking = await Parking.getById(espacio.id_parking);
    
    if (existingReserva.id_usuario !== req.user.id && parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar esta reserva'
      });
    }
    
    // Verificar si la reserva ya está cancelada o completada
    if (existingReserva.estado === 'cancelada' || existingReserva.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: `No se puede modificar una reserva ${existingReserva.estado}`
      });
    }
    
    // Actualizar estado de la reserva
    const updatedReserva = await Reserva.updateEstado(id, estado);
    
    // Si se cancela la reserva, actualizar el estado del espacio a disponible
    if (estado === 'cancelada') {
      await Espacio.updateEstado(existingReserva.id_espacio, 'disponible');
    }
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: existingReserva.id_usuario,
      titulo: 'Estado de reserva actualizado',
      mensaje: `El estado de tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido actualizado a ${estado}`,
      tipo: 'reserva',
      leida: false
    });
    
    // Si el cambio lo hizo el usuario, notificar al administrador del parking
    if (req.user.id === existingReserva.id_usuario) {
      await Notificacion.create({
        id_usuario: parking.id_admin,
        titulo: 'Estado de reserva actualizado',
        mensaje: `El usuario ha actualizado el estado de su reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} a ${estado}`,
        tipo: 'reserva',
        leida: false
      });
    }
    // Si el cambio lo hizo el administrador, notificar al usuario
    else if (req.user.id === parking.id_admin) {
      await Notificacion.create({
        id_usuario: existingReserva.id_usuario,
        titulo: 'Estado de reserva actualizado por administrador',
        mensaje: `El administrador ha actualizado el estado de tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} a ${estado}`,
        tipo: 'reserva',
        leida: false
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Estado de la reserva actualizado exitosamente',
      data: updatedReserva
    });
  } catch (error) {
    console.error('Error al actualizar estado de la reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado de la reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar una reserva
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteReserva = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la reserva existe
    const existingReserva = await Reserva.getById(id);
    if (!existingReserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    // Verificar si el usuario es propietario de la reserva o administrador
    if (existingReserva.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar esta reserva'
      });
    }
    
    // Eliminar reserva
    await Reserva.delete(id);
    
    // Obtener información del espacio y parking para la notificación
    const espacio = await Espacio.getById(existingReserva.id_espacio);
    const parking = await Parking.getById(espacio.id_parking);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: existingReserva.id_usuario,
      titulo: 'Reserva eliminada',
      mensaje: `Tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido eliminada`,
      tipo: 'reserva',
      leida: false
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      titulo: 'Reserva eliminada',
      mensaje: `Una reserva en tu parking ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido eliminada`,
      tipo: 'reserva',
      leida: false
    });
    
    res.status(200).json({
      success: true,
      message: 'Reserva eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar reserva',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllReservas,
  getReservaById,
  getReservasByUserId,
  getReservasByEspacioId,
  verificarDisponibilidad,
  createReserva,
  updateReserva,
  updateEstadoReserva,
  deleteReserva
};