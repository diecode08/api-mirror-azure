const supabase = require('../config/supabase');
const Pago = require('../models/pago.model');
const Ocupacion = require('../models/ocupacion.model');

// Helper: calcula monto y minutos basados en hora_entrada y ahora
async function calcularMontoOcupacion(ocupacion) {
  const { data: espacio } = await supabase
    .from('espacio')
    .select('id_parking')
    .eq('id_espacio', ocupacion.id_espacio)
    .single();

  const { data: parking } = await supabase
    .from('parking')
    .select('tarifa_hora, tarifa_base, nombre')
    .eq('id_parking', espacio.id_parking)
    .single();

  const entrada = new Date(ocupacion.hora_entrada);
  const ahora = new Date();
  const minutos = Math.max(1, Math.floor((ahora - entrada) / 60000));

  let monto = 0;
  if (parking?.tarifa_hora) {
    const horas = Math.ceil(minutos / 60);
    monto = horas * parking.tarifa_hora;
  } else if (parking?.tarifa_base) {
    monto = parking.tarifa_base;
  } else {
    const horas = Math.ceil(minutos / 60);
    monto = horas * 5; // default
  }

  return { monto: Number(monto), minutos, parkingNombre: parking?.nombre || '' };
}

// POST /ocupaciones/:id/solicitar-salida
async function solicitarSalida(req, res) {
  try {
    const { id } = req.params; // id ocupacion
    const id_usuario = req.user.id;

    const ocupacion = await Ocupacion.getById(id);
    if (!ocupacion) return res.status(404).json({ success: false, message: 'Ocupación no encontrada' });
    if (ocupacion.id_usuario !== id_usuario) {
      return res.status(403).json({ success: false, message: 'No puedes solicitar salida de esta ocupación' });
    }
    if (ocupacion.hora_salida_confirmada || ocupacion.hora_salida) {
      return res.status(400).json({ success: false, message: 'La ocupación ya tiene salida registrada' });
    }

    const { monto, minutos } = await calcularMontoOcupacion(ocupacion);

    // Marcar hora_salida_solicitada y crear/actualizar pago pendiente
    const { data: updated } = await supabase
      .from('ocupacion')
      .update({ hora_salida_solicitada: new Date().toISOString(), monto_calculado: monto, tiempo_total_minutos: minutos })
      .eq('id_ocupacion', id)
      .select()
      .single();

    // Reusar pago pendiente si existe; sino crear
    const { data: pagoPend } = await supabase
      .from('pago')
      .select('*')
      .eq('id_ocupacion', id)
      .in('estado', ['pendiente', 'pendiente_validacion'])
      .limit(1);

    let pago = pagoPend?.[0];
    if (pago) {
      pago = await Pago.update(pago.id_pago, { monto, estado: 'pendiente' });
    } else {
      pago = await Pago.create({ id_ocupacion: Number(id), monto, estado: 'pendiente' });
    }

    return res.status(200).json({ success: true, data: { id_pago: pago.id_pago, monto, tiempo_minutos: minutos } });
  } catch (err) {
    console.error('[solicitarSalida] error', err);
    return res.status(500).json({ success: false, message: 'Error al solicitar salida' });
  }
}

// PATCH /pagos/:id/validar
async function validarPago(req, res) {
  try {
    const { id } = req.params; // id pago
    const userId = req.user.id;

    // Verificación básica de rol/parking se deja a middleware; aquí solo marcamos completado
    const pago = await Pago.getById(id);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    if (pago.estado === 'COMPLETADO') return res.status(200).json({ success: true, data: pago });

    const actualizado = await Pago.update(pago.id_pago, {
      estado: 'COMPLETADO',
      validado_por: userId,
      validado_en: new Date().toISOString()
    });
    return res.status(200).json({ success: true, data: actualizado });
  } catch (err) {
    console.error('[validarPago] error', err);
    return res.status(500).json({ success: false, message: 'Error al validar pago' });
  }
}

// POST /pagos/:id/simular
async function simularPago(req, res) {
  try {
    const { id } = req.params;
    const pago = await Pago.getById(id);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    const actualizado = await Pago.update(pago.id_pago, { estado: 'COMPLETADO', es_simulado: true, validado_en: new Date().toISOString() });
    return res.status(200).json({ success: true, data: actualizado });
  } catch (err) {
    console.error('[simularPago] error', err);
    return res.status(500).json({ success: false, message: 'Error al simular pago' });
  }
}

// GET /pagos/:id/comprobante (virtual)
async function obtenerComprobante(req, res) {
  try {
    const { id } = req.params;
    const pago = await Pago.getById(id);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

    // Armar comprobante mínimo desde la DB
    const { data: ocupacion } = await supabase
      .from('ocupacion')
      .select('id_ocupacion, hora_entrada, hora_salida_confirmada, tiempo_total_minutos, id_espacio, id_usuario')
      .eq('id_ocupacion', pago.id_ocupacion)
      .single();

    const { data: espacio } = await supabase
      .from('espacio')
      .select('numero_espacio, id_parking')
      .eq('id_espacio', ocupacion.id_espacio)
      .single();

    const { data: parking } = await supabase
      .from('parking')
      .select('id_parking, nombre, direccion')
      .eq('id_parking', espacio.id_parking)
      .single();

    const { data: usuario } = await supabase
      .from('usuario')
      .select('nombre, apellido')
      .eq('id_usuario', ocupacion.id_usuario)
      .single();

    const comprobante = {
      id_pago: pago.id_pago,
      tipo: pago.tipo_comprobante || 'boleta',
      serie: pago.serie,
      numero: pago.numero,
      emitido_en: pago.emitido_en,
      monto: pago.monto,
      moneda: 'PEN',
      cliente: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
      parking: {
        nombre: parking?.nombre,
        direccion: parking?.direccion,
        espacio: espacio?.numero_espacio
      },
      ocupacion: {
        hora_entrada: ocupacion?.hora_entrada,
        hora_salida: ocupacion?.hora_salida_confirmada,
        minutos: ocupacion?.tiempo_total_minutos
      }
    };

    return res.status(200).json({ success: true, data: comprobante });
  } catch (err) {
    console.error('[obtenerComprobante] error', err);
    return res.status(500).json({ success: false, message: 'Error al obtener comprobante' });
  }
}

module.exports = { solicitarSalida, validarPago, simularPago, obtenerComprobante };
