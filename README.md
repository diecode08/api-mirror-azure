# API de Gestión de Estacionamientos

API RESTful desarrollada con Node.js, Express y Supabase para la gestión de estacionamientos.

## Características

- Autenticación y autorización con JWT y Supabase
- Gestión de usuarios y vehículos
- Administración de parkings y espacios de estacionamiento
- Sistema de reservas y ocupaciones
- Procesamiento de pagos
- Sistema de notificaciones

## Requisitos

- Node.js (v14 o superior)
- NPM o Yarn
- Cuenta en Supabase

## Instalación

1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd api_nodejs_parking
```

2. Instalar dependencias

```bash
npm install
```

3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_clave_de_supabase
SUPABASE_JWT_SECRET=tu_secreto_jwt

# JWT
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=24h
```

4. Iniciar el servidor

```bash
npm run dev
```

## Estructura de la API

### Autenticación

- `POST /api/auth/register` - Registrar un nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario actual
- `PUT /api/auth/update-password` - Actualizar contraseña

### Usuarios

- `GET /api/usuarios` - Obtener todos los usuarios
- `GET /api/usuarios/:id` - Obtener un usuario por ID
- `GET /api/usuarios/rol/:rol` - Obtener usuarios por rol
- `PUT /api/usuarios/:id` - Actualizar un usuario
- `DELETE /api/usuarios/:id` - Eliminar un usuario

### Vehículos

- `GET /api/vehiculos` - Obtener todos los vehículos
- `GET /api/vehiculos/:id` - Obtener un vehículo por ID
- `GET /api/vehiculos/usuario/:userId` - Obtener vehículos por usuario
- `POST /api/vehiculos` - Crear un nuevo vehículo
- `PUT /api/vehiculos/:id` - Actualizar un vehículo
- `DELETE /api/vehiculos/:id` - Eliminar un vehículo

### Parkings

- `GET /api/parkings` - Obtener todos los parkings
- `GET /api/parkings/:id` - Obtener un parking por ID
- `GET /api/parkings/admin/:adminId` - Obtener parkings por administrador
- `GET /api/parkings/nearby` - Encontrar parkings cercanos
- `POST /api/parkings` - Crear un nuevo parking
- `PUT /api/parkings/:id` - Actualizar un parking
- `DELETE /api/parkings/:id` - Eliminar un parking

### Espacios

- `GET /api/espacios` - Obtener todos los espacios
- `GET /api/espacios/:id` - Obtener un espacio por ID
- `GET /api/espacios/parking/:parkingId` - Obtener espacios por parking
- `GET /api/espacios/parking/:parkingId/disponibles` - Obtener espacios disponibles por parking
- `POST /api/espacios` - Crear un nuevo espacio
- `PUT /api/espacios/:id` - Actualizar un espacio
- `PATCH /api/espacios/:id/estado` - Actualizar estado de un espacio
- `DELETE /api/espacios/:id` - Eliminar un espacio

### Reservas

- `GET /api/reservas` - Obtener todas las reservas
- `GET /api/reservas/:id` - Obtener una reserva por ID
- `GET /api/reservas/usuario/:userId` - Obtener reservas por usuario
- `GET /api/reservas/espacio/:espacioId` - Obtener reservas por espacio
- `POST /api/reservas/verificar-disponibilidad` - Verificar disponibilidad de un espacio
- `POST /api/reservas` - Crear una nueva reserva
- `PUT /api/reservas/:id` - Actualizar una reserva
- `PATCH /api/reservas/:id/estado` - Actualizar estado de una reserva
- `DELETE /api/reservas/:id` - Eliminar una reserva

### Ocupaciones

- `GET /api/ocupaciones` - Obtener todas las ocupaciones
- `GET /api/ocupaciones/activas` - Obtener ocupaciones activas
- `GET /api/ocupaciones/:id` - Obtener una ocupación por ID
- `GET /api/ocupaciones/usuario/:userId` - Obtener ocupaciones por usuario
- `GET /api/ocupaciones/espacio/:espacioId` - Obtener ocupaciones por espacio
- `POST /api/ocupaciones` - Crear una nueva ocupación
- `PATCH /api/ocupaciones/:id/salida` - Registrar salida de una ocupación
- `DELETE /api/ocupaciones/:id` - Eliminar una ocupación

### Métodos de Pago

- `GET /api/metodos-pago` - Obtener todos los métodos de pago
- `GET /api/metodos-pago/:id` - Obtener un método de pago por ID
- `POST /api/metodos-pago` - Crear un nuevo método de pago
- `PUT /api/metodos-pago/:id` - Actualizar un método de pago
- `DELETE /api/metodos-pago/:id` - Eliminar un método de pago

### Pagos

- `GET /api/pagos` - Obtener todos los pagos
- `GET /api/pagos/:id` - Obtener un pago por ID
- `GET /api/pagos/ocupacion/:ocupacionId` - Obtener pagos por ocupación
- `POST /api/pagos` - Crear un nuevo pago
- `PUT /api/pagos/:id` - Actualizar un pago
- `PATCH /api/pagos/:id/estado` - Actualizar estado de un pago
- `DELETE /api/pagos/:id` - Eliminar un pago

### Notificaciones

- `GET /api/notificaciones` - Obtener todas las notificaciones
- `GET /api/notificaciones/:id` - Obtener una notificación por ID
- `GET /api/notificaciones/usuario/:userId` - Obtener notificaciones por usuario
- `GET /api/notificaciones/usuario/:userId/no-leidas` - Obtener notificaciones no leídas por usuario
- `POST /api/notificaciones` - Crear una nueva notificación
- `PATCH /api/notificaciones/:id/leer` - Marcar una notificación como leída
- `PATCH /api/notificaciones/usuario/:userId/leer-todas` - Marcar todas las notificaciones de un usuario como leídas
- `DELETE /api/notificaciones/:id` - Eliminar una notificación

## Licencia

ISC