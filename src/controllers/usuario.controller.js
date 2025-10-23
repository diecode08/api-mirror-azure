const Usuario = require('../models/usuario.model');
const supabase = require('../config/supabase');
const UsuarioParking = require('../models/usuario_parking.model');
const Historial = require('../models/historial.model');

/**
 * Obtener todos los usuarios
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.getAll();
    
    res.status(200).json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Bloquear / Desbloquear un usuario (toggle)
 */
const toggleBloqueoUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.getById(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    if (usuario.deleted_at) {
      return res.status(400).json({ success: false, message: 'No se puede cambiar bloqueo de un usuario eliminado' });
    }

    const nuevoEstado = !Boolean(usuario.bloqueado);
    const actualizado = await Usuario.update(id, { bloqueado: nuevoEstado });

    return res.status(200).json({ success: true, message: 'Estado de bloqueo actualizado', data: actualizado });
  } catch (e) {
    console.error('Error al cambiar estado de bloqueo:', e);
    return res.status(500).json({ success: false, message: 'Error al cambiar estado de bloqueo' });
  }
};

/**
 * Obtener un usuario por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.getById(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, rol } = req.body;
    
    // Verificar si el usuario existe
    const existingUser = await Usuario.getById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    if (existingUser.deleted_at) {
      return res.status(400).json({ success: false, message: 'No se puede actualizar un usuario eliminado' });
    }
    
    // Permisos por alcance: si el solicitante es admin_parking, solo puede editar empleados que pertenezcan a al menos uno de sus parkings
    const requesterId = req.user.id;
    const { data: requester, error: reqErr } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (reqErr) {
      return res.status(500).json({ success: false, message: 'Error al verificar permisos' });
    }

    if (requester && requester.rol === 'admin_parking') {
      // Solo puede editar usuarios con rol 'empleado' y con intersección de parkings
      if (existingUser.rol !== 'empleado') {
        return res.status(403).json({ success: false, message: 'Solo puede editar empleados' });
      }

      // Obtener parkings del solicitante
      const myParkingIds = await UsuarioParking.getParkingIdsByUser(requesterId);
      if (!Array.isArray(myParkingIds) || myParkingIds.length === 0) {
        return res.status(403).json({ success: false, message: 'Sin parkings asignados para operar' });
      }
      // Obtener parkings del usuario objetivo
      const targetAssignments = await UsuarioParking.getByUser(id);
      const targetParkingIds = (targetAssignments || []).map(a => a.id_parking);
      const overlap = targetParkingIds.some(pid => myParkingIds.includes(pid));
      if (!overlap) {
        return res.status(403).json({ success: false, message: 'El empleado no pertenece a sus parkings' });
      }
    }

    // Actualizar usuario
    const userData = {};
    if (nombre) userData.nombre = nombre;
    if (apellido) userData.apellido = apellido;
    if (telefono) userData.telefono = telefono;

    // Manejar cambio de rol con permisos
    if (rol) {
      const allowedRoles = ['admin_general','admin_parking','empleado','cliente'];
      if (!allowedRoles.includes(rol)) {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
      }
      if (!requester || requester.rol !== 'admin_general') {
        return res.status(403).json({ success: false, message: 'Solo admin_general puede cambiar roles' });
      }
      userData.rol = rol;
    }
    
    const updatedUser = await Usuario.update(id, userData);
    
    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_baja } = req.body || {};
    
    // Verificar si el usuario existe
    const existingUser = await Usuario.getById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Borrado lógico en la tabla Usuario (opcional: bloquear)
    await Usuario.softDelete(id, { deleted_by: req.user?.id, motivo_baja, bloquear: true });
    
    res.status(200).json({
      success: true,
      message: 'Usuario eliminado (borrado lógico) exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener usuarios por rol
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getUsuariosByRol = async (req, res) => {
  try {
    const { rol } = req.params;
    const usuarios = await Usuario.findByRol(rol);
    
    res.status(200).json({
      success: true,
      data: usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios por rol',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Listar parkings asignados a un usuario
 */
async function getUserParkings(req, res) {
  try {
    const requesterId = req.user.id;
    const { id } = req.params; // usuario objetivo

    // Permitir si es el mismo usuario o si tiene rol admin_general o admin_parking
    const { data: requester, error } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (error) throw error;

    if (requesterId !== id && !['admin_general','admin_parking'].includes(requester.rol)) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    const data = await UsuarioParking.getByUser(id);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('Error al listar parkings de usuario:', e);
    return res.status(500).json({ success: false, message: 'Error al listar parkings' });
  }
}

/**
 * Asignar uno o varios parkings a un usuario con rol_en_parking
 * Body: { assignments: [{ id_parking: number, rol_en_parking: 'admin_parking'|'empleado' }, ...] }
 */
async function assignParkingsToUser(req, res) {
  try {
    const requesterId = req.user.id;
    const { id } = req.params; // usuario objetivo
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'assignments requerido' });
    }

    // Rol del solicitante
    const { data: requester, error } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (error) throw error;

    // Validar roles y permisos por parking
    for (const a of assignments) {
      if (!Number.isInteger(a.id_parking) || !['admin_parking','empleado'].includes(a.rol_en_parking)) {
        return res.status(400).json({ success: false, message: 'Datos de assignment inválidos' });
      }

      if (requester.rol === 'admin_general') {
        continue; // permitido
      }

      if (requester.rol === 'admin_parking') {
        // Debe ser admin del parking destino
        const allowed = await UsuarioParking.hasRole(requesterId, a.id_parking, 'admin_parking');
        if (!allowed) {
          return res.status(403).json({ success: false, message: `Sin permisos para administrar parking ${a.id_parking}` });
        }
        // Admin de parking solo puede asignar empleados (no otros admins de parking)
        if (a.rol_en_parking !== 'empleado') {
          return res.status(403).json({ success: false, message: 'admin_parking solo puede asignar empleados' });
        }
        continue;
      }

      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    // Insertar asignaciones (manejar conflictos: evitar duplicados)
    // Insert simple; si hay duplicados, supabase arrojará error. Podemos ignorar conflictos con upsert si habilitado.
    const result = await UsuarioParking.addBulk(id, assignments);

    return res.status(201).json({ success: true, message: 'Asignaciones creadas', data: result });
  } catch (e) {
    console.error('Error al asignar parkings:', e);
    return res.status(500).json({ success: false, message: 'Error al asignar parkings' });
  }
}

/**
 * Quitar asignación de un parking a un usuario
 */
async function removeParkingFromUser(req, res) {
  try {
    const requesterId = req.user.id;
    const { id, id_parking } = req.params;
    const parkingId = parseInt(id_parking, 10);
    if (!Number.isInteger(parkingId)) {
      return res.status(400).json({ success: false, message: 'id_parking inválido' });
    }

    const { data: requester, error } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (error) throw error;

    if (requester.rol === 'admin_general') {
      // ok
    } else if (requester.rol === 'admin_parking') {
      const allowed = await UsuarioParking.hasRole(requesterId, parkingId, 'admin_parking');
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Sin permisos para este parking' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    await UsuarioParking.remove(id, parkingId);
    return res.status(200).json({ success: true, message: 'Asignación eliminada' });
  } catch (e) {
    console.error('Error al eliminar asignación de parking:', e);
    return res.status(500).json({ success: false, message: 'Error al eliminar asignación' });
  }
}

/**
 * Obtener parkings asignados al usuario actual
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getMyParkingAssignments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener asignaciones de parking del usuario actual
    const assignments = await UsuarioParking.getByUser(userId);
    
    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error al obtener asignaciones de parking del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener asignaciones de parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener administradores disponibles para asignar a parkings
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAdministradoresDisponibles = async (req, res) => {
  try {
    const { data: administradores, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, apellido, email, telefono, rol')
      .in('rol', ['admin_general', 'admin_parking'])
      .eq('bloqueado', false)
      .is('deleted_at', null)
      .order('nombre', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: administradores
    });
  } catch (error) {
    console.error('Error al obtener administradores disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener administradores disponibles',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Listar empleados con alcance por rol del solicitante.
 * - admin_general: todos los empleados
 * - admin_parking: solo empleados asignados a al menos uno de sus parkings
 */
const getScopedEmployees = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { data: requester, error } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (error) throw error;

    const attachParkings = async (users) => {
      const ids = users.map(u => u.id_usuario);
      if (ids.length === 0) return users;
      const { data: asignaciones, error: asgErr } = await supabase
        .from('usuario_parking')
        .select('id_usuario, id_parking, rol_en_parking')
        .in('id_usuario', ids)
        .eq('rol_en_parking', 'empleado');
      if (asgErr) throw asgErr;
      const parkingIds = Array.from(new Set((asignaciones || []).map(a => a.id_parking)));
      let parkingById = {};
      if (parkingIds.length > 0) {
        const { data: parks, error: pkErr } = await supabase
          .from('parking')
          .select('id_parking, nombre')
          .in('id_parking', parkingIds);
        if (pkErr) throw pkErr;
        parkingById = (parks || []).reduce((acc, p) => { acc[p.id_parking] = p.nombre; return acc; }, {});
      }
      const assignmentsByUser = new Map();
      (asignaciones || []).forEach(a => {
        const arr = assignmentsByUser.get(a.id_usuario) || [];
        arr.push({ id_parking: a.id_parking, rol_en_parking: a.rol_en_parking, nombre: parkingById[a.id_parking] });
        assignmentsByUser.set(a.id_usuario, arr);
      });
      return users.map(u => ({ ...u, parkings: assignmentsByUser.get(u.id_usuario) || [] }));
    };

    if (requester.rol === 'admin_general') {
      const empleados = await Usuario.findByRol('empleado');
      const withPks = await attachParkings(empleados || []);
      return res.status(200).json({ success: true, data: withPks });
    }

    if (requester.rol === 'admin_parking') {
      // Parkings del solicitante
      const myParkingIds = await UsuarioParking.getParkingIdsByUser(requesterId);
      if (!Array.isArray(myParkingIds) || myParkingIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      // Obtener asignaciones de esos parkings
      const { data: asignaciones, error: asgErr } = await supabase
        .from('usuario_parking')
        .select('id_usuario, id_parking, rol_en_parking')
        .in('id_parking', myParkingIds)
        .eq('rol_en_parking', 'empleado');
      if (asgErr) throw asgErr;

      const empleadoIds = Array.from(new Set((asignaciones || []).map(a => a.id_usuario)));
      if (empleadoIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }
      // Traer datos de usuarios empleados
      const { data: empleados, error: empErr } = await supabase
        .from('usuario')
        .select('*')
        .in('id_usuario', empleadoIds)
        .eq('rol', 'empleado');
      if (empErr) throw empErr;

      // Adjuntar nombres de parkings
      const parkingIds = Array.from(new Set((asignaciones || []).map(a => a.id_parking)));
      let parkingById = {};
      if (parkingIds.length > 0) {
        const { data: parks, error: pkErr } = await supabase
          .from('parking')
          .select('id_parking, nombre')
          .in('id_parking', parkingIds);
        if (pkErr) throw pkErr;
        parkingById = (parks || []).reduce((acc, p) => { acc[p.id_parking] = p.nombre; return acc; }, {});
      }
      const assignmentsByUser = new Map();
      (asignaciones || []).forEach(a => {
        const arr = assignmentsByUser.get(a.id_usuario) || [];
        arr.push({ id_parking: a.id_parking, rol_en_parking: a.rol_en_parking, nombre: parkingById[a.id_parking] });
        assignmentsByUser.set(a.id_usuario, arr);
      });
      const withPks = (empleados || []).map(u => ({ ...u, parkings: assignmentsByUser.get(u.id_usuario) || [] }));
      return res.status(200).json({ success: true, data: withPks });
    }

    return res.status(403).json({ success: false, message: 'Sin permisos' });
  } catch (e) {
    console.error('Error en getScopedEmployees:', e);
    return res.status(500).json({ success: false, message: 'Error al obtener empleados' });
  }
};

/**
 * Crear empleado (solo admin_general). Crea usuario con rol 'empleado' y asignaciones opcionales
 * Body: { nombre, apellido, email, telefono?, parking_ids?: number[] }
 */
const createEmpleado = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { data: requester, error } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (error) throw error;
    if (!requester || requester.rol !== 'admin_general') {
      return res.status(403).json({ success: false, message: 'Solo admin_general puede crear empleados' });
    }

    const { nombre, apellido, email, telefono, parking_ids } = req.body || {};
    if (!nombre || !apellido || !email) {
      return res.status(400).json({ success: false, message: 'nombre, apellido y email son requeridos' });
    }

    // Generar contraseña temporal
    const tempPassword = 'ChangeMe123!';

    // Reutilizar flujo de registro en Auth
    const authController = require('./auth.controller');
    req.body = { nombre, apellido, email, telefono, password: tempPassword, rol: 'empleado', parking_ids };
    return authController.register(req, res);
  } catch (e) {
    console.error('Error al crear empleado:', e);
    return res.status(500).json({ success: false, message: 'Error al crear empleado' });
  }
};

/**
 * Eliminar (baja lógica) un empleado (solo admin_general)
 */
const deleteEmpleado = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { data: requester } = await supabase
      .from('usuario')
      .select('rol')
      .eq('id_usuario', requesterId)
      .single();
    if (!requester || requester.rol !== 'admin_general') {
      return res.status(403).json({ success: false, message: 'Solo admin_general puede eliminar empleados' });
    }
    const { id } = req.params;
    // Verificar que el usuario objetivo sea empleado
    const target = await Usuario.getById(id);
    if (!target) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
    if (target.rol !== 'empleado') return res.status(400).json({ success: false, message: 'El usuario no es empleado' });

    await Usuario.softDelete(id, { deleted_by: requesterId, bloquear: true, motivo_baja: 'Baja por admin' });
    return res.status(200).json({ success: true, message: 'Empleado dado de baja' });
  } catch (e) {
    console.error('Error al eliminar empleado:', e);
    return res.status(500).json({ success: false, message: 'Error al eliminar empleado' });
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  updateUsuario,
  deleteUsuario,
  getUsuariosByRol,
  getUserParkings,
  assignParkingsToUser,
  removeParkingFromUser,
  toggleBloqueoUsuario,
  getMyParkingAssignments,
  getAdministradoresDisponibles,
  getScopedEmployees,
  createEmpleado,
  deleteEmpleado,
  /**
   * Obtener historial unificado por usuario (para app móvil)
   * GET /usuarios/:id/historial?estado=&fecha_desde=&fecha_hasta=&q=&limit=
   * Solo el propio usuario o admin_general pueden acceder.
   */
  async getHistorialUsuario(req, res) {
    try {
      const { id } = req.params;
      const requester = req.user; // contiene id y rol desde el JWT

      console.log('[getHistorialUsuario] Inicio - id:', id, 'requester:', requester?.id);

      if (!requester) {
        console.warn('[getHistorialUsuario] No hay requester autenticado');
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      if (requester.id !== id && requester.rol !== 'admin_general') {
        console.warn('[getHistorialUsuario] Sin permisos - requester.id:', requester.id, 'id solicitado:', id);
        return res.status(403).json({ success: false, message: 'Sin permisos' });
      }

      const { estado, fecha_desde, fecha_hasta, q, limit } = req.query;
      const filters = {};
      if (estado) filters.estado = estado;
      if (fecha_desde) filters.fecha_desde = fecha_desde;
      if (fecha_hasta) filters.fecha_hasta = fecha_hasta;
      if (q) filters.q = q;
      if (limit) filters.limit = parseInt(limit, 10);

      console.log('[getHistorialUsuario] Llamando modelo con filtros:', filters);
      const data = await Historial.getOperacionesByUsuarioId(id, filters);
      console.log('[getHistorialUsuario] Operaciones encontradas:', data?.length);
      
      return res.status(200).json({ success: true, data });
    } catch (e) {
      console.error('[getHistorialUsuario] Error:', e);
      return res.status(500).json({ success: false, message: 'Error al obtener historial', error: process.env.NODE_ENV === 'development' ? e.message : {} });
    }
  }
};
