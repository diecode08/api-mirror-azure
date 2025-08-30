const Usuario = require('../models/usuario.model');
const supabase = require('../config/supabase');
const UsuarioParking = require('../models/usuario_parking.model');

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
    const { nombre, apellido, telefono } = req.body;
    
    // Verificar si el usuario existe
    const existingUser = await Usuario.getById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Actualizar usuario
    const userData = {};
    if (nombre) userData.nombre = nombre;
    if (apellido) userData.apellido = apellido;
    if (telefono) userData.telefono = telefono;
    
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

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  updateUsuario,
  deleteUsuario,
  getUsuariosByRol,
  getUserParkings,
  assignParkingsToUser,
  removeParkingFromUser,
  toggleBloqueoUsuario
};