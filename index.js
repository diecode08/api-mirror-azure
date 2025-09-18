require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Importar rutas
const authRoutes = require('./src/routes/auth.routes');
const usuarioRoutes = require('./src/routes/usuario.routes');
const vehiculoRoutes = require('./src/routes/vehiculo.routes');
const parkingRoutes = require('./src/routes/parking.routes');
const espacioRoutes = require('./src/routes/espacio.routes');
const reservaRoutes = require('./src/routes/reserva.routes');
const ocupacionRoutes = require('./src/routes/ocupacion.routes');
const metodoPagoRoutes = require('./src/routes/metodoPago.routes');
const pagoRoutes = require('./src/routes/pago.routes');
const notificacionRoutes = require('./src/routes/notificacion.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API de Parking - Bienvenido',
    status: 'online'
  });
});

// Registrar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
// Soportar ambas variantes: singular y plural
app.use('/api/parking', parkingRoutes);
app.use('/api/parkings', parkingRoutes);
app.use('/api/espacios', espacioRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/ocupaciones', ocupacionRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/notificaciones', notificacionRoutes);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;