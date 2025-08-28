const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const Usuario = require('../models/usuario.model');
require('dotenv').config();

/**
 * Controlador para el registro de usuarios
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const register = async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono, rol = 'cliente' } = req.body;

    // Validar datos requeridos
    if (!email || !password || !nombre || !apellido) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }
    
    // Validar formato de correo electrónico
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico no es válido'
      });
    }

    // Verificar si el correo ya está registrado en la tabla usuario
    const { data: existingUser, error: checkError } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      let errorMessage = 'Error al registrar usuario';
      
      // Proporcionar mensajes de error más específicos
      if (authError.code === 'email_address_invalid') {
        errorMessage = 'El correo electrónico no es válido o no está permitido';
      } else if (authError.code === 'user_already_exists') {
        errorMessage = 'El usuario ya existe en el sistema';
      } else if (authError.code === 'password_invalid') {
        errorMessage = 'La contraseña no cumple con los requisitos mínimos de seguridad';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? authError : {}
      });
    }

    // Crear usuario en la tabla usuario
    const userData = {
      id_usuario: authData.user.id,
      nombre,
      apellido,
      telefono,
      email,
      rol
    };

    const nuevoUsuario = await Usuario.create(userData);

    // Generar token JWT
    const token = jwt.sign(
      { id: authData.user.id, email: authData.user.email, rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario: {
          id: nuevoUsuario.id_usuario,
          nombre: nuevoUsuario.nombre,
          apellido: nuevoUsuario.apellido,
          email,
          rol: nuevoUsuario.rol
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Controlador para el inicio de sesión
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar datos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Correo y contraseña son requeridos'
      });
    }

    // Iniciar sesión con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: process.env.NODE_ENV === 'development' ? authError.message : {}
      });
    }

    // Obtener datos del usuario
    const usuario = await Usuario.getById(authData.user.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id_usuario, email: authData.user.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario: {
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email,
          rol: usuario.rol
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Controlador para obtener el perfil del usuario actual
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener datos del usuario
    const usuario = await Usuario.getById(userId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        telefono: usuario.telefono,
        rol: usuario.rol,
        fecha_registro: usuario.fecha_registro
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Controlador para actualizar la contraseña
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validar datos requeridos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    // Actualizar contraseña con Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar contraseña',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar contraseña',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updatePassword
};