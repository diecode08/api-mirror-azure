const Vehiculo = require('../models/vehiculo.model');

/**
 * Obtener todos los vehículos
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllVehiculos = async (req, res) => {
  try {
    // Con RLS desactivado y usando service role, debemos filtrar por usuario aquí
    // Regla: usuarios normales ven solo sus vehículos; admin_general puede ver todos
    const isAdmin = req.user?.rol === 'admin_general';
    const userId = req.user?.id;

    let vehiculos;
    if (isAdmin) {
      vehiculos = await Vehiculo.getAll();
    } else {
      vehiculos = await Vehiculo.getByUserId(userId);
    }

    res.status(200).json({
      success: true,
      data: vehiculos
    });
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un vehículo por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getVehiculoById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehiculo = await Vehiculo.getById(id);
    
    if (!vehiculo) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }

    // Restringir acceso: solo dueño o admin_general
    if (vehiculo.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver este vehículo'
      });
    }
    
    res.status(200).json({
      success: true,
      data: vehiculo
    });
  } catch (error) {
    console.error('Error al obtener vehículo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vehículo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener vehículos por ID de usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getVehiculosByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const vehiculos = await Vehiculo.getByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: vehiculos
    });
  } catch (error) {
    console.error('Error al obtener vehículos del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener vehículos del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo vehículo
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createVehiculo = async (req, res) => {
  try {
    const { placa, marca, modelo, color } = req.body;
    const id_usuario = req.user.id;
    
    // Validar datos requeridos
    if (!placa) {
      return res.status(400).json({
        success: false,
        message: 'La placa es requerida'
      });
    }
    
    // Verificar si ya existe un vehículo con esa placa
    const existingVehiculo = await Vehiculo.findByPlaca(placa);
    if (existingVehiculo) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un vehículo registrado con esa placa'
      });
    }
    
    // Crear vehículo
    const vehiculoData = {
      id_usuario,
      placa,
      marca,
      modelo,
      color
    };
    
    const nuevoVehiculo = await Vehiculo.create(vehiculoData);
    
    res.status(201).json({
      success: true,
      message: 'Vehículo registrado exitosamente',
      data: nuevoVehiculo
    });
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear vehículo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un vehículo
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const { marca, modelo, color } = req.body;
    
    // Verificar si el vehículo existe
    const existingVehiculo = await Vehiculo.getById(id);
    if (!existingVehiculo) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }
    
    // Verificar si el usuario es propietario del vehículo o administrador
    if (existingVehiculo.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar este vehículo'
      });
    }
    
    // Actualizar vehículo
    const vehiculoData = {};
    if (marca) vehiculoData.marca = marca;
    if (modelo) vehiculoData.modelo = modelo;
    if (color) vehiculoData.color = color;
    
    const updatedVehiculo = await Vehiculo.update(id, vehiculoData);
    
    res.status(200).json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: updatedVehiculo
    });
  } catch (error) {
    console.error('Error al actualizar vehículo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar vehículo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un vehículo (soft delete)
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const vehiculoId = parseInt(id, 10); // Asegurar que sea un número
    const motivo = req.body?.motivo || null; // Opcional: motivo de la baja
    
    console.log('[deleteVehiculo] ID del vehículo a eliminar:', vehiculoId, 'tipo:', typeof vehiculoId);
    console.log('[deleteVehiculo] Usuario que elimina:', req.user.id);
    console.log('[deleteVehiculo] Motivo:', motivo);
    
    if (isNaN(vehiculoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de vehículo inválido'
      });
    }
    
    // Verificar si el vehículo existe
    const existingVehiculo = await Vehiculo.getById(vehiculoId);
    console.log('[deleteVehiculo] Vehículo encontrado:', existingVehiculo);
    
    if (!existingVehiculo) {
      return res.status(404).json({
        success: false,
        message: 'Vehículo no encontrado'
      });
    }
    
    // Verificar si el usuario es propietario del vehículo o administrador
    if (existingVehiculo.id_usuario !== req.user.id && req.user.rol !== 'admin_general') {
      console.log('[deleteVehiculo] Permiso denegado. Usuario del vehículo:', existingVehiculo.id_usuario);
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar este vehículo'
      });
    }
    
    console.log('[deleteVehiculo] Ejecutando soft delete...');
    
    // Eliminar vehículo (soft delete)
    const result = await Vehiculo.delete(vehiculoId, req.user.id, motivo);
    
    console.log('[deleteVehiculo] Resultado:', result);
    
    res.status(200).json({
      success: true,
      message: 'Vehículo eliminado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('[deleteVehiculo] Error al eliminar vehículo:', error);
    console.error('[deleteVehiculo] Error message:', error.message);
    console.error('[deleteVehiculo] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar vehículo',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllVehiculos,
  getVehiculoById,
  getVehiculosByUserId,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo
};
