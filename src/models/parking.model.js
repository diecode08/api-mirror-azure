const supabase = require('../config/supabase');

class Parking {
  /**
   * Obtener todos los parkings
   * @returns {Promise<Array>} Lista de parkings
   */
  static async getAll() {
    console.log('Ejecutando consulta getAll en modelo Parking...');
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .is('deleted_at', null);
    
    if (error) {
      console.error('Error en consulta getAll:', error);
      throw error;
    }
    console.log('Datos obtenidos de getAll:', data);
    return data;
  }

  /**
   * Obtener parkings dados de baja (eliminados lógicamente)
   * @returns {Promise<Array>}
   */
  static async getDeleted() {
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .not('deleted_at', 'is', null);
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un parking por su ID sin filtrar por eliminado
   * @param {number} id
   * @returns {Promise<Object>}
   */
  static async getByIdAny(id) {
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .eq('id_parking', id)
      .single();
    if (error) throw error;
    return data;
  }

  

  /**
   * Obtener un parking por su ID
   * @param {number} id - ID del parking
   * @returns {Promise<Object>} Datos del parking
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .eq('id_parking', id)
      .is('deleted_at', null)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener parkings por ID de administrador
   * @param {string} adminId - ID del administrador
   * @returns {Promise<Array>} Lista de parkings administrados
   */
  static async getByAdminId(adminId) {
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .eq('id_admin', adminId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo parking
   * @param {Object} parkingData - Datos del parking
   * @returns {Promise<Object>} Parking creado
   */
  static async create(parkingData) {
    console.log('Ejecutando create en modelo Parking con datos:', parkingData);
    const { data, error } = await supabase
      .from('parking')
      .insert([parkingData])
      .select();
    
    if (error) {
      console.error('Error en create:', error);
      throw error;
    }
    console.log('Parking creado exitosamente:', data[0]);
    return data[0];
  }

  /**
   * Actualizar un parking existente
   * @param {number} id - ID del parking
   * @param {Object} parkingData - Datos actualizados del parking
   * @returns {Promise<Object>} Parking actualizado
   */
  static async update(id, parkingData) {
    const { data, error } = await supabase
      .from('parking')
      .update(parkingData)
      .eq('id_parking', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar un parking
   * @param {number} id - ID del parking
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('parking')
      .delete()
      .eq('id_parking', id);
    
    if (error) throw error;
    return true;
  }

  /**
   * Buscar parkings cercanos por coordenadas
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @param {number} radioKm - Radio de búsqueda en kilómetros
   * @returns {Promise<Array>} Lista de parkings cercanos
   */
  static async findNearby(lat, lng, radioKm = 5) {
    // Esta es una implementación simplificada. En producción, se recomienda usar PostGIS o similar
    // para búsquedas geoespaciales más eficientes.
    const { data, error } = await supabase
      .from('parking')
      .select('*')
      .is('deleted_at', null);
    
    if (error) throw error;
    
    // Filtrar parkings por distancia (fórmula de Haversine)
    return data.filter(parking => {
      const R = 6371; // Radio de la Tierra en km
      const dLat = this.toRad(parking.latitud - lat);
      const dLon = this.toRad(parking.longitud - lng);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRad(lat)) * Math.cos(this.toRad(parking.latitud)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c; // Distancia en km
      
      return d <= radioKm;
    });
  }

  /**
   * Convertir grados a radianes
   * @param {number} value - Valor en grados
   * @returns {number} Valor en radianes
   */
  static toRad(value) {
    return value * Math.PI / 180;
  }

  /**
   * Asignar administrador a un parking
   * @param {number} parkingId - ID del parking
   * @param {string} adminId - ID del administrador
   * @returns {Promise<Object>} Resultado de la asignación
   */
  static async assignAdmin(parkingId, adminId) {
    // Primero actualizar el parking con el nuevo administrador
    const { data: parkingData, error: parkingError } = await supabase
      .from('parking')
      .update({ id_admin: adminId })
      .eq('id_parking', parkingId)
      .select();
    
    if (parkingError) throw parkingError;

    // Luego crear la relación en usuario_parking
    const { data: userParkingData, error: userParkingError } = await supabase
      .from('usuario_parking')
      .insert([{
        id_usuario: adminId,
        id_parking: parkingId,
        rol_en_parking: 'admin_parking'
      }])
      .select();
    
    if (userParkingError) throw userParkingError;

    return { parking: parkingData[0], userParking: userParkingData[0] };
  }

  /**
   * Obtener parkings asignados a un usuario específico
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de parkings asignados
   */
  static async getParkingsByUserId(userId) {
    const { data, error } = await supabase
      .from('usuario_parking')
      .select(`
        *,
        parking:parking!inner(*)
      `)
      .eq('id_usuario', userId)
      .is('parking.deleted_at', null);
    
    if (error) throw error;
    return data;
  }

  /**
   * Eliminado lógico de un parking
   * @param {number} id - ID del parking
   * @param {string} userId - ID del usuario que elimina
   * @param {string} motivo - Motivo de baja
   * @returns {Promise<Object>} Parking actualizado
   */
  static async softDelete(id, userId, motivo = null) {
    const { data, error } = await supabase
      .from('parking')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        motivo_baja: motivo || null,
      })
      .eq('id_parking', id)
      .select();
    if (error) throw error;
    return data[0];
  }

  /**
   * Restaurar un parking dado de baja
   * @param {number} id
   * @returns {Promise<Object>}
   */
  static async restore(id) {
    const { data, error } = await supabase
      .from('parking')
      .update({
        deleted_at: null,
        deleted_by: null,
        motivo_baja: null,
      })
      .eq('id_parking', id)
      .select();
    if (error) throw error;
    return data[0];
  }

  /**
   * Verificar si un usuario es administrador de un parking específico
   * @param {string} userId - ID del usuario
   * @param {number} parkingId - ID del parking
   * @returns {Promise<boolean>} True si es administrador
   */
  static async isUserAdminOfParking(userId, parkingId) {
    const { data, error } = await supabase
      .from('usuario_parking')
      .select('*')
      .eq('id_usuario', userId)
      .eq('id_parking', parkingId)
      .eq('rol_en_parking', 'admin_parking')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
}

module.exports = Parking;