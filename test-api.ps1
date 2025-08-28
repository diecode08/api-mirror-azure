# Script para probar la API de Parking en PowerShell
# Este script verifica las funcionalidades básicas de la API

# URL base de la API
$API_URL = "http://localhost:3000/api"

# Función para imprimir mensajes de sección
function Print-Section($message) {
    Write-Host "`n==== $message ====`n" -ForegroundColor Yellow
}

# Función para imprimir mensajes de éxito
function Print-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

# Función para imprimir mensajes de error
function Print-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

# 1. Verificar el registro de usuarios
Print-Section "1. Registro de Usuario"

Write-Host "Registrando un nuevo usuario cliente..."
$registerBody = @{
    email = "cliente@example.com"
    password = "Password123!"
    nombre = "Usuario"
    apellido = "Cliente"
    telefono = "1234567890"
    rol = "cliente"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerBody -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $registerResponse | ConvertTo-Json -Depth 4
    $clienteToken = $registerResponse.data.token
    Print-Success "Usuario cliente registrado exitosamente"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error al registrar usuario cliente"
}

Write-Host "`nRegistrando un usuario administrador..."
$registerAdminBody = @{
    email = "admin@example.com"
    password = "Password123!"
    nombre = "Usuario"
    apellido = "Admin"
    telefono = "0987654321"
    rol = "admin"
} | ConvertTo-Json

try {
    $registerAdminResponse = Invoke-RestMethod -Uri "$API_URL/auth/register" -Method Post -ContentType "application/json" -Body $registerAdminBody -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $registerAdminResponse | ConvertTo-Json -Depth 4
    $adminToken = $registerAdminResponse.data.token
    Print-Success "Usuario administrador registrado exitosamente"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error al registrar usuario administrador"
}

# 2. Verificar el inicio de sesión
Print-Section "2. Inicio de Sesión"

Write-Host "Iniciando sesión con usuario cliente..."
$loginBody = @{
    email = "cliente@example.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $loginResponse | ConvertTo-Json -Depth 4
    $clienteToken = $loginResponse.data.token
    Print-Success "Inicio de sesión exitoso como cliente"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error al iniciar sesión como cliente"
}

Write-Host "`nIniciando sesión con usuario administrador..."
$loginAdminBody = @{
    email = "admin@example.com"
    password = "Password123!"
} | ConvertTo-Json

try {
    $loginAdminResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -ContentType "application/json" -Body $loginAdminBody -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $loginAdminResponse | ConvertTo-Json -Depth 4
    $adminToken = $loginAdminResponse.data.token
    Print-Success "Inicio de sesión exitoso como administrador"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error al iniciar sesión como administrador"
}

# 3. Verificar la obtención del perfil
Print-Section "3. Obtención del Perfil"

Write-Host "Obteniendo perfil con token de cliente..."
try {
    $headers = @{
        "Authorization" = "Bearer $clienteToken"
    }
    $profileResponse = Invoke-RestMethod -Uri "$API_URL/auth/profile" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $profileResponse | ConvertTo-Json -Depth 4
    Print-Success "Perfil obtenido exitosamente"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error al obtener perfil"
}

# 4. Verificar la validación de roles
Print-Section "4. Validación de Roles"

# Intentar acceder a un endpoint protegido para administradores con token de cliente
Write-Host "Intentando acceder a un endpoint de admin con token de cliente..."
try {
    $headers = @{
        "Authorization" = "Bearer $clienteToken"
    }
    $adminAccessResponse = Invoke-RestMethod -Uri "$API_URL/usuarios" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $adminAccessResponse | ConvertTo-Json -Depth 4
    Print-Error "Error en la validación de roles - Cliente pudo acceder a recursos de administrador"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    if ($_.Exception.Response.StatusCode -eq 403) {
        Print-Success "Validación de roles funcionando correctamente - Acceso denegado para cliente"
    } else {
        Print-Error "Error inesperado al validar roles"
    }
}

# Intentar acceder al mismo endpoint con token de administrador
Write-Host "`nAccediendo al mismo endpoint con token de administrador..."
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $adminAccessResponse2 = Invoke-RestMethod -Uri "$API_URL/usuarios" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "Respuesta del servidor:"
    $adminAccessResponse2 | ConvertTo-Json -Depth 4
    Print-Success "Validación de roles funcionando correctamente - Acceso permitido para administrador"
} catch {
    Write-Host "Respuesta del servidor:"
    $_.Exception.Response.GetResponseStream() | % {
        $reader = New-Object System.IO.StreamReader($_)
        $reader.BaseStream.Position = 0
        $reader.ReadToEnd()
    }
    Print-Error "Error en la validación de roles - Administrador no pudo acceder a sus recursos"
}

# 5. Resumen de la prueba
Print-Section "5. Resumen de la Prueba"

Write-Host "La API de Parking ha sido probada en las siguientes áreas:`n"
Write-Host "1. Registro de usuarios (cliente y administrador)"
Write-Host "2. Inicio de sesión y obtención de tokens JWT"
Write-Host "3. Obtención del perfil de usuario"
Write-Host "4. Validación de roles y permisos"

Write-Host "`nPara continuar probando otras funcionalidades de la API, puede usar los siguientes tokens:`n"
Write-Host "Token de Cliente: $clienteToken"
Write-Host "Token de Administrador: $adminToken"

Write-Host "`nUtilice estos tokens en el encabezado 'Authorization: Bearer <token>' para sus solicitudes."