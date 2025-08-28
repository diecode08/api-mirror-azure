const supabase = require('../config/supabase');

class Notificacion {
  /**
   * Obtener todas las notificaciones
   * @returns {Promise<Array>} Lista de notificaciones
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Notificacion')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener una notificación por su ID
   * @param {number} id - ID de la notificación
   * @returns {Promise<Object>} Datos de la notificación
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Notificacion')
      .select('*')
      .eq('id_notificacion', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener notificaciones por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de notificaciones del usuario
   */
  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('Notificacion')
      .select('*')
      .eq('id_usuario', userId)
      .order('fecha_envio', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener notificaciones no leídas por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de notificaciones no leídas
   */
  static async getNoLeidasByUserId(userId) {
    const { data, error } = await supabase
      .from('Notificacion')
      .select('*')
      .eq('id_usuario', userId)
      .eq('estado', 'no_leido')
      .order('fecha_envio', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  /**
   * Crear una nueva notificación
   * @param {Object} notificacionData - Datos de la notificación
   * @returns {Promise<Object>} Notificación creada
   */
  static async create(notificacionData) {
    const { data, error } = await supabase
      .from('Notificacion')
      .insert([notificacionData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar una notificación existente
   * @param {number} id - ID de la notificación
   * @param {Object} notificacionData - Datos actualizados de la notificación
   * @returns {Promise<Object>} Notificación actualizada
   */
  static async update(id, notificacionData) {
    const { data, error } = await supabase
      .from('Notificacion')
      .update(notificacionData)
      .eq('id_notificacion', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Marcar una notificación como leída
   * @param {number} id - ID de la notificación
   * @returns {Promise<Object>} Notificación actualizada
   */
  static async marcarComoLeida(id) {
    return this.update(id, { estado: 'leido' });
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async marcarTodasComoLeidas(userId) {
    const { error } = await supabase
      .from('Notificacion')
      .update({ estado: 'leido' })
      .eq('id_usuario', userId)
      .eq('estado', 'no_leido');
    
    if (error) throw error;
    return true;
  }

  /**
   * Eliminar una notificación
   * @param {number} id - ID de la notificación
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Notificacion')
      .delete()
      .eq('id_notificacion', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Notificacion;