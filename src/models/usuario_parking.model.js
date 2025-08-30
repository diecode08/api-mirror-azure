const supabase = require('../config/supabase');

class UsuarioParking {
  static async getByUser(userId) {
    const { data, error } = await supabase
      .from('usuario_parking')
      .select('*')
      .eq('id_usuario', userId);
    if (error) throw error;
    return data;
  }

  static async getParkingIdsByUser(userId) {
    const { data, error } = await supabase
      .from('usuario_parking')
      .select('id_parking')
      .eq('id_usuario', userId);
    if (error) throw error;
    return data.map(r => r.id_parking);
  }

  static async hasRole(userId, parkingId, roles) {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const { data, error } = await supabase
      .from('usuario_parking')
      .select('rol_en_parking')
      .eq('id_usuario', userId)
      .eq('id_parking', parkingId)
      .in('rol_en_parking', rolesArray)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  static async add(userId, parkingId, rol) {
    const { data, error } = await supabase
      .from('usuario_parking')
      .insert([{ id_usuario: userId, id_parking: parkingId, rol_en_parking: rol }])
      .select();
    if (error) throw error;
    return data[0];
  }

  static async addBulk(userId, assignments) {
    const rows = assignments.map(a => ({ id_usuario: userId, id_parking: a.id_parking, rol_en_parking: a.rol_en_parking }));
    const { data, error } = await supabase
      .from('usuario_parking')
      .insert(rows)
      .select();
    if (error) throw error;
    return data;
  }

  static async remove(userId, parkingId) {
    const { error } = await supabase
      .from('usuario_parking')
      .delete()
      .eq('id_usuario', userId)
      .eq('id_parking', parkingId);
    if (error) throw error;
    return true;
  }
}

module.exports = UsuarioParking;
