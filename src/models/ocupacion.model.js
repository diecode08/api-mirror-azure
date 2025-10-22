const supabase = require('../config/supabase');

class Ocupacion {
  /**
   * Obtener todas las ocupaciones
   * @returns {Promise<Array>} Lista de ocupaciones
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
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
      .from('ocupacion')
      .delete()
      .eq('id_ocupacion', id);
    
    if (error) throw error;
    return true;
  }

  /**
   * Marcar entrada física al parking (llama a función SQL)
   * @param {number} id_reserva - ID de la reserva
   * @returns {Promise<number>} ID de la ocupación creada
   */
  static async marcarEntrada(id_reserva) {
    const { data, error } = await supabase
      .rpc('marcar_entrada_parking', { p_id_reserva: id_reserva });
    
    if (error) throw error;
    return data;
  }

  /**
   * Marcar salida física del parking (llama a función SQL)
   * @param {number} id_ocupacion - ID de la ocupación
   * @returns {Promise<Object>} Datos de costo y tiempo
   */
  static async marcarSalida(id_ocupacion) {
    const { data, error } = await supabase
      .rpc('marcar_salida_parking', { p_id_ocupacion: id_ocupacion });
    
    if (error) throw error;
    
    // La función SQL retorna un array con un objeto
    if (data && data.length > 0) {
      return {
        costo_calculado: data[0].costo_calculado,
        tiempo_total_horas: data[0].tiempo_total_horas
      };
    }
    
    return data;
  }

  /**
   * Obtener ocupación activa de un usuario (desde vista SQL)
   * @param {string} id_usuario - ID del usuario
   * @returns {Promise<Object|null>} Ocupación activa o null
   */
  static async getActivaByUserId(id_usuario) {
    // Puede haber múltiples ocupaciones "activas" por datos huérfanos.
    // Elegimos la más reciente por hora_entrada para el usuario.
    const { data, error } = await supabase
      .from('vista_ocupaciones_activas')
      .select('*')
      .eq('id_usuario', id_usuario)
      .order('hora_entrada', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Obtener historial de ocupaciones de un usuario (desde vista SQL)
   * @param {string} id_usuario - ID del usuario
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Historial de ocupaciones
   */
  static async getHistorialByUserId(id_usuario, limit = 50) {
    const { data, error } = await supabase
      .from('vista_historial_ocupaciones')
      .select('*')
      .eq('id_usuario', id_usuario)
      .order('hora_salida', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener historial de ocupaciones de un parking (finalizadas)
   * @param {string} id_parking - ID del parking
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Historial de ocupaciones con tiempo_total
   */
  static async getHistorialByParkingId(id_parking, limit = 100) {
    const { data, error } = await supabase
      .from('ocupacion')
      .select(`
        id_ocupacion,
        id_usuario,
        id_espacio,
        id_vehiculo,
        hora_entrada,
        hora_salida,
        tiempo_total_minutos,
        monto_calculado,
        espacio!inner(
          id_parking,
          numero_espacio
        )
      `)
      .eq('espacio.id_parking', id_parking)
      .not('hora_salida', 'is', null)
      .not('tiempo_total_minutos', 'is', null)
      .order('hora_salida', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    // Mapear para aplanar el objeto y renombrar tiempo_total_minutos a tiempo_total
    return (data || []).map(item => ({
      ...item,
      tiempo_total: item.tiempo_total_minutos,
      numero_espacio: item.espacio?.numero_espacio
    }));
  }
}

module.exports = Ocupacion;
