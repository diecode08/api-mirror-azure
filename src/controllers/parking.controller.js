const Parking = require('../models/parking.model');
const Espacio = require('../models/espacio.model');

/**
 * Obtener todos los parkings
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllParkings = async (req, res) => {
  try {
    const parkings = await Parking.getAll();
    
    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    console.error('Error al obtener parkings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parkings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un parking por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getParkingById = async (req, res) => {
  try {
    const { id } = req.params;
    const parking = await Parking.getById(id);
    
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: parking
    });
  } catch (error) {
    console.error('Error al obtener parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener parkings por ID de administrador
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getParkingsByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;
    const parkings = await Parking.getByAdminId(adminId);
    
    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    console.error('Error al obtener parkings del administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parkings del administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Buscar parkings cercanos por coordenadas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const findNearbyParkings = async (req, res) => {
  try {
    const { latitud, longitud, distancia = 5 } = req.query; // distancia en km, por defecto 5km
    
    if (!latitud || !longitud) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren latitud y longitud para buscar parkings cercanos'
      });
    }
    
    const parkings = await Parking.findNearby(parseFloat(latitud), parseFloat(longitud), parseFloat(distancia));
    
    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    console.error('Error al buscar parkings cercanos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar parkings cercanos',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createParking = async (req, res) => {
  try {
    const { nombre, direccion, latitud, longitud, capacidad_total } = req.body;
    const id_admin = req.user.id;
    
    // Validar datos requeridos
    if (!nombre || !direccion || !latitud || !longitud || !capacidad_total) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: nombre, dirección, latitud, longitud y capacidad total'
      });
    }
    
    // Crear parking
    const parkingData = {
      nombre,
      direccion,
      latitud,
      longitud,
      capacidad_total,
      id_admin
    };
    
    const nuevoParking = await Parking.create(parkingData);
    
    // Crear espacios automáticamente según la capacidad total
    const espaciosPromises = [];
    for (let i = 1; i <= capacidad_total; i++) {
      const espacioData = {
        id_parking: nuevoParking.id_parking,
        numero_espacio: `E-${i.toString().padStart(3, '0')}`,
        estado: 'disponible'
      };
      espaciosPromises.push(Espacio.create(espacioData));
    }
    
    await Promise.all(espaciosPromises);
    
    res.status(201).json({
      success: true,
      message: 'Parking registrado exitosamente con todos sus espacios',
      data: nuevoParking
    });
  } catch (error) {
    console.error('Error al crear parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Actualizar un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateParking = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, latitud, longitud, capacidad_total } = req.body;
    
    // Verificar si el parking existe
    const existingParking = await Parking.getById(id);
    if (!existingParking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    if (existingParking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar este parking'
      });
    }
    
    // Actualizar parking
    const parkingData = {};
    if (nombre) parkingData.nombre = nombre;
    if (direccion) parkingData.direccion = direccion;
    if (latitud) parkingData.latitud = latitud;
    if (longitud) parkingData.longitud = longitud;
    
    // Si se modifica la capacidad, verificar que no sea menor a la actual
    if (capacidad_total) {
      if (capacidad_total < existingParking.capacidad_total) {
        return res.status(400).json({
          success: false,
          message: 'No se puede reducir la capacidad total del parking'
        });
      }
      
      parkingData.capacidad_total = capacidad_total;
      
      // Si aumenta la capacidad, crear nuevos espacios
      if (capacidad_total > existingParking.capacidad_total) {
        const espaciosActuales = await Espacio.getByParkingId(id);
        const nuevosEspacios = capacidad_total - existingParking.capacidad_total;
        
        const espaciosPromises = [];
        for (let i = 1; i <= nuevosEspacios; i++) {
          const numeroEspacio = `E-${(espaciosActuales.length + i).toString().padStart(3, '0')}`;
          const espacioData = {
            id_parking: id,
            numero_espacio: numeroEspacio,
            estado: 'disponible'
          };
          espaciosPromises.push(Espacio.create(espacioData));
        }
        
        await Promise.all(espaciosPromises);
      }
    }
    
    const updatedParking = await Parking.update(id, parkingData);
    
    res.status(200).json({
      success: true,
      message: 'Parking actualizado exitosamente',
      data: updatedParking
    });
  } catch (error) {
    console.error('Error al actualizar parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Eliminar un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteParking = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el parking existe
    const existingParking = await Parking.getById(id);
    if (!existingParking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    if (existingParking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar este parking'
      });
    }
    
    // Eliminar parking (los espacios se eliminarán en cascada por la restricción ON DELETE CASCADE)
    await Parking.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Parking eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getAllParkings,
  getParkingById,
  getParkingsByAdminId,
  findNearbyParkings,
  createParking,
  updateParking,
  deleteParking
};