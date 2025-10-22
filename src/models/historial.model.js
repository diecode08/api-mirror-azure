const supabase = require('../config/supabase');

class Historial {
  /**
   * Inferir tipo de método de pago basándose en el nombre
   * @param {string} nombre - Nombre del método de pago
   * @returns {string} Tipo inferido: 'efectivo', 'qr', 'tarjeta'
   */
  static inferirTipoMetodo(nombre) {
    if (!nombre) return null;
    const n = nombre.toLowerCase();
    if (n.includes('efectivo') || n.includes('cash')) return 'efectivo';
    if (n.includes('yape') || n.includes('plin') || n.includes('qr')) return 'qr';
    if (n.includes('tarjeta') || n.includes('visa') || n.includes('mastercard') || n.includes('card')) return 'tarjeta';
    return 'efectivo'; // default
  }

  /**
   * Obtener historial de operaciones unificado de un parking
   * Combina reservas, ocupaciones y pagos con joins optimizados
   * @param {string} id_parking - ID del parking
   * @param {Object} filters - Filtros opcionales { estado, fecha_desde, fecha_hasta, q, limit }
   * @returns {Promise<Array>} Lista de operaciones
   */
  static async getOperacionesByParkingId(id_parking, filters = {}) {
    const { estado, fecha_desde, fecha_hasta, q, limit = 100 } = filters;

    // 1. Obtener todas las reservas del parking con joins completos
    let queryReservas = supabase
      .from('reserva')
      .select(`
        id_reserva,
        id_usuario,
        id_espacio,
        id_vehiculo,
        hora_inicio,
        hora_fin,
        estado,
        fecha_reserva,
        usuario:id_usuario(
          id_usuario,
          nombre,
          apellido,
          email,
          telefono
        ),
        espacio:id_espacio!inner(
          id_espacio,
          numero_espacio,
          id_parking
        ),
        vehiculo:id_vehiculo(
          id_vehiculo,
          placa,
          marca,
          modelo,
          color
        )
      `)
      .eq('espacio.id_parking', id_parking)
      .order('fecha_reserva', { ascending: false });

    if (estado) {
      queryReservas = queryReservas.eq('estado', estado);
    }

    const { data: reservas, error: errRes } = await queryReservas.limit(limit);
    if (errRes) throw errRes;

    // 2. Obtener todas las ocupaciones finalizadas del parking con joins completos
    let queryOcupaciones = supabase
      .from('ocupacion')
      .select(`
        id_ocupacion,
        id_reserva,
        id_usuario,
        id_espacio,
        id_vehiculo,
        hora_entrada,
        hora_salida,
        tiempo_total_minutos,
        monto_calculado,
        espacio!inner(
          id_espacio,
          numero_espacio,
          id_parking
        ),
        usuario:id_usuario(
          id_usuario,
          nombre,
          apellido,
          email,
          telefono
        ),
        vehiculo:id_vehiculo(
          id_vehiculo,
          placa,
          marca,
          modelo,
          color
        )
      `)
      .eq('espacio.id_parking', id_parking)
      .not('hora_salida', 'is', null)
      .order('hora_salida', { ascending: false });

    const { data: ocupaciones, error: errOc } = await queryOcupaciones.limit(limit);
    if (errOc) throw errOc;

    // 3. Obtener todos los pagos del parking con método de pago
    const { data: pagos, error: errPago } = await supabase
      .from('pago')
      .select(`
        id_pago,
        id_ocupacion,
        monto,
        estado,
        fecha_pago,
        emitido_en,
        tipo_comprobante,
        serie,
        numero,
        id_metodo,
        metodo_pago:id_metodo(
          id_metodo,
          nombre
        )
      `);

    if (errPago) throw errPago;

    // Indexar pagos por id_ocupacion
    const pagosByOcupacion = new Map();
    (pagos || []).forEach(p => {
      const key = String(p.id_ocupacion);
      const arr = pagosByOcupacion.get(key) || [];
      arr.push(p);
      pagosByOcupacion.set(key, arr);
    });

    // Indexar ocupaciones por id_reserva
    const ocupByReserva = new Map();
    const ocupWalkIn = [];
    (ocupaciones || []).forEach(o => {
      if (o.id_reserva) {
        const arr = ocupByReserva.get(o.id_reserva) || [];
        arr.push(o);
        ocupByReserva.set(o.id_reserva, arr);
      } else {
        ocupWalkIn.push(o);
      }
    });

    const operaciones = [];

    // 4. Construir operaciones desde reservas
    for (const r of reservas || []) {
      const ocs = ocupByReserva.get(r.id_reserva) || [];
      const oc = ocs.sort((a,b) => new Date(b.hora_entrada).getTime() - new Date(a.hora_entrada).getTime())[0];
      const pagosOc = oc ? pagosByOcupacion.get(String(oc.id_ocupacion)) || [] : [];
      const pagoCompleto = pagosOc.find(p => String(p.estado).toUpperCase() === 'COMPLETADO');

      let estado_final = r.estado;
      if (oc && oc.hora_salida) {
        estado_final = pagoCompleto ? 'finalizada_pagada' : 'finalizada';
      }

      // Aplicar filtro de estado si se especificó
      if (estado && estado_final !== estado) continue;

      // Aplicar filtro de búsqueda
      if (q) {
        const txt = `${r.usuario?.nombre || ''} ${r.usuario?.apellido || ''} ${r.usuario?.email || ''} ${r.vehiculo?.placa || ''} ${r.espacio?.numero_espacio || ''}`.toLowerCase();
        if (!txt.includes(q.toLowerCase())) continue;
      }

      // Aplicar filtro de fechas
      const baseFecha = (pagoCompleto?.fecha_pago || pagoCompleto?.emitido_en || oc?.hora_salida || oc?.hora_entrada || r.hora_inicio || r.fecha_reserva || '').slice(0,10);
      if (fecha_desde && baseFecha < fecha_desde) continue;
      if (fecha_hasta && baseFecha > fecha_hasta) continue;

      const op = {
        id_operacion: `res-${r.id_reserva}`,
        id_reserva: r.id_reserva,
        id_ocupacion: oc?.id_ocupacion,
        tipo: 'reserva',
        estado_final,
        usuario: r.usuario ? {
          id_usuario: r.usuario.id_usuario,
          nombre: r.usuario.nombre,
          apellido: r.usuario.apellido,
          email: r.usuario.email,
          telefono: r.usuario.telefono
        } : null,
        vehiculo: r.vehiculo ? {
          id_vehiculo: r.vehiculo.id_vehiculo,
          placa: r.vehiculo.placa,
          marca: r.vehiculo.marca,
          modelo: r.vehiculo.modelo,
          color: r.vehiculo.color
        } : null,
        espacio: r.espacio ? {
          id_espacio: r.espacio.id_espacio,
          numero_espacio: r.espacio.numero_espacio,
          id_parking: r.espacio.id_parking
        } : null,
        fechas: {
          creada_at: r.fecha_reserva || null,
          hora_programada_inicio: r.hora_inicio || null,
          hora_programada_fin: r.hora_fin || null,
          entrada_at: oc?.hora_entrada || null,
          salida_at: oc?.hora_salida || null,
          pago_at: pagoCompleto?.fecha_pago || pagoCompleto?.emitido_en || null
        },
        duracion_minutos: oc?.tiempo_total_minutos || null,
        pago: pagoCompleto ? {
          id_pago: pagoCompleto.id_pago,
          monto: pagoCompleto.monto,
          estado: pagoCompleto.estado,
          metodo: pagoCompleto.metodo_pago?.nombre || null,
          metodo_tipo: Historial.inferirTipoMetodo(pagoCompleto.metodo_pago?.nombre),
          comprobante: {
            tipo: pagoCompleto.tipo_comprobante || null,
            serie: pagoCompleto.serie || null,
            numero: pagoCompleto.numero || null,
            emitido_en: pagoCompleto.emitido_en || pagoCompleto.fecha_pago || null
          }
        } : null
      };

      operaciones.push(op);
    }

    // 5. Construir operaciones desde walk-ins (ocupaciones sin reserva)
    for (const oc of ocupWalkIn) {
      const pagosOc = pagosByOcupacion.get(String(oc.id_ocupacion)) || [];
      const pagoCompleto = pagosOc.find(p => String(p.estado).toUpperCase() === 'COMPLETADO');

      const estado_final = oc.hora_salida
        ? (pagoCompleto ? 'finalizada_pagada' : 'finalizada')
        : 'activa';

      // Aplicar filtros
      if (estado && estado_final !== estado) continue;

      if (q) {
        const txt = `${oc.usuario?.nombre || ''} ${oc.usuario?.apellido || ''} ${oc.vehiculo?.placa || ''} ${oc.espacio?.numero_espacio || ''}`.toLowerCase();
        if (!txt.includes(q.toLowerCase())) continue;
      }

      const baseFecha = (pagoCompleto?.fecha_pago || oc.hora_salida || oc.hora_entrada || '').slice(0,10);
      if (fecha_desde && baseFecha < fecha_desde) continue;
      if (fecha_hasta && baseFecha > fecha_hasta) continue;

      const op = {
        id_operacion: `oc-${oc.id_ocupacion}`,
        id_ocupacion: oc.id_ocupacion,
        tipo: 'walk_in',
        estado_final,
        usuario: oc.usuario ? {
          id_usuario: oc.usuario.id_usuario,
          nombre: oc.usuario.nombre,
          apellido: oc.usuario.apellido,
          email: oc.usuario.email,
          telefono: oc.usuario.telefono
        } : null,
        vehiculo: oc.vehiculo ? {
          id_vehiculo: oc.vehiculo.id_vehiculo,
          placa: oc.vehiculo.placa,
          marca: oc.vehiculo.marca,
          modelo: oc.vehiculo.modelo,
          color: oc.vehiculo.color
        } : null,
        espacio: oc.espacio ? {
          id_espacio: oc.espacio.id_espacio,
          numero_espacio: oc.espacio.numero_espacio,
          id_parking: oc.espacio.id_parking
        } : null,
        fechas: {
          creada_at: oc.hora_entrada || null,
          hora_programada_inicio: null,
          hora_programada_fin: null,
          entrada_at: oc.hora_entrada || null,
          salida_at: oc.hora_salida || null,
          pago_at: pagoCompleto?.fecha_pago || pagoCompleto?.emitido_en || null
        },
        duracion_minutos: oc.tiempo_total_minutos || null,
        pago: pagoCompleto ? {
          id_pago: pagoCompleto.id_pago,
          monto: pagoCompleto.monto,
          estado: pagoCompleto.estado,
          metodo: pagoCompleto.metodo_pago?.nombre || null,
          metodo_tipo: Historial.inferirTipoMetodo(pagoCompleto.metodo_pago?.nombre),
          comprobante: {
            tipo: pagoCompleto.tipo_comprobante || null,
            serie: pagoCompleto.serie || null,
            numero: pagoCompleto.numero || null,
            emitido_en: pagoCompleto.emitido_en || pagoCompleto.fecha_pago || null
          }
        } : null
      };

      operaciones.push(op);
    }

    // 6. Ordenar por fecha más reciente (pago > salida > entrada > programada > creada)
    operaciones.sort((a, b) => {
      const aDate = a.fechas.pago_at || a.fechas.salida_at || a.fechas.entrada_at || a.fechas.hora_programada_inicio || a.fechas.creada_at || '';
      const bDate = b.fechas.pago_at || b.fechas.salida_at || b.fechas.entrada_at || b.fechas.hora_programada_inicio || b.fechas.creada_at || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    return operaciones;
  }
}

module.exports = Historial;
