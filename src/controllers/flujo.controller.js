const supabase = require('../config/supabase');
const Pago = require('../models/pago.model');
const Ocupacion = require('../models/ocupacion.model');
const Tarifa = require('../models/tarifa.model');
const Reserva = require('../models/reserva.model');

// Helper: calcula monto según tipo de tarifa
function calcularSegunTipoTarifa(tarifa, minutos) {
  const tipo = (tarifa.tipo || '').toLowerCase();
  const monto = parseFloat(tarifa.monto);
  
  switch(tipo) {
    case 'hora':
      const horas = Math.ceil(minutos / 60);
      return horas * monto;
      
    case 'medio dia': // 12 horas
      if (minutos <= 720) return monto;
      const horasExtraMedioDia = Math.ceil((minutos - 720) / 60);
      return monto + (horasExtraMedioDia * (monto / 12));
      
    case 'dia': // 24 horas
      if (minutos <= 1440) return monto;
      const diasExtra = Math.ceil((minutos - 1440) / 1440);
      return monto + (diasExtra * monto);
      
    case 'semana': // 7 días (10080 minutos)
      if (minutos <= 10080) return monto;
      const semanasExtra = Math.ceil((minutos - 10080) / 10080);
      return monto + (semanasExtra * monto);
      
    case 'mes': // 30 días (43200 minutos)
      if (minutos <= 43200) return monto;
      const mesesExtra = Math.ceil((minutos - 43200) / 43200);
      return monto + (mesesExtra * monto);
      
    default:
      // Por defecto, cálculo horario
      const hrs = Math.ceil(minutos / 60);
      return hrs * monto;
  }
}

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

  // Intentar obtener tarifa seleccionada de la reserva
  let tarifaSeleccionada = null;
  if (ocupacion.id_reserva) {
    const reserva = await Reserva.getById(ocupacion.id_reserva);
    if (reserva?.id_tarifa) {
      tarifaSeleccionada = await Tarifa.getById(reserva.id_tarifa);
    }
  }
  
  // Si hay tarifa seleccionada y está activa, usarla
  if (tarifaSeleccionada && !tarifaSeleccionada.deleted_at) {
    const monto = calcularSegunTipoTarifa(tarifaSeleccionada, minutos);
    return { monto: Number(monto), minutos, parkingNombre: parking?.nombre || '' };
  }
  
  // Fallback 1: Buscar tarifa 'hora' del parking
  const tarifaHora = await Tarifa.getByTipo(espacio.id_parking, 'hora');
  if (tarifaHora && !tarifaHora.deleted_at) {
    const horas = Math.ceil(minutos / 60);
    const monto = horas * tarifaHora.monto;
    return { monto: Number(monto), minutos, parkingNombre: parking?.nombre || '' };
  }

  // Fallback 2: Usar tarifa_hora del parking (legacy)
  let monto = 0;
  if (parking?.tarifa_hora) {
    const horas = Math.ceil(minutos / 60);
    monto = horas * parking.tarifa_hora;
  } else if (parking?.tarifa_base) {
    monto = parking.tarifa_base;
  } else {
    const horas = Math.ceil(minutos / 60);
    monto = horas * 5; // default S/ 5/hora
  }

  return { monto: Number(monto), minutos, parkingNombre: parking?.nombre || '' };
}

// GET /pagos/pendientes?id_parking=X
async function listarPagosPendientes(req, res) {
  try {
    const { id_parking } = req.query;
    if (!id_parking) {
      return res.status(400).json({ success: false, message: 'Se requiere id_parking como query param' });
    }

    // Obtener pagos pendientes con información de ocupación
    const { data, error } = await supabase
      .from('vista_pagos_pendientes_parking')
      .select('*')
      .eq('id_parking', id_parking)
      .order('hora_salida_solicitada', { ascending: false });

    if (error) {
      console.error('[listarPagosPendientes] error en vista:', error);
      // Fallback: consulta manual
      const { data: pagos } = await supabase
        .from('pago')
        .select(`
          id_pago,
          monto,
          estado,
          id_ocupacion,
          ocupacion!inner(
            id_ocupacion,
            hora_salida_solicitada,
            tiempo_total_minutos,
            monto_calculado,
            id_usuario,
            id_espacio,
            id_reserva,
            usuario:id_usuario(nombre, apellido),
            espacio:id_espacio(numero_espacio, id_parking),
            reserva:id_reserva(id_vehiculo, vehiculo:id_vehiculo(placa, marca, modelo))
          )
        `)
        .in('estado', ['PENDIENTE', 'pendiente', 'pendiente_validacion']);

      const filtrados = pagos?.filter(p => p.ocupacion?.espacio?.id_parking === Number(id_parking)) || [];
      const formatted = filtrados.map(p => ({
        id_pago: p.id_pago,
        monto: p.monto,
        estado: p.estado,
        id_ocupacion: p.id_ocupacion,
        hora_salida_solicitada: p.ocupacion?.hora_salida_solicitada,
        tiempo_total_minutos: p.ocupacion?.tiempo_total_minutos,
        monto_calculado: p.ocupacion?.monto_calculado,
        nombre_usuario: p.ocupacion?.usuario ? `${p.ocupacion.usuario.nombre} ${p.ocupacion.usuario.apellido}` : null,
        numero_espacio: p.ocupacion?.espacio?.numero_espacio,
        placa: p.ocupacion?.reserva?.vehiculo?.placa,
        marca: p.ocupacion?.reserva?.vehiculo?.marca,
        modelo: p.ocupacion?.reserva?.vehiculo?.modelo
      }));

      return res.status(200).json({ success: true, data: formatted });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[listarPagosPendientes] error', err);
    return res.status(500).json({ success: false, message: 'Error al listar pagos pendientes' });
  }
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

    // Si ya existe un pago pendiente o ya fue solicitada la salida, devolver datos actuales (idempotente)
    const { data: pagoExistenteArr } = await supabase
      .from('pago')
      .select('*')
      .eq('id_ocupacion', id)
      .in('estado', ['PENDIENTE', 'pendiente', 'pendiente_validacion'])
      .limit(1);
    const pagoExistente = pagoExistenteArr?.[0] || null;

    if (ocupacion.hora_salida_solicitada || pagoExistente) {
      // Recalcular por si cambió el tiempo, pero no crear nada nuevo
      const { monto, minutos } = await calcularMontoOcupacion(ocupacion);
      if (pagoExistente && (pagoExistente.monto !== monto || pagoExistente.estado !== 'PENDIENTE')) {
        try { await Pago.update(pagoExistente.id_pago, { monto, estado: 'PENDIENTE' }); } catch {}
      }
      // Asegurar que el campo hora_salida_solicitada esté seteado
      if (!ocupacion.hora_salida_solicitada) {
        await supabase
          .from('ocupacion')
          .update({ hora_salida_solicitada: new Date().toISOString(), monto_calculado: monto, tiempo_total_minutos: minutos })
          .eq('id_ocupacion', id);
      }
      return res.status(200).json({ success: true, data: { id_pago: (pagoExistente?.id_pago ?? null), monto, tiempo_minutos: minutos, ya_solicitada: true } });
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
      .in('estado', ['PENDIENTE', 'pendiente', 'pendiente_validacion'])
      .limit(1);

    let pago = pagoPend?.[0];
    if (pago) {
      pago = await Pago.update(pago.id_pago, { monto, estado: 'PENDIENTE' });
    } else {
      pago = await Pago.create({ id_ocupacion: Number(id), monto, estado: 'PENDIENTE' });
    }

    return res.status(200).json({ success: true, data: { id_pago: pago.id_pago, monto, tiempo_minutos: minutos, ya_solicitada: false } });
  } catch (err) {
    console.error('[solicitarSalida] error', err);
    return res.status(500).json({ success: false, message: 'Error al solicitar salida' });
  }
}

// PATCH /pagos/:id/validar
async function validarPago(req, res) {
  try {
    const { id } = req.params; // id pago

    // Verificación básica de rol/parking se deja a middleware; aquí solo marcamos completado
    const pago = await Pago.getById(id);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    
    // Idempotencia: si ya está completado, informar sin volver a actualizar
    if (pago.estado === 'COMPLETADO' || pago.estado === 'completado') {
      return res.status(200).json({ 
        success: true, 
        data: pago,
        message: 'El pago ya fue validado anteriormente' 
      });
    }

    const actualizado = await Pago.update(pago.id_pago, { estado: 'COMPLETADO', validado_en: new Date().toISOString() });
    // Nota: el trigger fn_pago_completado_sync cierra ocupación, libera espacio y completa reserva.
    return res.status(200).json({ success: true, data: actualizado, message: 'Pago validado exitosamente' });
  } catch (err) {
    console.error('[validarPago] error', err);
    return res.status(500).json({ success: false, message: 'Error al validar pago' });
  }
}// POST /pagos/:id/simular
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

module.exports = { listarPagosPendientes, solicitarSalida, validarPago, simularPago, obtenerComprobante };
