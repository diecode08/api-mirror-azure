const supabase = require('../config/supabase');

class Usuario {
  /**
   * Obtener todos los usuarios
   * @returns {Promise<Array>} Lista de usuarios
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * Obtener un usuario por su ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Datos del usuario
   */
  static async getById(id) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('id_usuario', id)
      .single();
    
    // Si no hay filas, Supabase devuelve PGRST116 con .single()
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  }

  /**
   * Crear un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Usuario creado
   */
  static async create(userData) {
    const { data, error } = await supabase
      .from('usuario')
      .insert([userData])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Actualizar un usuario existente
   * @param {string} id - ID del usuario
   * @param {Object} userData - Datos actualizados del usuario
   * @returns {Promise<Object>} Usuario actualizado
   */
  static async update(id, userData) {
    const { data, error } = await supabase
      .from('usuario')
      .update(userData)
      .eq('id_usuario', id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  /**
   * Eliminar un usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<boolean>} Resultado de la operación
   */
  static async delete(id) {
    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id_usuario', id);
    
    if (error) throw error;
    return true;
  }

  /**
   * Buscar usuarios por rol
   * @param {string} rol - Rol a buscar
   * @returns {Promise<Array>} Lista de usuarios con el rol especificado
   */
  static async findByRol(rol) {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('rol', rol);
    
    if (error) throw error;
    return data;
  }
}

module.exports = Usuario;