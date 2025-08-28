const supabase = require('../config/supabase');

class Vehiculo {
  /**
   * Obtener todos los vehículos
   * @returns {Promise<Array>} Lista de vehículos
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Vehiculo')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un vehículo por su ID
   * @param {number} id - ID del vehículo
   * @returns {Promise<Object>} Datos del vehículo
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Vehiculo')
      .select('*')
      .eq('id_vehiculo', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener vehículos por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de vehículos del usuario
   */
  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('Vehiculo')
      .select('*')
      .eq('id_usuario', userId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Buscar vehículo por placa
   * @param {string} placa - Placa del vehículo
   * @returns {Promise<Object>} Vehículo encontrado
   */
  static async findByPlaca(placa) {
    const { data, error } = await supabase
      .from('Vehiculo')
      .select('*')
      .eq('placa', placa)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Crear un nuevo vehículo
   * @param {Object} vehiculoData - Datos del vehículo
   * @returns {Promise<Object>} Vehículo creado
   */
  static async create(vehiculoData) {
    const { data, error } = await supabase
      .from('Vehiculo')
      .insert([vehiculoData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar un vehículo existente
   * @param {number} id - ID del vehículo
   * @param {Object} vehiculoData - Datos actualizados del vehículo
   * @returns {Promise<Object>} Vehículo actualizado
   */
  static async update(id, vehiculoData) {
    const { data, error } = await supabase
      .from('Vehiculo')
      .update(vehiculoData)
      .eq('id_vehiculo', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar un vehículo
   * @param {number} id - ID del vehículo
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Vehiculo')
      .delete()
      .eq('id_vehiculo', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Vehiculo;