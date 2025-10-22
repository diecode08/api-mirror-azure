const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const vehiculoRoutes = require('./routes/vehiculo.routes');
const parkingRoutes = require('./routes/parking.routes');
const espacioRoutes = require('./routes/espacio.routes');
const reservaRoutes = require('./routes/reserva.routes');
const ocupacionRoutes = require('./routes/ocupacion.routes');
const metodoPagoRoutes = require('./routes/metodoPago.routes');
const pagoRoutes = require('./routes/pago.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const historialRoutes = require('./routes/historial.routes');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logger ligero de todas las requests (incluye OPTIONS) para depuración
app.use((req, res, next) => {
  try {
    console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  } catch (_) {}
  next();
});

// Nota: Evitamos app.options('*', cors()) por incompatibilidad con path-to-regexp modernas

// Activar logs detallados solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/parking', parkingRoutes);
// Alias para compatibilidad: algunas implementaciones usan /api/parkings
app.use('/api/parkings', parkingRoutes);
app.use('/api/espacios', espacioRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/ocupaciones', ocupacionRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/historial', historialRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API de Sistema de Gestión de Estacionamientos' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});