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
    console.log('[verifyToken] Inicio. Header Authorization presente:', !!req.headers.authorization);
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[verifyToken] Token ausente o mal formado');
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
    
    console.log('[verifyToken] OK. user.id:', req.user?.id, 'rol:', req.user?.rol);
    next();
  } catch (error) {
    console.error('[verifyToken] Error:', error?.message);
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
        .select('rol, bloqueado, deleted_at')
        .eq('id_usuario', userId)
        .single();
      
      if (error) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar el rol del usuario',
          error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
      }
      
      // Validar estado de cuenta
      if (!usuario || usuario.deleted_at) {
        return res.status(403).json({ success: false, message: 'Cuenta eliminada' });
      }
      if (usuario.bloqueado) {
        return res.status(403).json({ success: false, message: 'Cuenta bloqueada' });
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
      
      // Si el tipo de recurso es 'params', simplemente verificar que el parámetro coincida con el usuario
      if (resourceType === 'params') {
        if (resourceId !== userId) {
          return res.status(403).json({ 
            success: false, 
            message: 'No tiene permisos para acceder a este recurso' 
          });
        }
        return next();
      }
      
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
      console.log('[isParkingAdmin] ========== DEBUG INICIO ==========');
      const userId = req.user.id;
      const parkingId = req.params[paramName];
      console.log('[isParkingAdmin] userId:', userId, 'parkingId:', parkingId);

      // Consulta 1: Verificar parking existe
      console.log('[isParkingAdmin] Paso 1: Consultando parking...');
      const { data: parking, error: parkingError } = await supabase
        .from('parking')
        .select('id_admin')
        .eq('id_parking', parkingId)
        .single();

      if (parkingError) {
        console.log('[isParkingAdmin] ERROR en consulta parking:', parkingError.message);
        return res.status(404).json({
          success: false,
          message: 'Parking no encontrado',
          error: parkingError.message
        });
      }

      console.log('[isParkingAdmin] Paso 1 OK - Parking encontrado:', parking?.id_admin);

      // Consulta 2: Verificar usuario existe y rol
      console.log('[isParkingAdmin] Paso 2: Consultando usuario...');
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuario')
        .select('rol')
        .eq('id_usuario', userId)
        .single();

      if (usuarioError) {
        console.log('[isParkingAdmin] ERROR en consulta usuario:', usuarioError.message);
        return res.status(500).json({
          success: false,
          message: 'Error al verificar usuario',
          error: usuarioError.message
        });
      }

      console.log('[isParkingAdmin] Paso 2 OK - Usuario rol:', usuario?.rol);

      // Consulta 3: Verificar permisos en usuario_parking
      console.log('[isParkingAdmin] Paso 3: Verificando permisos en usuario_parking...');

      // Opción A: Usuario es admin_general (bypass)
      if (usuario.rol === 'admin_general') {
        console.log('[isParkingAdmin] Paso 3 OK - Usuario es admin_general');
        console.log('[isParkingAdmin] ========== DEBUG FINAL - PERMISOS OK ==========');
        return next();
      }

      // Opción B: Usuario es admin directo del parking
      const esAdminDirecto = parking.id_admin === userId;
      if (esAdminDirecto) {
        console.log('[isParkingAdmin] Paso 3 OK - Usuario es admin directo del parking');
        console.log('[isParkingAdmin] ========== DEBUG FINAL - PERMISOS OK ==========');
        return next();
      }

      // Opción C: Usuario tiene rol admin_parking en usuario_parking
      console.log('[isParkingAdmin] Paso 3C: Verificando rol admin_parking en tabla usuario_parking...');
      const { data: usuarioParking, error: usuarioParkingError } = await supabase
        .from('usuario_parking')
        .select('rol_en_parking')
        .eq('id_usuario', userId)
        .eq('id_parking', parseInt(parkingId, 10))
        .eq('rol_en_parking', 'admin_parking')
        .maybeSingle();

      if (usuarioParkingError) {
        console.log('[isParkingAdmin] ERROR en consulta usuario_parking:', usuarioParkingError.message);
        return res.status(500).json({
          success: false,
          message: 'Error al verificar permisos de parking',
          error: usuarioParkingError.message
        });
      }

      console.log('[isParkingAdmin] Paso 3C - Usuario parking data:', usuarioParking);

      if (!usuarioParking) {
        console.log('[isParkingAdmin] ERROR: Usuario no tiene permisos admin_parking para este parking');
        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para administrar este parking'
        });
      }

      console.log('[isParkingAdmin] ========== DEBUG FINAL - PERMISOS OK ==========');
      next();
    } catch (error) {
      console.error('[isParkingAdmin] ERROR CATASTRÓFICO:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
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