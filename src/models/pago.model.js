const supabase = require('../config/supabase');

class Pago {
  /**
   * Obtener todos los pagos
   * @returns {Promise<Array>} Lista de pagos
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Pago')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un pago por su ID
   * @param {number} id - ID del pago
   * @returns {Promise<Object>} Datos del pago
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Pago')
      .select('*')
      .eq('id_pago', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener pagos por ID de ocupación
   * @param {number} ocupacionId - ID de la ocupación
   * @returns {Promise<Array>} Lista de pagos de la ocupación
   */
  static async getByOcupacionId(ocupacionId) {
    const { data, error } = await supabase
      .from('Pago')
      .select('*')
      .eq('id_ocupacion', ocupacionId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear un nuevo pago
   * @param {Object} pagoData - Datos del pago
   * @returns {Promise<Object>} Pago creado
   */
  static async create(pagoData) {
    const { data, error } = await supabase
      .from('Pago')
      .insert([pagoData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar un pago existente
   * @param {number} id - ID del pago
   * @param {Object} pagoData - Datos actualizados del pago
   * @returns {Promise<Object>} Pago actualizado
   */
  static async update(id, pagoData) {
    const { data, error } = await supabase
      .from('Pago')
      .update(pagoData)
      .eq('id_pago', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar el estado de un pago
   * @param {number} id - ID del pago
   * @param {string} estado - Nuevo estado ('pendiente', 'completado', 'cancelado')
   * @returns {Promise<Object>} Pago actualizado
   */
  static async updateEstado(id, estado) {
    return this.update(id, { estado });
  }

  /**
   * Eliminar un pago
   * @param {number} id - ID del pago
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Pago')
      .delete()
      .eq('id_pago', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Pago;