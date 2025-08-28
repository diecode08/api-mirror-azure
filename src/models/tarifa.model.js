const supabase = require('../config/supabase');

class Tarifa {
  /**
   * Obtener todas las tarifas
   * @returns {Promise<Array>} Lista de tarifas
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Tarifa')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener una tarifa por su ID
   * @param {number} id - ID de la tarifa
   * @returns {Promise<Object>} Datos de la tarifa
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Tarifa')
      .select('*')
      .eq('id_tarifa', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener tarifas por ID de parking
   * @param {number} parkingId - ID del parking
   * @returns {Promise<Array>} Lista de tarifas del parking
   */
  static async getByParkingId(parkingId) {
    const { data, error } = await supabase
      .from('Tarifa')
      .select('*')
      .eq('id_parking', parkingId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear una nueva tarifa
   * @param {Object} tarifaData - Datos de la tarifa
   * @returns {Promise<Object>} Tarifa creada
   */
  static async create(tarifaData) {
    const { data, error } = await supabase
      .from('Tarifa')
      .insert([tarifaData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar una tarifa existente
   * @param {number} id - ID de la tarifa
   * @param {Object} tarifaData - Datos actualizados de la tarifa
   * @returns {Promise<Object>} Tarifa actualizada
   */
  static async update(id, tarifaData) {
    const { data, error } = await supabase
      .from('Tarifa')
      .update(tarifaData)
      .eq('id_tarifa', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar una tarifa
   * @param {number} id - ID de la tarifa
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Tarifa')
      .delete()
      .eq('id_tarifa', id);
    
    if (error) throw error;
    return true;
  }

  /**
   * Obtener tarifa por tipo y parking
   * @param {number} parkingId - ID del parking
   * @param {string} tipo - Tipo de tarifa
   * @returns {Promise<Object>} Tarifa encontrada
   */
  static async getByTipo(parkingId, tipo) {
    const { data, error } = await supabase
      .from('Tarifa')
      .select('*')
      .eq('id_parking', parkingId)
      .eq('tipo', tipo)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}

module.exports = Tarifa;