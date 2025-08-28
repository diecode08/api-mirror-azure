const supabase = require('../config/supabase');

class Reserva {
  /**
   * Obtener todas las reservas
   * @returns {Promise<Array>} Lista de reservas
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('Reserva')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener una reserva por su ID
   * @param {number} id - ID de la reserva
   * @returns {Promise<Object>} Datos de la reserva
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('Reserva')
      .select('*')
      .eq('id_reserva', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener reservas por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de reservas del usuario
   */
  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('Reserva')
      .select('*')
      .eq('id_usuario', userId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener reservas por ID de espacio
   * @param {number} espacioId - ID del espacio
   * @returns {Promise<Array>} Lista de reservas del espacio
   */
  static async getByEspacioId(espacioId) {
    const { data, error } = await supabase
      .from('Reserva')
      .select('*')
      .eq('id_espacio', espacioId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Verificar disponibilidad de un espacio en un rango de tiempo
   * @param {number} espacioId - ID del espacio
   * @param {Date} horaInicio - Hora de inicio
   * @param {Date} horaFin - Hora de fin
   * @returns {Promise<boolean>} true si está disponible, false si no
   */
  static async verificarDisponibilidad(espacioId, horaInicio, horaFin) {
    const { data, error } = await supabase
      .from('Reserva')
      .select('*')
      .eq('id_espacio', espacioId)
      .or(`hora_inicio.lte.${horaFin},hora_fin.gte.${horaInicio}`)
      .not('estado', 'eq', 'cancelada');
    
    if (error) throw error;
    return data.length === 0;
  }

  /**
   * Crear una nueva reserva
   * @param {Object} reservaData - Datos de la reserva
   * @returns {Promise<Object>} Reserva creada
   */
  static async create(reservaData) {
    const { data, error } = await supabase
      .from('Reserva')
      .insert([reservaData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar una reserva existente
   * @param {number} id - ID de la reserva
   * @param {Object} reservaData - Datos actualizados de la reserva
   * @returns {Promise<Object>} Reserva actualizada
   */
  static async update(id, reservaData) {
    const { data, error } = await supabase
      .from('Reserva')
      .update(reservaData)
      .eq('id_reserva', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar el estado de una reserva
   * @param {number} id - ID de la reserva
   * @param {string} estado - Nuevo estado ('pendiente', 'confirmada', 'cancelada', 'completada')
   * @returns {Promise<Object>} Reserva actualizada
   */
  static async updateEstado(id, estado) {
    return this.update(id, { estado });
  }

  /**
   * Eliminar una reserva
   * @param {number} id - ID de la reserva
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('Reserva')
      .delete()
      .eq('id_reserva', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Reserva;