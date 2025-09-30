const supabase = require('../config/supabase');

class Tarifa {
  /**
   * Obtener todas las tarifas
   * @returns {Promise<Array>} Lista de tarifas
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('tarifa')
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
      .from('tarifa')
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
      .from('tarifa')
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
    // Validar y convertir tipos de datos
    const validatedData = {
      id_parking: Number(tarifaData.id_parking),
      tipo: String(tarifaData.tipo),
      monto: Number(tarifaData.monto),
      condiciones: tarifaData.condiciones || null
    };
    console.log('[tarifa.model][create] Datos validados:', validatedData);

    const { data, error } = await supabase
      .from('tarifa')
      .insert([validatedData])
      .select();

    if (error) {
      console.error('[tarifa.model][create] Error de Supabase:', error);
      throw error;
    }
    console.log('[tarifa.model][create] Tarifa creada:', data[0]);
    return data[0];
  }

  /**
   * Actualizar una tarifa existente
   * @param {number} id - ID de la tarifa
   * @param {Object} tarifaData - Datos actualizados de la tarifa
   * @returns {Promise<Object>} Tarifa actualizada
   */
  static async update(id, tarifaData) {
    // Validar y convertir tipos de datos solo para campos que se están actualizando
    const validatedData = {};
    if (tarifaData.id_parking !== undefined) validatedData.id_parking = Number(tarifaData.id_parking);
    if (tarifaData.tipo !== undefined) validatedData.tipo = String(tarifaData.tipo);
    if (tarifaData.monto !== undefined) validatedData.monto = Number(tarifaData.monto);
    if (tarifaData.condiciones !== undefined) validatedData.condiciones = tarifaData.condiciones || null;

    console.log('[tarifa.model][update] ID:', id, 'Datos validados:', validatedData);

    const { data, error } = await supabase
      .from('tarifa')
      .update(validatedData)
      .eq('id_tarifa', id)
      .select();

    if (error) {
      console.error('[tarifa.model][update] Error de Supabase:', error);
      throw error;
    }
    console.log('[tarifa.model][update] Tarifa actualizada:', data[0]);
    return data[0];
  }

  /**
   * Eliminar una tarifa
   * @param {number} id - ID de la tarifa
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    console.log('[tarifa.model][delete] Eliminando tarifa ID:', id);
    const { error } = await supabase
      .from('tarifa')
      .delete()
      .eq('id_tarifa', id);

    if (error) {
      console.error('[tarifa.model][delete] Error de Supabase:', error);
      throw error;
    }
    console.log('[tarifa.model][delete] Tarifa eliminada exitosamente');
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
      .from('tarifa')
      .select('*')
      .eq('id_parking', parkingId)
      .eq('tipo', tipo)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}

module.exports = Tarifa;