const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const UsuarioParking = require('../models/usuario_parking.model');
require('dotenv').config();

/**
 * Middleware para verificar el token JWT
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 * @param {Function} next - Función para continuar
 */
const verifyToken = (req, res, next) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No se proporcionó token de autenticación' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Agregar el usuario decodificado a la solicitud
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido o expirado',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Middleware para verificar rol por parking asignado (multiparking)
 * @param {string} paramName - Nombre del parámetro que contiene el ID del parking
 * @param {string|Array} allowedRoles - Roles permitidos en el parking ('admin_parking','empleado')
 */
const hasParkingRole = (paramName = 'id_parking', allowedRoles = ['admin_parking','empleado']) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const parkingId = parseInt(req.params[paramName] ?? req.body[paramName], 10);

      if (!Number.isInteger(parkingId)) {
        return res.status(400).json({ success: false, message: 'Parámetro id_parking inválido' });
      }

      // admin_general pasa directo
      const { data: usuario, error: usrErr } = await supabase
        .from('usuario')
        .select('rol')
        .eq('id_usuario', userId)
        .single();
      if (usrErr) {
        return res.status(500).json({ success: false, message: 'Error al verificar rol del usuario' });
      }
      if (usuario && usuario.rol === 'admin_general') {
        return next();
      }

      const ok = await UsuarioParking.hasRole(userId, parkingId, allowedRoles);
      if (!ok) {
        return res.status(403).json({ success: false, message: 'No tiene permisos para este parking' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar permisos',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  };
};

/**
 * Middleware para verificar si el usuario tiene el rol requerido
 * @param {string|Array} roles - Rol o roles permitidos
 * @returns {Function} Middleware
 */
const hasRole = (roles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Obtener el usuario de la base de datos
      const { data: usuario, error } = await supabase
        .from('usuario')
        .select('rol')
        .eq('id_usuario', userId)
        .single();
      
      if (error) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar el rol del usuario',
          error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
      }
      
      // Jerarquía: admin_general tiene acceso total
      const rolesArray = Array.isArray(roles) ? roles : [roles];
      if (usuario && usuario.rol === 'admin_general') {
        return next();
      }
      // Verificar si el usuario tiene el rol requerido
      if (!usuario || !rolesArray.includes(usuario.rol)) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tiene permisos para acceder a este recurso' 
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar permisos',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  };
};

/**
 * Middleware para verificar si el usuario es propietario del recurso
 * @param {string} resourceType - Tipo de recurso ('vehiculo', 'reserva', etc.)
 * @param {string} paramName - Nombre del parámetro que contiene el ID del recurso
 * @returns {Function} Middleware
 */
const isOwner = (resourceType, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params[paramName];
      
      let tableName, idColumn, userColumn;
      
      // Configurar según el tipo de recurso
      switch (resourceType) {
        case 'vehiculo':
          tableName = 'vehiculo';
          idColumn = 'id_vehiculo';
          userColumn = 'id_usuario';
          break;
        case 'reserva':
          tableName = 'reserva';
          idColumn = 'id_reserva';
          userColumn = 'id_usuario';
          break;
        case 'ocupacion':
          tableName = 'ocupacion';
          idColumn = 'id_ocupacion';
          userColumn = 'id_usuario';
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Tipo de recurso no válido' 
          });
      }
      
      // Verificar si el usuario es propietario del recurso
      const { data, error } = await supabase
        .from(tableName)
        .select(userColumn)
        .eq(idColumn, resourceId)
        .single();
      
      if (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recurso no encontrado',
          error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
      }
      
      if (!data || data[userColumn] !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tiene permisos para acceder a este recurso' 
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar permisos',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  };
};

/**
 * Middleware para verificar si el usuario es administrador del parking
 * @param {string} paramName - Nombre del parámetro que contiene el ID del parking
 * @returns {Function} Middleware
 */
const isParkingAdmin = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const parkingId = req.params[paramName];
      
      // Verificar si el usuario es administrador del parking
      const { data, error } = await supabase
        .from('parking')
        .select('id_admin')
        .eq('id_parking', parkingId)
        .single();
      
      if (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'Parking no encontrado',
          error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
      }
      
      // admin_general pasa
      const { data: usuario } = await supabase
        .from('usuario')
        .select('rol')
        .eq('id_usuario', userId)
        .single();

      if (usuario && usuario.rol === 'admin_general') return next();

      // admin en pivote o id_admin del parking
      const esAdminPivote = await UsuarioParking.hasRole(userId, parseInt(parkingId, 10), 'admin_parking');
      const esAdminDirecto = data && data.id_admin === userId;

      if (!esAdminPivote && !esAdminDirecto) {
        return res.status(403).json({ success: false, message: 'No tiene permisos para administrar este parking' });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error al verificar permisos',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  };
};

module.exports = {
  verifyToken,
  hasRole,
  hasParkingRole,
  isOwner,
  isParkingAdmin
};