const supabase = require('../config/supabase');

class Parking {
  /**
   * Obtener todos los parkings
   * @returns {Promise<Array>} Lista de parkings
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('parking')
      .select('*');
    
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
      .eq('id_admin', adminId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo parking
   * @param {Object} parkingData - Datos del parking
   * @returns {Promise<Object>} Parking creado
   */
  static async create(parkingData) {
    const { data, error } = await supabase
      .from('parking')
      .insert([parkingData])
      .select();
    
    if (error) throw error;
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
      .from('Parking')
      .select('*');
    
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
}

module.exports = Parking;