const Reserva = require('../models/reserva.model');
const Espacio = require('../models/espacio.model');
const Parking = require('../models/parking.model');
const Usuario = require('../models/usuario.model');
const Vehiculo = require('../models/vehiculo.model');
const Notificacion = require('../models/notificacion.model');

/**
 * Obtener todas las reservas (con filtros opcionales)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * Query params: id_parking, estado
 */
const getAllReservas = async (req, res) => {
  try {
    const { id_parking, estado } = req.query;
    const supabase = require('../config/supabase');
    
    // Obtener reservas básicas primero
    let query = supabase
      .from('reserva')
      .select('*')
      .order('hora_inicio', { ascending: false });
    
    // Aplicar filtro de estado
    if (estado) {
      query = query.eq('estado', estado);
    }
    
    const { data: reservas, error } = await query;
    
    if (error) {
      console.error('[Reservas] Error en query:', error);
      throw error;
    }
    
    if (!reservas || reservas.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Enriquecer con datos de usuario, espacio, vehiculo manualmente
    console.log(`[Reservas] Enriqueciendo ${reservas.length} reservas...`);
    
    const enrichedData = await Promise.all(
      reservas.map(async (reserva) => {
        const [usuario, espacio, vehiculo] = await Promise.all([
          supabase.from('usuario').select('id_usuario,nombre,apellido,email,telefono').eq('id_usuario', reserva.id_usuario).single(),
          supabase.from('espacio').select('id_espacio,numero_espacio,estado,id_parking').eq('id_espacio', reserva.id_espacio).single(),
          reserva.id_vehiculo ? supabase.from('vehiculo').select('id_vehiculo,placa,marca,modelo,color').eq('id_vehiculo', reserva.id_vehiculo).single() : Promise.resolve({ data: null })
        ]);
        
        console.log(`[Reservas] Reserva ${reserva.id_reserva}: usuario=${usuario.data?.nombre}, espacio=${espacio.data?.numero_espacio}, id_parking=${espacio.data?.id_parking}`);
        
        // Filtrar por parking si es necesario
        if (id_parking && espacio.data?.id_parking !== parseInt(id_parking)) {
          console.log(`[Reservas] Reserva ${reserva.id_reserva} filtrada (parking ${espacio.data?.id_parking} != ${id_parking})`);
          return null;
        }
        
        return {
          ...reserva,
          usuario: usuario.data,
          espacio: espacio.data,
          vehiculo: vehiculo.data
        };
      })
    );
    
    const finalData = enrichedData.filter(Boolean);
    
    console.log(`[Reservas] Obtenidas ${finalData.length} reservas para parking ${id_parking}, estado: ${estado}`);
    if (finalData.length > 0) {
      console.log('[Reservas] Primera reserva completa:', JSON.stringify(finalData[0], null, 2));
    }
    
    res.status(200).json({
      success: true,
      data: finalData
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
 * Obtener MIS reservas (del usuario autenticado) con datos completos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getMisReservas = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const supabase = require('../config/supabase');

    // Obtener reservas con JOIN para traer datos completos
    const { data, error } = await supabase
      .from('reserva')
      .select(`
        *,
        espacio:id_espacio(
          id_espacio,
          numero_espacio,
          estado,
          parking:id_parking(
            id_parking,
            nombre,
            direccion,
            latitud,
            longitud
          )
        ),
        vehiculo:id_vehiculo(
          id_vehiculo,
          placa,
          marca,
          modelo,
          color
        )
      `)
      .eq('id_usuario', id_usuario)
      .order('hora_inicio', { ascending: false });
    
    if (error) throw error;

    // Corrección de estado visible: si existe una ocupación activa (hora_salida IS NULL)
    // vinculada a la reserva, el estado debe considerarse 'activa'
    let result = data || [];
    if (result.length > 0) {
      const ids = result.map(r => r.id_reserva);
      const { data: ocupActivas, error: errOcu } = await supabase
        .from('ocupacion')
        .select('id_reserva')
        .in('id_reserva', ids)
        .is('hora_salida', null);

      if (errOcu) {
        console.warn('[MisReservas] No se pudo verificar ocupaciones activas:', errOcu.message);
      } else if (ocupActivas) {
        const activasSet = new Set(ocupActivas.map(o => o.id_reserva));
        result = result.map(r => {
          const tieneOcupacionActiva = activasSet.has(r.id_reserva);
          const estadoVisible = tieneOcupacionActiva ? 'activa' : r.estado;
          const puedeCancelar = !tieneOcupacionActiva && ['pendiente','confirmada'].includes(r.estado);
          return { ...r, estado_visible: estadoVisible, tiene_ocupacion_activa: tieneOcupacionActiva, puede_cancelar: puedeCancelar };
        });
      }
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al obtener mis reservas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus reservas',
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
    const { id_espacio, id_vehiculo, fecha_inicio, fecha_fin, id_tarifa } = req.body;
    const id_usuario = req.user.id;
    
    // Validar datos requeridos
    if (!id_espacio || !id_vehiculo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        message: 'El ID del espacio, ID del vehículo, fecha de inicio y fecha de fin son requeridos'
      });
    }
    
  // Verificar si el usuario ya tiene una reserva en curso (pendiente|confirmada|activa)
  const reservasActivas = await Reserva.getByUserId(id_usuario);
  const tieneReservaActiva = reservasActivas.some(r => ['pendiente','confirmada','activa'].includes(r.estado));
    
    if (tieneReservaActiva) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una reserva activa. Debes cancelarla o completarla antes de crear una nueva.'
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
    
    // Verificar que el espacio esté disponible (no reservado, ocupado o deshabilitado)
    if (espacio.estado !== 'disponible') {
      return res.status(400).json({
        success: false,
        message: `El espacio no está disponible (estado actual: ${espacio.estado})`
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
    
    // Validar id_tarifa si se proporciona
    if (id_tarifa) {
      const Tarifa = require('../models/tarifa.model');
      const tarifa = await Tarifa.getById(id_tarifa);
      
      if (!tarifa || tarifa.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Tarifa no encontrada o inactiva'
        });
      }
      
      // Verificar que la tarifa pertenece al parking del espacio
      if (tarifa.id_parking !== espacio.id_parking) {
        return res.status(400).json({
          success: false,
          message: 'La tarifa no pertenece al parking del espacio seleccionado'
        });
      }
    }
    
    // Verificar disponibilidad
    const disponible = await Reserva.verificarDisponibilidad(id_espacio, fecha_inicio, fecha_fin);
    if (!disponible) {
      return res.status(400).json({
        success: false,
        message: 'El espacio no está disponible para el período seleccionado'
      });
    }
    
    // Crear reserva (estado inicial 'pendiente')
    // IMPORTANTE: Las columnas en la BD son hora_inicio y hora_fin, no fecha_inicio y fecha_fin
    const reservaData = {
      id_usuario,
      id_espacio,
      id_vehiculo,
      hora_inicio: fecha_inicio,  // Mapear fecha_inicio -> hora_inicio
      hora_fin: fecha_fin,         // Mapear fecha_fin -> hora_fin
      estado: 'pendiente',
      id_tarifa: id_tarifa || null  // Guardar id_tarifa si se proporcionó
    };
    
    const nuevaReserva = await Reserva.create(reservaData);
    
    // Cambiar estado del espacio a 'reservado'
    await Espacio.updateEstado(id_espacio, 'reservado');
    
    // Obtener información del parking para la notificación
    const parking = await Parking.getById(espacio.id_parking);
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario,
      mensaje: `Reserva creada en ${parking.nombre} para el espacio ${espacio.numero_espacio}`,
      tipo: 'reserva',
      estado: 'no_leido'
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      mensaje: `Nueva reserva en ${parking.nombre} - Espacio ${espacio.numero_espacio}`,
      tipo: 'reserva',
      estado: 'no_leido'
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
  const { id_vehiculo, fecha_inicio, fecha_fin, hora_inicio, hora_fin } = req.body;
    
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
    // Permitir actualizar usando alias fecha_* o nombres correctos hora_*
    const newHoraInicio = hora_inicio || fecha_inicio;
    const newHoraFin = hora_fin || fecha_fin;

    if (newHoraInicio || newHoraFin) {
      const nuevaHoraInicio = newHoraInicio || existingReserva.hora_inicio;
      const nuevaHoraFin = newHoraFin || existingReserva.hora_fin;
      
      // Verificar disponibilidad excluyendo la reserva actual
      const disponible = await Reserva.verificarDisponibilidad(
        existingReserva.id_espacio,
        nuevaHoraInicio,
        nuevaHoraFin,
        id
      );
      
      if (!disponible) {
        return res.status(400).json({
          success: false,
          message: 'El espacio no está disponible para el período seleccionado'
        });
      }
      
      if (newHoraInicio) reservaData.hora_inicio = newHoraInicio;
      if (newHoraFin) reservaData.hora_fin = newHoraFin;
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
      
      mensaje: `Tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido actualizada`,
      tipo: 'reserva',
      estado: 'no_leido'
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
      mensaje: `Estado de reserva en ${parking.nombre} - Espacio ${espacio.numero_espacio} actualizado a: ${estado}`,
      tipo: 'reserva',
      estado: 'no_leido'
    });
    
    // Si el cambio lo hizo el usuario, notificar al administrador del parking
    if (req.user.id === existingReserva.id_usuario) {
      await Notificacion.create({
        id_usuario: parking.id_admin,
        mensaje: `Usuario actualizó reserva en ${parking.nombre} - Espacio ${espacio.numero_espacio} a: ${estado}`,
        tipo: 'reserva',
        estado: 'no_leido'
      });
    }
    // Si el cambio lo hizo el administrador, notificar al usuario
    else if (req.user.id === parking.id_admin) {
      await Notificacion.create({
        id_usuario: existingReserva.id_usuario,
        mensaje: `Administrador actualizó tu reserva en ${parking.nombre} - Espacio ${espacio.numero_espacio} a: ${estado}`,
        tipo: 'reserva',
        estado: 'no_leido'
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
 * Aceptar una reserva (opcional en operación)
 * Cambia estado a 'confirmada'
 */
const aceptarReserva = async (req, res) => {
  try {
    const { id } = req.params;

    const existingReserva = await Reserva.getById(id);
    if (!existingReserva) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
    }

    // Permisos: propietario o admin_general (se puede refinar a admin del parking)
    if (existingReserva.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({ success: false, message: 'No tiene permisos para aceptar esta reserva' });
    }

    if (!['pendiente'].includes(existingReserva.estado)) {
      return res.status(400).json({ success: false, message: `No se puede aceptar una reserva en estado ${existingReserva.estado}` });
    }

    const updated = await Reserva.updateEstado(id, 'confirmada');
    return res.status(200).json({ success: true, message: 'Reserva aceptada', data: updated });
  } catch (error) {
    console.error('Error al aceptar reserva:', error);
    return res.status(500).json({ success: false, message: 'Error al aceptar reserva', error: process.env.NODE_ENV === 'development' ? error.message : {} });
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
      
      mensaje: `Tu reserva en ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido eliminada`,
      tipo: 'reserva',
      estado: 'no_leido'
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      
      mensaje: `Una reserva en tu parking ${parking.nombre} para el espacio ${espacio.numero_espacio} ha sido eliminada`,
      tipo: 'reserva',
      estado: 'no_leido'
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
  getMisReservas,
  getReservasByUserId,
  getReservasByEspacioId,
  verificarDisponibilidad,
  createReserva,
  updateReserva,
  updateEstadoReserva,
  aceptarReserva,
  deleteReserva
};
