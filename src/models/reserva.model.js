const supabase = require('../config/supabase');

class Reserva {
  /**
   * Obtener todas las reservas
   * @returns {Promise<Array>} Lista de reservas
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('reserva')
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
      .from('reserva')
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
      .from('reserva')
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
      .from('reserva')
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
  static async verificarDisponibilidad(espacioId, horaInicio, horaFin, excluirReservaId) {
    // Normalizar fechas a ISO string
    const inicioIso = (horaInicio instanceof Date) ? horaInicio.toISOString() : String(horaInicio);
    const finIso = (horaFin instanceof Date) ? horaFin.toISOString() : String(horaFin);

    // Regla de solapamiento correcta:
    // Existe conflicto si: (reserva.hora_inicio < nueva_hora_fin) AND (reserva.hora_fin > nueva_hora_inicio)
    // Considerar solo reservas que efectivamente bloquean el espacio: pendiente | confirmada | activa
    let query = supabase
      .from('reserva')
      .select('id_reserva, hora_inicio, hora_fin, estado')
      .eq('id_espacio', espacioId)
      .in('estado', ['pendiente','confirmada','activa'])
      .lt('hora_inicio', finIso)
      .gt('hora_fin', inicioIso);

    if (excluirReservaId) {
      query = query.neq('id_reserva', excluirReservaId);
    }

    const { data, error } = await query;

    if (error) throw error;
    // Disponible si NO hay solapamientos
    return (data || []).length === 0;
  }

  /**
   * Crear una nueva reserva
   * @param {Object} reservaData - Datos de la reserva
   * @returns {Promise<Object>} Reserva creada
   */
  static async create(reservaData) {
    const { data, error } = await supabase
      .from('reserva')
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
      .from('reserva')
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
      .from('reserva')
      .delete()
      .eq('id_reserva', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = Reserva;