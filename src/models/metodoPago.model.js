const supabase = require('../config/supabase');

class MetodoPago {
  /**
   * Obtener todos los métodos de pago
   * @returns {Promise<Array>} Lista de métodos de pago
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('MetodoPago')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un método de pago por su ID
   * @param {number} id - ID del método de pago
   * @returns {Promise<Object>} Datos del método de pago
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('MetodoPago')
      .select('*')
      .eq('id_metodo', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo método de pago
   * @param {Object} metodoData - Datos del método de pago
   * @returns {Promise<Object>} Método de pago creado
   */
  static async create(metodoData) {
    const { data, error } = await supabase
      .from('MetodoPago')
      .insert([metodoData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar un método de pago existente
   * @param {number} id - ID del método de pago
   * @param {Object} metodoData - Datos actualizados del método de pago
   * @returns {Promise<Object>} Método de pago actualizado
   */
  static async update(id, metodoData) {
    const { data, error } = await supabase
      .from('MetodoPago')
      .update(metodoData)
      .eq('id_metodo', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar un método de pago
   * @param {number} id - ID del método de pago
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('MetodoPago')
      .delete()
      .eq('id_metodo', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = MetodoPago;