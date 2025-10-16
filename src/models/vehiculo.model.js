const supabase = require('../config/supabase');

/**
 * Verificar si las columnas de soft delete existen
 */
let softDeleteEnabled = null;

async function checkSoftDeleteColumns() {
  if (softDeleteEnabled !== null) return softDeleteEnabled;
  
  try {
    const { error } = await supabase
      .from('vehiculo')
      .select('deleted_at')
      .limit(0);
    
    softDeleteEnabled = !error;
    if (!softDeleteEnabled) {
      console.warn('⚠️ Las columnas de soft delete no existen en la tabla vehiculo.');
      console.warn('⚠️ Por favor ejecuta el script: api-nodejs-parking/migrations/add-soft-delete-vehiculo.sql');
    }
    return softDeleteEnabled;
  } catch (err) {
    softDeleteEnabled = false;
    return false;
  }
}

class Vehiculo {
  /**
   * Obtener todos los vehículos
   * @returns {Promise<Array>} Lista de vehículos
   */
  static async getAll() {
    const hasSoftDelete = await checkSoftDeleteColumns();
    
    let query = supabase.from('vehiculo').select('*');
    
    if (hasSoftDelete) {
      query = query.is('deleted_at', null); // Solo vehículos no eliminados
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un vehículo por su ID
   * @param {number} id - ID del vehículo
   * @returns {Promise<Object>} Datos del vehículo
   */
  static async getById(id) {
    const hasSoftDelete = await checkSoftDeleteColumns();
    
    let query = supabase
      .from('vehiculo')
      .select('*')
      .eq('id_vehiculo', id);
    
    if (hasSoftDelete) {
      query = query.is('deleted_at', null); // Solo vehículos no eliminados
    }
    
    const { data, error } = await query.single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener vehículos por ID de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de vehículos del usuario
   */
  static async getByUserId(userId) {
    const hasSoftDelete = await checkSoftDeleteColumns();
    
    let query = supabase
      .from('vehiculo')
      .select('*')
      .eq('id_usuario', userId);
    
    if (hasSoftDelete) {
      query = query.is('deleted_at', null); // Solo vehículos no eliminados
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  /**
   * Buscar vehículo por placa
   * @param {string} placa - Placa del vehículo
   * @returns {Promise<Object>} Vehículo encontrado
   */
  static async findByPlaca(placa) {
    const hasSoftDelete = await checkSoftDeleteColumns();
    
    let query = supabase
      .from('vehiculo')
      .select('*')
      .eq('placa', placa);
    
    if (hasSoftDelete) {
      query = query.is('deleted_at', null); // Solo vehículos no eliminados
    }
    
    const { data, error } = await query.single();
    
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
      .from('vehiculo')
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
      .from('vehiculo')
      .update(vehiculoData)
      .eq('id_vehiculo', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar un vehículo (soft delete o hard delete según disponibilidad)
   * @param {number} id - ID del vehículo
   * @param {string} deletedBy - ID del usuario que elimina
   * @param {string} motivo - Motivo de la baja (opcional)
   * @returns {Promise<Object>} Vehículo actualizado o resultado de eliminación
   */
  static async delete(id, deletedBy, motivo = null) {
    console.log('[Vehiculo.delete] Iniciando eliminación. ID:', id, 'deletedBy:', deletedBy);
    
    // Intentar soft delete primero
    try {
      const updateData = {
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        motivo_baja: motivo
      };
      
      console.log('[Vehiculo.delete] Datos de actualización:', updateData);
      
      const { data, error } = await supabase
        .from('vehiculo')
        .update(updateData)
        .eq('id_vehiculo', id)
        .select();
      
      console.log('[Vehiculo.delete] Resultado de Supabase - data:', data, 'error:', error);
      
      // Si no hay error, el soft delete funcionó
      if (!error) {
        console.log('[Vehiculo.delete] Soft delete exitoso');
        return data[0];
      }
      
      // Si el error es por columna inexistente, hacer hard delete
      if (error.code === '42703' || error.message.includes('column') || error.message.includes('deleted_at')) {
        console.warn('⚠️ Columnas de soft delete no existen. Ejecutando hard delete.');
        const { error: deleteError } = await supabase
          .from('vehiculo')
          .delete()
          .eq('id_vehiculo', id);
        
        if (deleteError) {
          console.error('[Vehiculo.delete] Error en hard delete:', deleteError);
          throw deleteError;
        }
        console.log('[Vehiculo.delete] Hard delete exitoso');
        return { id_vehiculo: id, deleted: true };
      }
      
      // Si es otro tipo de error, lanzarlo
      console.error('[Vehiculo.delete] Error inesperado:', error);
      throw error;
    } catch (error) {
      console.error('[Vehiculo.delete] Excepción capturada:', error);
      throw error;
    }
  }

  /**
   * Restaurar un vehículo eliminado
   * @param {number} id - ID del vehículo
   * @returns {Promise<Object>} Vehículo restaurado
   */
  static async restore(id) {
    const { data, error } = await supabase
      .from('vehiculo')
      .update({
        deleted_at: null,
        deleted_by: null,
        motivo_baja: null
      })
      .eq('id_vehiculo', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }
}

module.exports = Vehiculo;