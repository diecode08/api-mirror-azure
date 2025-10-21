/**
 * Job para expirar reservas no confirmadas
 * Ejecutar cada 5 minutos con cron
 */

require('dotenv').config();
const supabase = require('../src/config/supabase');

const TIMEOUT_MINUTES = 15; // Tiempo de espera antes de expirar

async function expireReservations() {
  try {
    console.log(`[${new Date().toISOString()}] Iniciando verificación de reservas expiradas...`);
    
    // Calcular timestamp límite (ahora - X minutos)
    const limiteExpiracion = new Date();
    limiteExpiracion.setMinutes(limiteExpiracion.getMinutes() - TIMEOUT_MINUTES);
    const limiteISO = limiteExpiracion.toISOString();
    
    // Buscar reservas activas que deberían haber sido confirmadas
    const { data: reservasExpiradas, error: errorBuscar } = await supabase
      .from('reserva')
      .select(`
        id_reserva,
        id_espacio,
        id_usuario,
        hora_inicio,
        estado,
        espacio:id_espacio(numero_espacio, id_parking),
        usuario:id_usuario(nombre, apellido)
      `)
      .eq('estado', 'activa')  // Solo reservas activas (pendientes o confirmadas sin entrada)
      .lt('hora_inicio', limiteISO); // Hora de inicio fue hace más de X minutos
    
    if (errorBuscar) {
      console.error('Error al buscar reservas:', errorBuscar);
      return;
    }
    
    if (!reservasExpiradas || reservasExpiradas.length === 0) {
      console.log('No hay reservas expiradas.');
      return;
    }
    
    console.log(`Encontradas ${reservasExpiradas.length} reservas expiradas.`);
    
    // Procesar cada reserva expirada
    for (const reserva of reservasExpiradas) {
      // Verificar si tiene ocupación (entrada confirmada)
      const { data: ocupacion } = await supabase
        .from('ocupacion')
        .select('id_ocupacion')
        .eq('id_reserva', reserva.id_reserva)
        .maybeSingle();
      
      // Si ya tiene ocupación, NO expirar (entrada fue confirmada)
      if (ocupacion) {
        console.log(`  Reserva ${reserva.id_reserva} tiene ocupación, no expira.`);
        continue;
      }
      
      // Expirar la reserva
      const { error: errorActualizar } = await supabase
        .from('reserva')
        .update({ 
          estado: 'cancelada'  // Cambiar a cancelada por timeout
        })
        .eq('id_reserva', reserva.id_reserva);
      
      if (errorActualizar) {
        console.error(`  Error al expirar reserva ${reserva.id_reserva}:`, errorActualizar);
        continue;
      }
      
      // Liberar el espacio
      const { error: errorEspacio } = await supabase
        .from('espacio')
        .update({ estado: 'disponible' })
        .eq('id_espacio', reserva.id_espacio);
      
      if (errorEspacio) {
        console.error(`  Error al liberar espacio ${reserva.id_espacio}:`, errorEspacio);
      }
      
      // Crear notificación para el usuario
      const { error: errorNotif } = await supabase
        .from('notificacion')
        .insert({
          id_usuario: reserva.id_usuario,
          mensaje: `Tu reserva en el espacio ${reserva.espacio?.numero_espacio || 'N/A'} expiró por no confirmar entrada en ${TIMEOUT_MINUTES} minutos.`,
          tipo: 'reserva',
          estado: 'no_leido'
        });
      
      if (errorNotif) {
        console.error(`  Error al crear notificación:`, errorNotif);
      }
      
      console.log(`  ✅ Reserva ${reserva.id_reserva} expirada y espacio ${reserva.id_espacio} liberado.`);
    }
    
    console.log('Proceso completado.');
    
  } catch (error) {
    console.error('Error en expireReservations:', error);
  }
}

// Si se ejecuta directamente (no como módulo)
if (require.main === module) {
  expireReservations()
    .then(() => {
      console.log('Job finalizado.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { expireReservations };
