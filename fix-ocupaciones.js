const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'ocupacion.controller.js');
let content = fs.readFileSync(controllerPath, 'utf8');

// Encontrar y reemplazar la función getOcupacionesActivas
const oldFunction = /const getOcupacionesActivas = async \(req, res\) => \{[\s\S]*?^};$/m;

const newFunction = `const getOcupacionesActivas = async (req, res) => {
  const supabase = require('../config/supabase');
  const { id_parking } = req.query;

  console.log('getOcupacionesActivas - Parking:', id_parking);

  try {
    const { data, error } = await supabase
      .from('ocupacion')
      .select('id_ocupacion, hora_entrada, hora_salida, costo_total, id_reserva, id_usuario, id_espacio, id_vehiculo')
      .is('hora_salida', null)
      .order('hora_entrada', { ascending: false });

    if (error) throw error;

    const resultado = [];
    for (const ocu of data || []) {
      const { data: usuario } = await supabase.from('usuario').select('nombre, apellido').eq('id_usuario', ocu.id_usuario).single();
      const { data: espacio } = await supabase.from('espacio').select('numero_espacio, id_parking').eq('id_espacio', ocu.id_espacio).single();
      if (id_parking && espacio?.id_parking !== parseInt(id_parking)) continue;

      let vehiculo = null;
      if (ocu.id_vehiculo) {
        const { data: v } = await supabase.from('vehiculo').select('placa, marca, modelo, color').eq('id_vehiculo', ocu.id_vehiculo).single();
        vehiculo = v;
      } else if (ocu.id_reserva) {
        const { data: reserva } = await supabase.from('reserva').select('id_vehiculo').eq('id_reserva', ocu.id_reserva).single();
        if (reserva?.id_vehiculo) {
          const { data: v } = await supabase.from('vehiculo').select('placa, marca, modelo, color').eq('id_vehiculo', reserva.id_vehiculo').single();
          vehiculo = v;
        }
      }

      resultado.push({
        id_ocupacion: ocu.id_ocupacion,
        hora_entrada: ocu.hora_entrada,
        hora_salida: ocu.hora_salida,
        costo_total: ocu.costo_total,
        id_reserva: ocu.id_reserva,
        nombre_usuario: usuario ? \`\${usuario.nombre} \${usuario.apellido}\` : 'N/A',
        numero_espacio: espacio?.numero_espacio || 'N/A',
        placa: vehiculo?.placa || null,
        marca: vehiculo?.marca || null,
        modelo: vehiculo?.modelo || null,
        color: vehiculo?.color || null
      });
    }

    console.log('Total:', resultado.length);
    if (resultado.length > 0) console.log('Primera:', JSON.stringify(resultado[0], null, 2));

    return res.json({ success: true, data: resultado });

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ocupaciones activas',
      error: error.message
    });
  }
};`;

if (oldFunction.test(content)) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync(controllerPath, content, 'utf8');
  console.log('✅ Función getOcupacionesActivas actualizada exitosamente');
} else {
  console.log('❌ No se pudo encontrar la función');
}
