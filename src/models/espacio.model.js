
const supabase = require('../config/supabase');

class Espacio {
  /**
   * Obtener todos los espacios
   * @returns {Promise<Array>} Lista de espacios
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('espacio')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un espacio por su ID
   * @param {number} id - ID del espacio
   * @returns {Promise<Object>} Datos del espacio
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('espacio')
      .select('*')
      .eq('id_espacio', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener espacios por ID de parking
   * @param {number} parkingId - ID del parking
   * @returns {Promise<Array>} Lista de espacios del parking
   */
  static async getByParkingId(parkingId) {
    const { data, error } = await supabase
      .from('espacio')
      .select('*')
      .eq('id_parking', parkingId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener espacios disponibles por ID de parking
   * @param {number} parkingId - ID del parking
   * @returns {Promise<Array>} Lista de espacios disponibles
   */
  static async getAvailableByParkingId(parkingId) {
    const { data, error } = await supabase
      .from('espacio')
      .select('*')
      .eq('id_parking', parkingId)
      .eq('estado', 'disponible');
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo espacio
   * @param {Object} espacioData - Datos del espacio
   * @returns {Promise<Object>} Espacio creado
   */
  static async create(espacioData) {
    const { data, error } = await supabase
      .from('espacio')
      .insert([espacioData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar un espacio existente
   * @param {number} id - ID del espacio
   * @param {Object} espacioData - Datos actualizados del espacio
   * @returns {Promise<Object>} Espacio actualizado
   */
  static async update(id, espacioData) {
    const { data, error } = await supabase
      .from('espacio')
      .update(espacioData)
      .eq('id_espacio', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar el estado de un espacio
   * @param {number} id - ID del espacio
   * @param {string} estado - Nuevo estado ('disponible', 'ocupado', 'reservado', 'mantenimiento')
   * @returns {Promise<Object>} Espacio actualizado
   */
  static async updateEstado(id, estado) {
    return this.update(id, { estado });
  }

  /**
   * Eliminar un espacio
   * @param {number} id - ID del espacio
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('espacio')
      .delete()
      .eq('id_espacio', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Espacio;