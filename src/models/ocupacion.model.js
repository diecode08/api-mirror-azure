const supabase = require('../config/supabase');

class Ocupacion {
  /**
   * Obtener todas las ocupaciones
   * @returns {Promise<Array>} Lista de ocupaciones
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener una ocupación por su ID
   * @param {number} id - ID de la ocupación
   * @returns {Promise<Object>} Datos de la ocupación
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*')
      .eq('id_ocupacion', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener ocupaciones por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de ocupaciones del usuario
   */
  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*')
      .eq('id_usuario', userId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener ocupaciones por ID de espacio
   * @param {number} espacioId - ID del espacio
   * @returns {Promise<Array>} Lista de ocupaciones del espacio
   */
  static async getByEspacioId(espacioId) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*')
      .eq('id_espacio', espacioId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener ocupaciones por ID de reserva
   * @param {number} reservaId - ID de la reserva
   * @returns {Promise<Object>} Ocupación asociada a la reserva
   */
  static async getByReservaId(reservaId) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*')
      .eq('id_reserva', reservaId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Obtener ocupaciones activas (sin hora de salida)
   * @returns {Promise<Array>} Lista de ocupaciones activas
   */
  static async getActivas() {
    const { data, error } = await supabase
      .from('Ocupacion')
      .select('*')
      .is('hora_salida', null);
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear una nueva ocupación
   * @param {Object} ocupacionData - Datos de la ocupación
   * @returns {Promise<Object>} Ocupación creada
   */
  static async create(ocupacionData) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .insert([ocupacionData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar una ocupación existente
   * @param {number} id - ID de la ocupación
   * @param {Object} ocupacionData - Datos actualizados de la ocupación
   * @returns {Promise<Object>} Ocupación actualizada
   */
  static async update(id, ocupacionData) {
    const { data, error } = await supabase
      .from('Ocupacion')
      .update(ocupacionData)
      .eq('id_ocupacion', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Registrar salida de un vehículo
   * @param {number} id - ID de la ocupación
   * @param {Date} horaSalida - Hora de salida
   * @param {number} costoTotal - Costo total de la ocupación
   * @returns {Promise<Object>} Ocupación actualizada
   */
  static async registrarSalida(id, horaSalida, costoTotal) {
    return this.update(id, { hora_salida: horaSalida, costo_total: costoTotal });
  }

  /**
   * Eliminar una ocupación
   * @param {number} id - ID de la ocupación
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Ocupacion')
      .delete()
      .eq('id_ocupacion', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Ocupacion;