const Parking = require('../models/parking.model');
const Espacio = require('../models/espacio.model');
const supabase = require('../config/supabase');

/**
 * Obtener todos los parkings
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getAllParkings = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Obteniendo todos los parkings...');
    }
    const parkings = await Parking.getAll();
    if (process.env.NODE_ENV === 'development') {
      console.log('Parkings obtenidos:', parkings);
    }

    // Enriquecer con nombre del administrador (admin_nombre)
    let enriched = parkings;
    try {
      const adminIds = [...new Set((parkings || []).map(p => p.id_admin).filter(Boolean))];
      if (adminIds.length > 0) {
        const { data: adminsData, error: adminsErr } = await supabase
          .from('usuario')
          .select('id_usuario, nombre, apellido')
          .in('id_usuario', adminIds);
        if (adminsErr) {
          console.warn('[getAllParkings] No se pudo obtener nombres de admins:', adminsErr?.message);
        } else {
          const byId = Object.fromEntries((adminsData || []).map(u => [u.id_usuario, `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim()]));
          enriched = parkings.map(p => ({ ...p, admin_nombre: byId[p.id_admin] || null }));
        }
      }
    } catch (innerErr) {
      console.warn('[getAllParkings] Error enriqueciendo admin_nombre:', innerErr?.message);
    }
    
    // Calcular ingresos del mes actual por parking
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    try {
      // Obtener ingresos agrupados por id_parking del mes actual
      const { data: ingresosData, error: ingresosErr } = await supabase
        .from('pago')
        .select(`
          monto,
          ocupacion!inner(
            id_espacio,
            espacio!inner(id_parking)
          )
        `)
        .eq('estado', 'completado')
        .gte('fecha_pago', startOfMonth)
        .lte('fecha_pago', endOfMonth);
      
      if (ingresosErr) {
        console.warn('[getAllParkings] Error calculando ingresos:', ingresosErr?.message);
      } else {
        // Agrupar ingresos por parking
        const ingresosPorParking = {};
        (ingresosData || []).forEach(pago => {
          const parkingId = pago.ocupacion?.espacio?.id_parking;
          if (parkingId) {
            ingresosPorParking[parkingId] = (ingresosPorParking[parkingId] || 0) + (pago.monto || 0);
          }
        });
        
        // Agregar revenue a cada parking
        enriched = enriched.map(p => ({
          ...p,
          revenue: ingresosPorParking[p.id_parking] || 0
        }));
      }
    } catch (revErr) {
      console.warn('[getAllParkings] Error calculando revenue:', revErr?.message);
      // Si falla, asignar 0 a todos
      enriched = enriched.map(p => ({ ...p, revenue: 0 }));
    }
    
      // Obtener tarifa horaria de cada parking
      try {
        const parkingIds = parkings.map(p => p.id_parking).filter(Boolean);
        if (parkingIds.length > 0) {
          const { data: tarifasData, error: tarifasErr } = await supabase
            .from('tarifa')
            .select('id_parking, monto')
            .in('id_parking', parkingIds)
            .eq('tipo', 'hora');
        
          if (tarifasErr) {
            console.warn('[getAllParkings] Error obteniendo tarifas:', tarifasErr?.message);
          } else {
            // Crear mapa de tarifas por parking
            const tarifasPorParking = {};
            (tarifasData || []).forEach(t => {
              tarifasPorParking[t.id_parking] = t.monto;
            });
          
            // Agregar tarifa_hora a cada parking
            enriched = enriched.map(p => ({
              ...p,
              tarifa_hora: tarifasPorParking[p.id_parking] || null
            }));
          }
        }
      } catch (tarifaErr) {
        console.warn('[getAllParkings] Error obteniendo tarifas:', tarifaErr?.message);
        enriched = enriched.map(p => ({ ...p, tarifa_hora: null }));
      }
    
    res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Error detallado al obtener parkings:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parkings',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener un parking por su ID
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getParkingById = async (req, res) => {
  try {
    const { id } = req.params;
    const parking = await Parking.getById(id);
    
    if (!parking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: parking
    });
  } catch (error) {
    console.error('Error al obtener parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener parkings por ID de administrador
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getParkingsByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;
    const parkings = await Parking.getByAdminId(adminId);
    
    // Enriquecer con tarifa horaria
    let enriched = parkings;
    try {
      const parkingIds = parkings.map(p => p.id_parking).filter(Boolean);
      if (parkingIds.length > 0) {
        const { data: tarifasData, error: tarifasErr } = await supabase
          .from('tarifa')
          .select('id_parking, monto')
          .in('id_parking', parkingIds)
          .eq('tipo', 'hora');
        
        if (!tarifasErr && tarifasData) {
          const tarifasPorParking = {};
          tarifasData.forEach(t => {
            tarifasPorParking[t.id_parking] = t.monto;
          });
          
          enriched = parkings.map(p => ({
            ...p,
            tarifa_hora: tarifasPorParking[p.id_parking] || null
          }));
        }
      }
    } catch (err) {
      console.warn('[getParkingsByAdminId] Error obteniendo tarifas:', err?.message);
    }
    
    res.status(200).json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Error al obtener parkings del administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parkings del administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Buscar parkings cercanos por coordenadas
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const findNearbyParkings = async (req, res) => {
  try {
    const { latitud, longitud, distancia = 5 } = req.query; // distancia en km, por defecto 5km
    
    if (!latitud || !longitud) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren latitud y longitud para buscar parkings cercanos'
      });
    }
    
    const parkings = await Parking.findNearby(parseFloat(latitud), parseFloat(longitud), parseFloat(distancia));
    
    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    console.error('Error al buscar parkings cercanos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar parkings cercanos',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Crear un nuevo parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const createParking = async (req, res) => {
  try {
    console.log('=== INICIO CREAR PARKING ===');
    console.log('Datos recibidos:', req.body);
    console.log('Usuario autenticado:', req.user);
    
    const { nombre, direccion, latitud, longitud, capacidad_total, id_admin_asignado } = req.body;
    const id_admin_creador = req.user.id;
    
    // Validar datos requeridos
    if (!nombre || !direccion || !latitud || !longitud || !capacidad_total) {
      console.log('Error: Faltan campos requeridos');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: nombre, dirección, latitud, longitud y capacidad total'
      });
    }
    
    // Validar coordenadas
    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    
    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'La latitud debe estar entre -90 y 90 grados'
      });
    }
    
    if (lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'La longitud debe estar entre -180 y 180 grados'
      });
    }
    
    // Si no se especifica un administrador, usar el creador
    const id_admin = id_admin_asignado || id_admin_creador;
    
    // Crear parking
    const parkingData = {
      nombre,
      direccion,
      latitud: lat,
      longitud: lng,
      capacidad_total: parseInt(capacidad_total),
      id_admin
    };
    
    console.log('Datos del parking a crear:', parkingData);
    
    // Verificar conexión a Supabase antes de crear
    console.log('Verificando conexión a Supabase...');
    const testConnection = await supabase.from('parking').select('count').limit(1);
    if (testConnection.error) {
      console.error('Error de conexión a Supabase:', testConnection.error);
      return res.status(500).json({
        success: false,
        message: 'Error de conexión a la base de datos',
        error: testConnection.error
      });
    }
    console.log('Conexión a Supabase verificada');
    
    const nuevoParking = await Parking.create(parkingData);
    console.log('Parking creado:', nuevoParking);
    
    // Si se asignó un administrador diferente al creador, crear la relación en usuario_parking
    if (id_admin_asignado && id_admin_asignado !== id_admin_creador) {
      console.log('Asignando administrador:', id_admin_asignado);
      await Parking.assignAdmin(nuevoParking.id_parking, id_admin_asignado);
    }
    
    // Crear espacios automáticamente según la capacidad total
    const espaciosPromises = [];
    for (let i = 1; i <= capacidad_total; i++) {
      const espacioData = {
        id_parking: nuevoParking.id_parking,
        numero_espacio: `E-${i.toString().padStart(3, '0')}`,
        estado: 'disponible'
      };
      espaciosPromises.push(Espacio.create(espacioData));
    }
    
    console.log('Creando espacios...');
    await Promise.all(espaciosPromises);
    console.log('Espacios creados exitosamente');
    
    // Crear tarifa por hora automáticamente
    console.log('Creando tarifa por hora por defecto...');
    const montoTarifa = req.body.tarifa_hora || req.body.tarifa || 5.00; // Acepta tarifa_hora, tarifa, o default
    console.log('[createParking] Monto tarifa a usar:', montoTarifa, 'desde req.body:', { tarifa_hora: req.body.tarifa_hora, tarifa: req.body.tarifa });
    
    const { data: tarifaData, error: tarifaError } = await supabase
      .from('tarifa')
      .insert([{
        id_parking: nuevoParking.id_parking,
        tipo: 'hora',
        monto: parseFloat(montoTarifa),
        condiciones: 'Tarifa estándar por hora'
      }])
      .select()
      .single();
    
    if (tarifaError) {
      console.warn('Advertencia: No se pudo crear tarifa automática:', tarifaError.message);
    } else {
      console.log('Tarifa por hora creada:', tarifaData);
    }
    
    res.status(201).json({
      success: true,
      message: 'Parking registrado exitosamente con todos sus espacios y tarifa',
      data: nuevoParking
    });
  } catch (error) {
    console.error('=== ERROR DETALLADO AL CREAR PARKING ===');
    console.error('Error:', error);
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Stack trace:', error.stack);
    console.error('=== FIN ERROR ===');
    
    res.status(500).json({
      success: false,
      message: 'Error al crear parking',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        details: error.details
      } : 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const updateParking = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, latitud, longitud, capacidad_total, tarifa, tarifa_hora } = req.body;

    // Logs de entrada
    console.log('=== INICIO UPDATE PARKING ===');
    console.log('Params.id:', id);
    console.log('Usuario autenticado (req.user):', req.user);
  console.log('Body recibido:', { nombre, direccion, latitud, longitud, capacidad_total, tarifa, tarifa_hora });
    
    // Verificar si el parking existe
    const existingParking = await Parking.getById(id);
    if (!existingParking) {
      console.warn('[updateParking] Parking no encontrado:', id);
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    if (existingParking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      console.warn('[updateParking] Usuario sin permisos. user:', req.user.id, 'rol:', req.user.rol, 'id_admin parking:', existingParking.id_admin);
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para modificar este parking'
      });
    }
    
    // Actualizar parking
    const parkingData = {};
    if (nombre) parkingData.nombre = nombre;
    if (direccion) parkingData.direccion = direccion;
    if (latitud) parkingData.latitud = latitud;
    if (longitud) parkingData.longitud = longitud;
    console.log('[updateParking] Datos a actualizar inicialmente:', parkingData);
    
    // Si se modifica la capacidad, verificar que no sea menor a la actual
    if (capacidad_total) {
      if (capacidad_total < existingParking.capacidad_total) {
        console.warn('[updateParking] Intento de reducir capacidad. actual:', existingParking.capacidad_total, 'nueva:', capacidad_total);
        return res.status(400).json({
          success: false,
          message: 'No se puede reducir la capacidad total del parking'
        });
      }
      
      parkingData.capacidad_total = capacidad_total;
      console.log('[updateParking] Capacidad actualizada a:', capacidad_total);
      
      // Si aumenta la capacidad, crear nuevos espacios
      if (capacidad_total > existingParking.capacidad_total) {
        console.log('[updateParking] Aumentando capacidad. actual:', existingParking.capacidad_total, 'nueva:', capacidad_total);
        const espaciosActuales = await Espacio.getByParkingId(id);
        const nuevosEspacios = capacidad_total - existingParking.capacidad_total;
        console.log('[updateParking] Espacios actuales:', espaciosActuales.length, 'Nuevos espacios a crear:', nuevosEspacios);
        
        const espaciosPromises = [];
        for (let i = 1; i <= nuevosEspacios; i++) {
          const numeroEspacio = `E-${(espaciosActuales.length + i).toString().padStart(3, '0')}`;
          const espacioData = {
            id_parking: id,
            numero_espacio: numeroEspacio,
            estado: 'disponible'
          };
          console.log('[updateParking] Creando espacio:', espacioData);
          espaciosPromises.push(Espacio.create(espacioData));
        }
        
        await Promise.all(espaciosPromises);
        console.log('[updateParking] Nuevos espacios creados correctamente');
      }
    }
    
    console.log('[updateParking] Ejecutando actualización en modelo con:', parkingData);
    const updatedParking = await Parking.update(id, parkingData);
    console.log('[updateParking] Resultado actualización (parking base):', updatedParking);

    // === Actualizar / crear tarifa hora si viene en el payload ===
    const montoTarifaEntrada = tarifa_hora != null ? tarifa_hora : tarifa;
    let tarifaHoraFinal = null;
    if (montoTarifaEntrada !== undefined && montoTarifaEntrada !== null && montoTarifaEntrada !== '') {
      const montoNum = parseFloat(montoTarifaEntrada);
      if (!Number.isNaN(montoNum) && montoNum > 0) {
        console.log('[updateParking] Procesando actualización de tarifa hora. monto:', montoNum);
        // Buscar si ya existe tarifa tipo 'hora'
        const { data: tarifasExistentes, error: tarifasErr } = await supabase
          .from('tarifa')
          .select('id_tarifa, tipo, monto')
          .eq('id_parking', id)
          .eq('tipo', 'hora')
          .limit(1);
        if (tarifasErr) {
          console.warn('[updateParking] Error buscando tarifa hora existente:', tarifasErr.message);
        } else if (tarifasExistentes && tarifasExistentes.length > 0) {
          // Actualizar
          const existing = tarifasExistentes[0];
          console.log('[updateParking] Tarifa hora existente encontrada, id_tarifa:', existing.id_tarifa, 'monto actual:', existing.monto, 'nuevo:', montoNum);
          const { error: updErr } = await supabase
            .from('tarifa')
            .update({ monto: montoNum })
            .eq('id_tarifa', existing.id_tarifa);
          if (updErr) {
            console.warn('[updateParking] Error actualizando tarifa hora:', updErr.message);
          } else {
            tarifaHoraFinal = montoNum;
          }
        } else {
          // Crear nueva tarifa hora
          console.log('[updateParking] No existía tarifa hora. Creando nueva con monto:', montoNum);
          const { data: insertData, error: insErr } = await supabase
            .from('tarifa')
            .insert({ id_parking: id, tipo: 'hora', monto: montoNum })
            .select('id_tarifa, monto')
            .limit(1);
          if (insErr) {
            console.warn('[updateParking] Error insertando nueva tarifa hora:', insErr.message);
          } else {
            tarifaHoraFinal = insertData?.[0]?.monto || montoNum;
          }
        }
      } else {
        console.warn('[updateParking] Valor de tarifa inválido, se ignora. recibido:', montoTarifaEntrada);
      }
    } else {
      console.log('[updateParking] No se envió tarifa hora en el payload, se mantiene la existente.');
    }

    // Adjuntar tarifa_hora (si se pudo determinar) al objeto de respuesta
    const respuesta = {
      ...updatedParking,
      tarifa_hora: tarifaHoraFinal !== null ? tarifaHoraFinal : undefined
    };

    res.status(200).json({
      success: true,
      message: 'Parking actualizado exitosamente',
      data: respuesta
    });
    console.log('=== FIN UPDATE PARKING (OK) ===');
  } catch (error) {
    console.error('Error al actualizar parking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
    console.error('=== FIN UPDATE PARKING (ERROR) ===');
  }
};

/**
 * Eliminar un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const deleteParking = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};
    console.log('=== INICIO DELETE (SOFT) PARKING ===');
    console.log('[deleteParking] user.id:', req.user?.id, 'user.rol:', req.user?.rol, 'params.id:', id, 'motivo:', motivo);
    
    // Verificar si el parking existe
    const existingParking = await Parking.getById(id);
    console.log('[deleteParking] existingParking:', existingParking ? { id_parking: existingParking.id_parking, id_admin: existingParking.id_admin } : null);
    if (!existingParking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Verificar si el usuario es administrador del parking
    if (existingParking.id_admin !== req.user.id && req.user.rol !== 'admin_general') {
      console.warn('[deleteParking] Permiso denegado. existing.id_admin:', existingParking.id_admin, 'user.id:', req.user.id, 'rol:', req.user.rol);
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar este parking'
      });
    }
    
    // Eliminado lógico (soft delete)
    const deletedBy = req.user?.id;
    console.log('[deleteParking] Ejecutando softDelete con:', { id, deletedBy, motivo });
    const result = await Parking.softDelete(id, deletedBy, motivo);
    console.log('[deleteParking] Resultado softDelete:', result ? { id_parking: result.id_parking, deleted_at: result.deleted_at, deleted_by: result.deleted_by, motivo_baja: result.motivo_baja } : null);
    
    res.status(200).json({
      success: true,
      message: 'Parking dado de baja exitosamente',
      data: result
    });
    console.log('=== FIN DELETE (SOFT) PARKING (OK) ===');
  } catch (error) {
    console.error('=== ERROR EN DELETE (SOFT) PARKING ===');
    console.error('Error al eliminar parking:', error);
    console.error('Mensaje:', error?.message);
    console.error('Stack:', error?.stack);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar parking',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
    console.error('=== FIN ERROR DELETE (SOFT) PARKING ===');
  }
};

/**
 * Asignar administrador a un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const assignAdminToParking = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_admin } = req.body;
    
    if (!id_admin) {
      return res.status(400).json({
        success: false,
        message: 'ID del administrador es requerido'
      });
    }
    
    // Verificar si el parking existe
    const existingParking = await Parking.getById(id);
    if (!existingParking) {
      return res.status(404).json({
        success: false,
        message: 'Parking no encontrado'
      });
    }
    
    // Asignar administrador
    const result = await Parking.assignAdmin(id, id_admin);
    
    res.status(200).json({
      success: true,
      message: 'Administrador asignado exitosamente al parking',
      data: result
    });
  } catch (error) {
    console.error('Error al asignar administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Obtener parkings asignados a un usuario
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const getParkingsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    // La consulta actual retorna filas de usuario_parking con el parking anidado.
    // Normalizamos para responder un array de parkings consistente con getParkingsByAdminId.
    const usuarioParkings = await Parking.getParkingsByUserId(userId);

    // Logs de diagnóstico (no sensibles)
    try {
      const upCount = Array.isArray(usuarioParkings) ? usuarioParkings.length : 0;
      const upIds = (usuarioParkings || []).map(up => up?.id_parking).filter(Boolean);
      console.log(`[getParkingsByUser] userId=${userId} rows(usuario_parking)=${upCount} ids=`, upIds);
    } catch (_) {}

    const parkings = (usuarioParkings || [])
      .filter(up => up && up.parking && up.parking.deleted_at == null)
      .map(up => ({ ...up.parking }));

    // Si hay asignaciones en usuario_parking que no aparecen por join (ej. parking desaparecido), intentar fallback simple
    if (usuarioParkings?.length > parkings.length) {
      try {
        const missing = usuarioParkings.filter(up => !parkings.find(p => p.id_parking === up.id_parking));
        if (missing.length) {
          console.log('[getParkingsByUser] Fallback para parkings faltantes ids=', missing.map(m => m.id_parking));
        }
      } catch(_) {}
    }

    try {
      const outIds = (parkings || []).map(p => p?.id_parking).filter(Boolean);
      console.log(`[getParkingsByUser] response parkings count=${parkings?.length || 0} ids=`, outIds);
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: parkings
    });
  } catch (error) {
    console.error('Error al obtener parkings del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener parkings del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Verificar si un usuario es administrador de un parking
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
const checkUserParkingAdmin = async (req, res) => {
  try {
    const { userId, parkingId } = req.params;
    const isAdmin = await Parking.isUserAdminOfParking(userId, parkingId);
    
    res.status(200).json({
      success: true,
      data: { isAdmin }
    });
  } catch (error) {
    console.error('Error al verificar administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Listar parkings dados de baja (soft-deleted)
 */
const getDeletedParkings = async (req, res) => {
  try {
    const parkings = await Parking.getDeleted();
    res.status(200).json({ success: true, data: parkings });
  } catch (error) {
    console.error('Error al listar parkings dados de baja:', error);
    res.status(500).json({ success: false, message: 'Error al listar parkings dados de baja' });
  }
};

/**
 * Restaurar un parking dado de baja (permiso validado en rutas)
 */
const restoreParking = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Parking.getByIdAny(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Parking no encontrado' });
    }
    const restored = await Parking.restore(id);
    res.status(200).json({ success: true, message: 'Parking restaurado exitosamente', data: restored });
  } catch (error) {
    console.error('Error al restaurar parking:', error);
    res.status(500).json({ success: false, message: 'Error al restaurar parking' });
  }
};

module.exports = {
  getAllParkings,
  getParkingById,
  getParkingsByAdminId,
  findNearbyParkings,
  createParking,
  updateParking,
  deleteParking,
  assignAdminToParking,
  getParkingsByUser,
  checkUserParkingAdmin,
  getDeletedParkings,
  restoreParking
};
