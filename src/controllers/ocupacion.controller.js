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
/**
 * Obtener ocupaciones activas (con filtro opcional por parking)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * Query params: id_parking, activas
 */
const getOcupacionesActivas = async (req, res) => {
  const supabase = require('../config/supabase');
  const { id_parking } = req.query;

  try {
    if (!id_parking) {
      return res.status(400).json({
        success: false,
        message: 'id_parking es requerido'
      });
    }

    // Leer desde la vista optimizada con todos los campos necesarios
    const { data, error } = await supabase
      .from('vista_ocupaciones_activas')
      .select('*')
      .eq('id_parking', parseInt(id_parking))
      .order('hora_entrada', { ascending: false });

    if (error) throw error;

    // Mapear a la forma esperada por el frontend web
    const resultado = (data || []).map(v => ({
      id_ocupacion: v.id_ocupacion,
      id_reserva: v.id_reserva,
      id_usuario: v.id_usuario,
      id_espacio: v.id_espacio,
      id_vehiculo: v.id_vehiculo,
      hora_entrada: v.hora_entrada,
      hora_salida: null,
      hora_salida_solicitada: v.hora_salida_solicitada || null,
      tiempo_total: v.tiempo_total_minutos || null,
      monto_calculado: v.monto_calculado || null,
      costo_total: v.costo_actual || null,
      nombre_usuario: v.cliente || 'N/A',
      guest_nombre: v.guest_nombre || null,
      guest_documento: v.guest_documento || null,
      guest_telefono: v.guest_telefono || null,
      numero_espacio: v.numero_espacio || 'N/A',
      placa: v.vehiculo_placa || null,
      marca: v.vehiculo_marca || null,
      modelo: v.vehiculo_modelo || null,
      color: v.vehiculo_color || null,
      guest_vehiculo_placa: v.vehiculo_placa || null,
      guest_vehiculo_marca: v.vehiculo_marca || null,
      guest_vehiculo_modelo: v.vehiculo_modelo || null,
      guest_vehiculo_color: v.vehiculo_color || null
    }));

    return res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error al obtener ocupaciones activas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones activas',
      error: error.message
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
    
    // Si se proporciona una reserva, verificar que exista y esté activa
    let reserva = null;
    if (id_reserva) {
      reserva = await Reserva.getById(id_reserva);
      if (!reserva) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada'
        });
      }
      
      if (reserva.estado !== 'activa') {
        return res.status(400).json({
          success: false,
          message: 'La reserva no está activa'
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
      hora_entrada: fecha_entrada.toISOString(),
      hora_salida: null
    };
    
    const nuevaOcupacion = await Ocupacion.create(ocupacionData);
    
    // Actualizar estado del espacio a ocupado
    await Espacio.updateEstado(id_espacio, 'ocupado');
    
    // Nota: No cambiamos el estado de la reserva aquí. Se completará cuando el pago sea validado
    // mediante el trigger (fn_pago_completado_sync) que marca la reserva como 'completada'.
    
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
    const { metodo_pago } = req.body; // Opcional: método de pago usado
    
    // Verificar si la ocupación existe
    const existingOcupacion = await Ocupacion.getById(id);
    if (!existingOcupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    // Verificar si ya tiene salida registrada
    if (existingOcupacion.hora_salida) {
      return res.status(400).json({
        success: false,
        message: 'Esta ocupación ya tiene salida registrada'
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
    
    // Bloqueo por flujo híbrido: si ya se solicitó salida o existe pago pendiente, no permitir salida directa
    try {
      const supabase = require('../config/supabase');

      // Si ya hay hora_salida_solicitada, forzar validación de pago por panel
      if (existingOcupacion.hora_salida_solicitada) {
        return res.status(409).json({
          success: false,
          message: 'La salida ya fue solicitada. Debe validarse el pago para finalizar.'
        });
      }

      // Si existe un pago pendiente asociado a la ocupación, bloquear
      const { data: pagoPendiente, error: pagoError } = await supabase
        .from('pago')
        .select('id_pago, estado')
        .eq('id_ocupacion', id)
        .in('estado', ['PENDIENTE', 'pendiente', 'pendiente_validacion'])
        .order('id_pago', { ascending: false })
        .limit(1);
      if (pagoError) throw pagoError;
      if (pagoPendiente && pagoPendiente.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Existe un pago pendiente. Valide el pago antes de registrar la salida.'
        });
      }
    } catch (guardErr) {
      console.warn('Advertencia al verificar pagos pendientes antes de salida:', guardErr?.message || guardErr);
      // Continuar sólo si no hay evidencia de pago pendiente; no silencioso para errores graves
    }

    // Calcular tiempo y monto
    const horaEntrada = new Date(existingOcupacion.hora_entrada);
    const horaSalida = new Date();
    const tiempoMinutos = Math.floor((horaSalida - horaEntrada) / 60000);
    
    let monto = 0;
    if (parking.tarifa_hora) {
      const horas = Math.ceil(tiempoMinutos / 60);
      monto = horas * parking.tarifa_hora;
    } else if (parking.tarifa_base) {
      monto = parking.tarifa_base;
    } else {
      const horas = Math.ceil(tiempoMinutos / 60);
      monto = horas * 5; // Default: S/. 5 por hora
    }
    
    // Registrar salida en la ocupación
    const supabase = require('../config/supabase');
    const { data: updatedOcupacion, error: updateError } = await supabase
      .from('ocupacion')
      .update({
        hora_salida: horaSalida.toISOString(),
        tiempo_total_minutos: tiempoMinutos,
        monto_calculado: parseFloat(monto.toFixed(2))
      })
      .eq('id_ocupacion', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Actualizar estado del espacio a disponible
    await Espacio.updateEstado(existingOcupacion.id_espacio, 'disponible');
    
    // Crear registro de pago si se proporcionó método
    if (metodo_pago) {
      const Pago = require('../models/pago.model');
      await Pago.create({
        id_ocupacion: id,
        id_usuario: existingOcupacion.id_usuario,
        monto: parseFloat(monto.toFixed(2)),
        metodo_pago: metodo_pago,
        estado: 'COMPLETADO',
        fecha_pago: horaSalida.toISOString()
      });
    }
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: existingOcupacion.id_usuario,
      mensaje: `Has finalizado tu ocupación en ${parking.nombre}. Monto: S/. ${monto.toFixed(2)}`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    // Crear notificación para el administrador del parking
    await Notificacion.create({
      id_usuario: parking.id_admin,
      mensaje: `Ocupación finalizada en ${parking.nombre} - Espacio ${espacio.numero_espacio}. Monto: S/. ${monto.toFixed(2)}`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    res.status(200).json({
      success: true,
      message: 'Salida registrada exitosamente',
      data: {
        ...updatedOcupacion,
        monto: parseFloat(monto.toFixed(2)),
        tiempo_minutos: tiempoMinutos
      }
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
    
    // Verificar permisos: propietario de la reserva O admin/empleado del parking
    const espacio = await Espacio.getById(reserva.id_espacio);
    if (!espacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }

    const parking = await Parking.getById(espacio.id_parking);
    const esAdmin = req.user.rol === 'admin_general' || parking.id_admin === id_usuario;
    
    // Verificar si es empleado/admin del parking
    let esEmpleado = false;
    const UsuarioParking = require('../models/usuario_parking.model');
    esEmpleado = await UsuarioParking.hasRole(id_usuario, parking.id_parking, ['admin_parking', 'empleado']);

    // Nueva política: SOLO admin/empleado pueden marcar entrada. El cliente NO puede hacerlo.
    if (!esAdmin && !esEmpleado) {
      return res.status(403).json({
        success: false,
        message: 'Solo el personal del parking puede confirmar la entrada.'
      });
    }
    
    // Alinear estados: una reserva creada pasa a 'activa' y desde ese estado se permite marcar entrada
    if (!['pendiente','confirmada','activa'].includes(reserva.estado)) {
      return res.status(400).json({
        success: false,
        message: `La reserva no está en un estado válido para marcar entrada (actual: ${reserva.estado})`
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
    
    // Bloqueo por flujo híbrido: si ya se solicitó salida o existe pago pendiente, no permitir salida directa
    try {
      const supabase = require('../config/supabase');

      if (ocupacion.hora_salida_solicitada) {
        return res.status(409).json({
          success: false,
          message: 'La salida ya fue solicitada. Espere la validación del pago.'
        });
      }

      const { data: pagoPendiente, error: pagoError } = await supabase
        .from('pago')
        .select('id_pago, estado')
        .eq('id_ocupacion', id_ocupacion)
        .in('estado', ['PENDIENTE', 'pendiente', 'pendiente_validacion'])
        .order('id_pago', { ascending: false })
        .limit(1);
      if (pagoError) throw pagoError;
      if (pagoPendiente && pagoPendiente.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Existe un pago pendiente. Será finalizado cuando el pago sea validado.'
        });
      }
    } catch (guardErr) {
      console.warn('Advertencia al verificar pagos pendientes en marcarSalida:', guardErr?.message || guardErr);
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
 * Obtener historial de ocupaciones del usuario autenticado O de un parking específico
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * Query params: id_parking (opcional) - si se provee, retorna historial del parking
 */
const getHistorialOcupaciones = async (req, res) => {
  try {
    const { id_parking } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    
    let historial;
    
    // Si se especifica id_parking, obtener historial del parking
    if (id_parking) {
      historial = await Ocupacion.getHistorialByParkingId(id_parking, limit);
    } else {
      // Si no, obtener historial del usuario autenticado
      const id_usuario = req.user.id;
      historial = await Ocupacion.getHistorialByUserId(id_usuario, limit);
    }
    
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

/**
 * Confirmar entrada desde reserva (para admin del parking)
 * Crea una ocupación a partir de una reserva activa
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const confirmarEntrada = async (req, res) => {
  try {
    const { id_reserva } = req.body;
    const supabase = require('../config/supabase');
    
    if (!id_reserva) {
      return res.status(400).json({
        success: false,
        message: 'El ID de reserva es requerido'
      });
    }
    
    // Obtener la reserva
    const reserva = await Reserva.getById(id_reserva);
    
    if (!reserva) {
      return res.status(404).json({
        success: false,
        message: 'Reserva no encontrada'
      });
    }
    
    // Verificar que la reserva esté activa
    if (reserva.estado !== 'activa') {
      return res.status(400).json({
        success: false,
        message: `No se puede confirmar entrada de una reserva ${reserva.estado}`
      });
    }
    
    // Verificar que el espacio esté reservado
    const espacio = await Espacio.getById(reserva.id_espacio);
    if (!espacio) {
      return res.status(404).json({
        success: false,
        message: 'Espacio no encontrado'
      });
    }
    
    // Verificar que el usuario autenticado es admin del parking
    const parking = await Parking.getById(espacio.id_parking);
    if (parking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para confirmar entradas en este parking'
      });
    }
    
    // Verificar si ya existe una ocupación activa para esta reserva
    const { data: ocupacionExistente } = await supabase
      .from('ocupacion')
      .select('*')
      .eq('id_reserva', id_reserva)
      .is('hora_salida', null)
      .single();
    
    if (ocupacionExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una ocupación activa para esta reserva'
      });
    }
    
    // Crear ocupación
    const ocupacionData = {
      id_reserva: reserva.id_reserva,
      id_usuario: reserva.id_usuario,
      id_espacio: reserva.id_espacio,
      hora_entrada: new Date().toISOString()
    };
    
    const nuevaOcupacion = await Ocupacion.create(ocupacionData);
    
    // Actualizar estado del espacio a 'ocupado'
    await Espacio.updateEstado(reserva.id_espacio, 'ocupado');
    
    // Crear notificación para el usuario
    await Notificacion.create({
      id_usuario: reserva.id_usuario,
      mensaje: `Tu entrada al parking ${parking.nombre} ha sido confirmada`,
      tipo: 'ocupacion',
      estado: 'no_leido'
    });
    
    // Obtener ocupación completa con datos relacionados
    const { data: ocupacionCompleta } = await supabase
      .from('ocupacion')
      .select(`
        *,
        usuario:id_usuario(nombre, apellido),
        espacio:id_espacio(numero_espacio, id_parking),
        vehiculo:id_vehiculo(placa)
      `)
      .eq('id_ocupacion', nuevaOcupacion.id_ocupacion)
      .single();
    
    res.status(201).json({
      success: true,
      message: 'Entrada confirmada exitosamente',
      data: ocupacionCompleta || nuevaOcupacion
    });
  } catch (error) {
    console.error('Error al confirmar entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar entrada',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Calcular monto a cobrar de una ocupación
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const calcularMonto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener ocupación
    const ocupacion = await Ocupacion.getById(id);
    
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }
    
    // Verificar que no tenga salida registrada
    if (ocupacion.hora_salida) {
      return res.status(400).json({
        success: false,
        message: 'Esta ocupación ya tiene salida registrada',
        data: {
          monto: ocupacion.monto_calculado || 0,
          tiempo_minutos: ocupacion.tiempo_total_minutos || 0
        }
      });
    }
    
    // Calcular tiempo transcurrido en minutos
    const horaEntrada = new Date(ocupacion.hora_entrada);
    const ahora = new Date();
    const tiempoMinutos = Math.max(1, Math.floor((ahora - horaEntrada) / 60000));

    // Obtener datos de espacio / parking
    const espacio = await Espacio.getById(ocupacion.id_espacio);
    const parking = await Parking.getById(espacio.id_parking);
    if (!parking) {
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }

    // Helper local para cálculo según tipo (reutiliza lógica de flujo.controller)
    const calcularSegunTipoTarifa = (tarifa, minutos) => {
      const tipo = (tarifa.tipo || '').toLowerCase();
      const montoBase = parseFloat(tarifa.monto);
      switch (tipo) {
        case 'hora': {
          const horas = Math.ceil(minutos / 60); return horas * montoBase; }
        case 'medio dia': {
          if (minutos <= 720) return montoBase; const horasExtra = Math.ceil((minutos - 720)/60); return montoBase + (horasExtra * (montoBase/12)); }
        case 'dia': {
          if (minutos <= 1440) return montoBase; const diasExtra = Math.ceil((minutos - 1440)/1440); return montoBase + (diasExtra * montoBase); }
        case 'semana': {
          if (minutos <= 10080) return montoBase; const semanasExtra = Math.ceil((minutos - 10080)/10080); return montoBase + (semanasExtra * montoBase); }
        case 'mes': {
          if (minutos <= 43200) return montoBase; const mesesExtra = Math.ceil((minutos - 43200)/43200); return montoBase + (mesesExtra * montoBase); }
        default: {
          const horas = Math.ceil(minutos / 60); return horas * montoBase; }
      }
    };

    const Tarifa = require('../models/tarifa.model');
    let tarifaAplicada = null;
    let montoCalculado = 0;
    let tipoTarifaAplicada = null;

    // Si la ocupación proviene de una reserva con tarifa seleccionada, usarla
    if (ocupacion.id_reserva) {
      try {
        const reserva = await Reserva.getById(ocupacion.id_reserva);
        if (reserva?.id_tarifa) {
          tarifaAplicada = await Tarifa.getById(reserva.id_tarifa);
          if (tarifaAplicada && !tarifaAplicada.deleted_at) {
            montoCalculado = calcularSegunTipoTarifa(tarifaAplicada, tiempoMinutos);
            tipoTarifaAplicada = tarifaAplicada.tipo;
          }
        }
      } catch (e) {
        // Ignorar y usar fallback
      }
    }

    // Fallback: tarifa 'hora' del parking
    if (!tarifaAplicada) {
      try {
        const tarifaHora = await Tarifa.getByTipo(espacio.id_parking, 'hora');
        if (tarifaHora && !tarifaHora.deleted_at) {
          const horas = Math.ceil(tiempoMinutos / 60);
          montoCalculado = horas * parseFloat(tarifaHora.monto);
          tipoTarifaAplicada = tarifaHora.tipo;
          tarifaAplicada = tarifaHora;
        }
      } catch (e) {}
    }

    // Fallback final legacy: tarifa_hora de parking o default 5
    if (!tarifaAplicada) {
      const horas = Math.ceil(tiempoMinutos / 60);
      const tarifaHoraLegacy = parking.tarifa_hora ? parseFloat(parking.tarifa_hora) : 5;
      montoCalculado = horas * tarifaHoraLegacy;
      tipoTarifaAplicada = 'hora';
    }

    res.status(200).json({
      success: true,
      data: {
        monto: Number(montoCalculado.toFixed(2)),
        tiempo_minutos: tiempoMinutos,
        hora_entrada: ocupacion.hora_entrada,
        tarifa_tipo: tipoTarifaAplicada,
        parking: { nombre: parking.nombre }
      }
    });
  } catch (error) {
    console.error('Error al calcular monto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular monto',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Marcar salida Y cobrar en 1 solo paso (flujo simplificado)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const marcarSalidaConPago = async (req, res) => {
  try {
    const { id_ocupacion, id_metodo, monto_recibido, tipo_comprobante = 'boleta', es_simulado = false } = req.body;
    const id_usuario_admin = req.user.id;

    // Validaciones básicas
    if (!id_ocupacion) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la ocupación es requerido'
      });
    }

    if (!id_metodo) {
      return res.status(400).json({
        success: false,
        message: 'El método de pago es requerido'
      });
    }

    const supabase = require('../config/supabase');
    const Pago = require('../models/pago.model');
    const Espacio = require('../models/espacio.model');
    const Reserva = require('../models/reserva.model');

    // 1. Obtener ocupación
    const ocupacion = await Ocupacion.getById(id_ocupacion);
    if (!ocupacion) {
      return res.status(404).json({
        success: false,
        message: 'Ocupación no encontrada'
      });
    }

    // Verificar que no esté ya cerrada
    if (ocupacion.hora_salida !== null) {
      return res.status(400).json({
        success: false,
        message: 'Esta ocupación ya tiene salida registrada'
      });
    }

    // 2. Calcular monto y tiempo (considerando tarifa seleccionada en la reserva si existe)
    const entrada = new Date(ocupacion.hora_entrada);
    const ahora = new Date();
    const minutos = Math.max(1, Math.floor((ahora - entrada) / 60000));

    const { data: espacio } = await supabase
      .from('espacio')
      .select('id_parking')
      .eq('id_espacio', ocupacion.id_espacio)
      .single();

    const Tarifa = require('../models/tarifa.model');
    let montoCalculado = 0;
    const calcularSegunTipoTarifa = (tarifa, minutos) => {
      const tipo = (tarifa.tipo || '').toLowerCase();
      const montoBase = parseFloat(tarifa.monto);
      switch (tipo) {
        case 'hora': {
          const horas = Math.ceil(minutos / 60); return horas * montoBase; }
        case 'medio dia': {
          if (minutos <= 720) return montoBase; const horasExtra = Math.ceil((minutos - 720)/60); return montoBase + (horasExtra * (montoBase/12)); }
        case 'dia': {
          if (minutos <= 1440) return montoBase; const diasExtra = Math.ceil((minutos - 1440)/1440); return montoBase + (diasExtra * montoBase); }
        case 'semana': {
          if (minutos <= 10080) return montoBase; const semanasExtra = Math.ceil((minutos - 10080)/10080); return montoBase + (semanasExtra * montoBase); }
        case 'mes': {
          if (minutos <= 43200) return montoBase; const mesesExtra = Math.ceil((minutos - 43200)/43200); return montoBase + (mesesExtra * montoBase); }
        default: {
          const horas = Math.ceil(minutos / 60); return horas * montoBase; }
      }
    };

    let tarifaSeleccionada = null;
    if (ocupacion.id_reserva) {
      try {
        const reserva = await Reserva.getById(ocupacion.id_reserva);
        if (reserva?.id_tarifa) {
          tarifaSeleccionada = await Tarifa.getById(reserva.id_tarifa);
        }
      } catch (e) {}
    }

    if (tarifaSeleccionada && !tarifaSeleccionada.deleted_at) {
      montoCalculado = calcularSegunTipoTarifa(tarifaSeleccionada, minutos);
    } else {
      try {
        const tarifaHora = await Tarifa.getByTipo(espacio.id_parking, 'hora');
        const horas = Math.ceil(minutos / 60);
        if (tarifaHora?.monto) {
          montoCalculado = horas * Number(tarifaHora.monto);
        } else {
          montoCalculado = horas * 5; // fallback
        }
      } catch (e) {
        const horas = Math.ceil(minutos / 60);
        montoCalculado = horas * 5;
      }
    }

    montoCalculado = Number(montoCalculado.toFixed(2));

    // 3. Obtener próximo número de comprobante
    const { data: ultimoComprobante } = await supabase
      .from('pago')
      .select('numero')
      .eq('tipo_comprobante', tipo_comprobante)
      .order('numero', { ascending: false })
      .limit(1);

    const siguienteNumero = ultimoComprobante?.[0]?.numero ? ultimoComprobante[0].numero + 1 : 1;
    const serie = tipo_comprobante === 'factura' ? 'F001' : 'B001';

    // 4. TODO EN 1 TRANSACCIÓN: Crear pago + cerrar ocupación + liberar espacio + completar reserva
    const ahora_iso = ahora.toISOString();

    // 4a. Crear pago COMPLETADO directamente
    const { data: pagoCreado, error: errorPago } = await supabase
      .from('pago')
      .insert({
        id_ocupacion: id_ocupacion,
        id_metodo: id_metodo,
        monto: montoCalculado,
        estado: 'COMPLETADO',
        fecha_pago: ahora_iso,
        es_simulado: es_simulado,
        validado_por: id_usuario_admin,
        validado_en: ahora_iso,
        tipo_comprobante: tipo_comprobante,
        serie: serie,
        numero: siguienteNumero,
        emitido_en: ahora_iso
      })
      .select()
      .single();

    if (errorPago) {
      console.error('Error al crear pago:', errorPago);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar el pago'
      });
    }

    // 4b. Cerrar ocupación
    const { data: ocupacionActualizada, error: errorOcupacion } = await supabase
      .from('ocupacion')
      .update({
        hora_salida: ahora_iso,
        hora_salida_confirmada: ahora_iso,
        tiempo_total_minutos: minutos,
        monto_calculado: montoCalculado,
        costo_total: montoCalculado,
        estado: 'finalizada'
      })
      .eq('id_ocupacion', id_ocupacion)
      .select()
      .single();

    if (errorOcupacion) {
      console.error('Error al cerrar ocupación:', errorOcupacion);
      // Rollback: eliminar pago
      await supabase.from('pago').delete().eq('id_pago', pagoCreado.id_pago);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar la ocupación'
      });
    }

    // 4c. Liberar espacio
    const { error: errorEspacio } = await supabase
      .from('espacio')
      .update({ estado: 'disponible' })
      .eq('id_espacio', ocupacion.id_espacio);

    if (errorEspacio) {
      console.error('Error al liberar espacio:', errorEspacio);
      // No hacemos rollback completo por esto, solo advertencia
    }

    // 4d. Completar reserva si existe
    if (ocupacion.id_reserva) {
      const { error: errorReserva } = await supabase
        .from('reserva')
        .update({ estado: 'completada' })
        .eq('id_reserva', ocupacion.id_reserva);

      if (errorReserva) {
        console.error('Error al completar reserva:', errorReserva);
        // No hacemos rollback completo por esto
      }
    }

    // 5. Calcular vuelto si aplica (efectivo)
    let vuelto = 0;
    if (monto_recibido && monto_recibido > montoCalculado) {
      vuelto = monto_recibido - montoCalculado;
    }

    // 6. Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Salida registrada y pago completado exitosamente',
      data: {
        id_pago: pagoCreado.id_pago,
        monto_total: montoCalculado,
        monto_recibido: monto_recibido || montoCalculado,
        vuelto: vuelto,
        tiempo_minutos: minutos,
        comprobante: {
          tipo: tipo_comprobante,
          serie: serie,
          numero: siguienteNumero
        },
        ocupacion: ocupacionActualizada
      }
    });

  } catch (error) {
    console.error('Error en marcarSalidaConPago:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar la salida con pago',
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
  marcarSalidaConPago,
  getOcupacionActiva,
  getHistorialOcupaciones,
  confirmarEntrada,
  calcularMonto
};
