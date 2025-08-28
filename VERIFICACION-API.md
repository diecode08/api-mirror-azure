# Guía de Verificación de la API de Parking

Este documento proporciona instrucciones detalladas sobre cómo verificar el correcto funcionamiento de la API de Parking, con énfasis en la autenticación, creación de usuarios y verificación de roles.

## Requisitos Previos

1. Asegúrate de que la API esté en ejecución con `npm start`
2. Verifica que las variables de entorno estén configuradas correctamente en el archivo `.env`:
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_KEY`: Clave de API de Supabase
   - `JWT_SECRET`: Clave secreta para firmar tokens JWT

## Métodos de Verificación

Hay tres formas principales de verificar la API:

1. **Scripts Automatizados**: Utilizando los scripts proporcionados
2. **Herramientas de API**: Como Postman o Insomnia
3. **Comandos Curl**: Directamente desde la línea de comandos

## 1. Usando los Scripts Automatizados

Se han proporcionado dos scripts para verificar automáticamente las funcionalidades principales:

### En Windows (PowerShell)

```powershell
# Ejecutar desde PowerShell
.\test-api.ps1
```

### En Linux/Mac (Bash)

```bash
# Dar permisos de ejecución
chmod +x test-api.sh

# Ejecutar el script
./test-api.sh
```

Estos scripts realizarán automáticamente las siguientes pruebas:

1. Registro de usuarios (cliente y administrador)
2. Inicio de sesión y obtención de tokens JWT
3. Obtención del perfil de usuario
4. Validación de roles y permisos

## 2. Usando Postman o Insomnia

Si prefieres usar una herramienta gráfica como Postman, sigue estos pasos:

### Registro de Usuario

1. **Método**: POST
2. **URL**: `http://localhost:3000/api/auth/register`
3. **Headers**: `Content-Type: application/json`
4. **Body**:
   ```json
   {
     "email": "usuario@example.com",
     "password": "Password123!",
     "nombre": "Nombre",
     "apellido": "Apellido",
     "telefono": "1234567890",
     "rol": "cliente"
   }
   ```

### Inicio de Sesión

1. **Método**: POST
2. **URL**: `http://localhost:3000/api/auth/login`
3. **Headers**: `Content-Type: application/json`
4. **Body**:
   ```json
   {
     "email": "usuario@example.com",
     "password": "Password123!"
   }
   ```
5. **Guardar el token**: De la respuesta, guarda el valor del campo `data.token`

### Obtener Perfil

1. **Método**: GET
2. **URL**: `http://localhost:3000/api/auth/profile`
3. **Headers**: 
   - `Content-Type: application/json`
   - `Authorization: Bearer <token>` (reemplaza `<token>` con el token obtenido)

### Verificar Roles

Para verificar que los roles funcionan correctamente:

1. Crea un usuario con rol `cliente` y otro con rol `admin`
2. Intenta acceder a un endpoint protegido para administradores con el token del cliente:
   - **Método**: GET
   - **URL**: `http://localhost:3000/api/usuarios`
   - **Headers**: `Authorization: Bearer <token-cliente>`
   - **Resultado esperado**: Error 403 (Forbidden)

3. Intenta acceder al mismo endpoint con el token del administrador:
   - **Método**: GET
   - **URL**: `http://localhost:3000/api/usuarios`
   - **Headers**: `Authorization: Bearer <token-admin>`
   - **Resultado esperado**: Éxito (200 OK)

## 3. Usando Curl desde la Línea de Comandos

### Registro de Usuario

```bash
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "Password123!",
    "nombre": "Nombre",
    "apellido": "Apellido",
    "telefono": "1234567890",
    "rol": "cliente"
  }'
```

### Inicio de Sesión

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "Password123!"
  }'
```

### Obtener Perfil

```bash
curl -X GET "http://localhost:3000/api/auth/profile" \
  -H "Authorization: Bearer <token>"
```

## Verificación de Roles Específicos

### Roles Disponibles

La API soporta los siguientes roles:

- `cliente`: Usuario normal que puede reservar espacios, registrar ocupaciones, etc.
- `admin`: Administrador del sistema con acceso a todas las funcionalidades
- `parking_admin`: Administrador de un parking específico

### Verificación de Permisos por Rol

#### Cliente

Un usuario con rol `cliente` debería poder:

- Registrarse e iniciar sesión
- Ver y actualizar su perfil
- Crear, ver y gestionar sus vehículos
- Buscar parkings y espacios disponibles
- Crear reservas y ocupaciones para sus vehículos
- Ver y gestionar sus pagos
- Ver sus notificaciones

Pero NO debería poder:

- Ver la lista de todos los usuarios
- Crear o modificar parkings
- Acceder a reservas u ocupaciones de otros usuarios

#### Administrador

Un usuario con rol `admin` debería poder acceder a todas las funcionalidades, incluyendo:

- Ver la lista de todos los usuarios
- Crear, modificar y eliminar parkings
- Ver todas las reservas y ocupaciones
- Gestionar métodos de pago
- Enviar notificaciones a los usuarios

## Solución de Problemas

Si encuentras errores durante la verificación, revisa lo siguiente:

1. **Conexión a Supabase**: Verifica que las credenciales de Supabase sean correctas y que la conexión esté funcionando.
2. **Variables de Entorno**: Asegúrate de que todas las variables en el archivo `.env` estén configuradas correctamente.
3. **Servidor en Ejecución**: Confirma que el servidor esté en ejecución y escuchando en el puerto correcto.
4. **Formato de Token**: Verifica que estés incluyendo el token en el formato correcto: `Bearer <token>`.
5. **Logs del Servidor**: Revisa los logs del servidor para obtener más información sobre posibles errores.

## Conclusión

Siguiendo esta guía, deberías poder verificar que la API de Parking funciona correctamente, especialmente en lo relacionado con la autenticación, creación de usuarios y verificación de roles. Si encuentras algún problema o tienes preguntas adicionales, consulta la documentación o contacta al equipo de desarrollo.