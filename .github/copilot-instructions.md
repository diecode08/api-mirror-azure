# Copilot Instructions - API Backend (Node.js/Express)

## Project Overview

Node.js/Express REST API for **Parking Management System** with Supabase backend. Serves frontend clients via HTTP with JWT authentication.

## Architecture Patterns

### File Structure
```
src/
├── controllers/    # Business logic, return { success, data, message }
├── models/        # Supabase queries, class-based static methods
├── routes/        # Express routers with middleware chains
├── middleware/    # auth.middleware.js (verifyToken + role checks)
└── config/        # supabase.js connection
```

### Authentication Middleware Chain
```javascript
// middleware/auth.middleware.js
const verifyToken = (req, res, next) => /* JWT validation */
const hasParkingRole = (paramName, allowedRoles) => /* Multi-tenant role check */

// Usage in routes
router.get('/:id_parking', verifyToken, hasParkingRole('id_parking', ['admin_parking']), controller)
```

### Role-Based Authorization
```javascript
// 4-tier system with parking assignments
type UserRole = "admin_general" | "admin_parking" | "empleado" | "cliente"

// models/usuario_parking.model.js
class UsuarioParking {
  static async hasRole(userId, parkingId, roles) {
    // Check if user has specific role in specific parking
  }
  static async getParkingIdsByUser(userId) {
    // Get all parking IDs assigned to user
  }
}
```

### Consistent API Response Format
```javascript
// Success response
return res.status(200).json({
  success: true,
  data: result,
  message: "Operation completed"
})

// Error response
return res.status(400).json({
  success: false,
  message: "Error description",
  error: process.env.NODE_ENV === 'development' ? error.message : {}
})
```

### Model Pattern (Class-based)
```javascript
// models/usuario.model.js
class Usuario {
  static async getById(id) {
    const { data, error } = await supabase.from('usuario').select('*').eq('id_usuario', id)
    if (error) throw error
    return data[0]
  }
  
  static async create(userData) { /* Insert logic */ }
  static async update(id, userData) { /* Update logic */ }
}

module.exports = Usuario
```

## Development Commands

```bash
# Development with auto-reload
npm run dev     # nodemon src/index.js (port 3000)

# Production
npm start       # node src/index.js

# API Testing
./test-api.ps1  # PowerShell comprehensive test suite
```

## Environment Setup

```bash
# .env (required)
PORT=3000
NODE_ENV=development

# Supabase connection
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key  
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# JWT authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

## API Endpoints Structure

```
/api/auth        # Login, register, profile
/api/usuarios    # User management (scoped by role)
/api/parkings    # Parking CRUD (multi-tenant)
/api/espacios    # Parking spaces
/api/reservas    # Reservations
/api/ocupaciones # Space occupancy
/api/pagos       # Payments
```

## Database Schema (Supabase)

### Core Tables (from bd.sql)
```sql
usuario              -- Users (id_usuario UUID, nombre, apellido, email, rol, bloqueado, deleted_at)
parking             -- Parkings (id_parking, nombre, direccion, latitud, longitud, id_admin, deleted_at) 
usuario_parking     -- Multi-tenant roles (id_usuario, id_parking, rol_en_parking)
espacio             -- Spaces (id_espacio, id_parking, numero_espacio, estado)
vehiculo            -- Vehicles (id_vehiculo, id_usuario, placa, marca, modelo, color)
reserva             -- Reservations (id_reserva, id_usuario, id_espacio, hora_inicio, hora_fin, estado)
ocupacion           -- Occupancy (id_ocupacion, id_reserva, id_usuario, id_espacio, hora_entrada, hora_salida)
pago                -- Payments (id_pago, id_ocupacion, id_metodo, monto, estado, fecha_pago)
metodopago          -- Payment methods (id_metodo, nombre)
tarifa              -- Pricing (id_tarifa, id_parking, tipo, monto, condiciones)
notificacion        -- Notifications (id_notificacion, id_usuario, mensaje, tipo, estado)
```

### Multi-Tenant Queries
```javascript
// Get user's assigned parkings
const parkings = await UsuarioParking.getParkingIdsByUser(userId)

// Scope queries by parking assignment
const { data } = await supabase.from('espacio')
  .select('*').in('id_parking', userParkingIds)
```

## Key Dependencies

- **Express 5**: Web framework
- **Supabase**: PostgreSQL database with RLS
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT auth tokens
- **cors**: Cross-origin requests
- **morgan**: HTTP request logging

## Critical Security Patterns

1. **Dual validation**: Frontend filtering + backend middleware authorization
2. **Multi-tenant isolation**: Users only access assigned parkings via `usuario_parking`
3. **JWT + Supabase RLS**: Double security layer
4. **Role escalation prevention**: `cliente` users blocked from admin operations
5. **Parameterized queries**: Supabase handles SQL injection prevention

## Testing

Use `test-api.ps1` to validate:
- User registration/login flows
- Role-based endpoint access
- Multi-tenant data isolation
- Error handling consistency

When adding new endpoints, maintain the controller→model→response pattern and always implement proper role-based authorization.