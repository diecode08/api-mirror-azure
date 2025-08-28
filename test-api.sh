#!/bin/bash

# Script para probar la API de Parking
# Este script verifica las funcionalidades básicas de la API

# Colores para la salida
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
NC="\033[0m" # No Color

# URL base de la API
API_URL="http://localhost:3000/api"

# Función para imprimir mensajes de sección
print_section() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Función para imprimir mensajes de éxito
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Función para imprimir mensajes de error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# 1. Verificar el registro de usuarios
print_section "1. Registro de Usuario"

echo "Registrando un nuevo usuario cliente..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "Password123!",
    "nombre": "Usuario",
    "apellido": "Cliente",
    "telefono": "1234567890",
    "rol": "cliente"
  }')

echo "Respuesta del servidor:"
echo "$REGISTER_RESPONSE" | json_pp

# Extraer el token del cliente para usarlo más tarde
CLIENTE_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [[ $REGISTER_RESPONSE == *'"success":true'* ]]; then
  print_success "Usuario cliente registrado exitosamente"
else
  print_error "Error al registrar usuario cliente"
fi

echo "\nRegistrando un usuario administrador..."
REGISTER_ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!",
    "nombre": "Usuario",
    "apellido": "Admin",
    "telefono": "0987654321",
    "rol": "admin"
  }')

echo "Respuesta del servidor:"
echo "$REGISTER_ADMIN_RESPONSE" | json_pp

# Extraer el token del admin para usarlo más tarde
ADMIN_TOKEN=$(echo "$REGISTER_ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [[ $REGISTER_ADMIN_RESPONSE == *'"success":true'* ]]; then
  print_success "Usuario administrador registrado exitosamente"
else
  print_error "Error al registrar usuario administrador"
fi

# 2. Verificar el inicio de sesión
print_section "2. Inicio de Sesión"

echo "Iniciando sesión con usuario cliente..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@example.com",
    "password": "Password123!"
  }')

echo "Respuesta del servidor:"
echo "$LOGIN_RESPONSE" | json_pp

# Actualizar el token del cliente
CLIENTE_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [[ $LOGIN_RESPONSE == *'"success":true'* ]]; then
  print_success "Inicio de sesión exitoso como cliente"
else
  print_error "Error al iniciar sesión como cliente"
fi

echo "\nIniciando sesión con usuario administrador..."
LOGIN_ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!"
  }')

echo "Respuesta del servidor:"
echo "$LOGIN_ADMIN_RESPONSE" | json_pp

# Actualizar el token del admin
ADMIN_TOKEN=$(echo "$LOGIN_ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [[ $LOGIN_ADMIN_RESPONSE == *'"success":true'* ]]; then
  print_success "Inicio de sesión exitoso como administrador"
else
  print_error "Error al iniciar sesión como administrador"
fi

# 3. Verificar la obtención del perfil
print_section "3. Obtención del Perfil"

echo "Obteniendo perfil con token de cliente..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $CLIENTE_TOKEN")

echo "Respuesta del servidor:"
echo "$PROFILE_RESPONSE" | json_pp

if [[ $PROFILE_RESPONSE == *'"success":true'* ]]; then
  print_success "Perfil obtenido exitosamente"
else
  print_error "Error al obtener perfil"
fi

# 4. Verificar la validación de roles
print_section "4. Validación de Roles"

# Intentar acceder a un endpoint protegido para administradores con token de cliente
echo "Intentando acceder a un endpoint de admin con token de cliente..."
ADMIN_ACCESS_RESPONSE=$(curl -s -X GET "$API_URL/usuarios" \
  -H "Authorization: Bearer $CLIENTE_TOKEN")

echo "Respuesta del servidor:"
echo "$ADMIN_ACCESS_RESPONSE" | json_pp

if [[ $ADMIN_ACCESS_RESPONSE == *'"success":false'* && $ADMIN_ACCESS_RESPONSE == *'permisos'* ]]; then
  print_success "Validación de roles funcionando correctamente - Acceso denegado para cliente"
else
  print_error "Error en la validación de roles - Cliente pudo acceder a recursos de administrador"
fi

# Intentar acceder al mismo endpoint con token de administrador
echo "\nAccediendo al mismo endpoint con token de administrador..."
ADMIN_ACCESS_RESPONSE_2=$(curl -s -X GET "$API_URL/usuarios" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "Respuesta del servidor:"
echo "$ADMIN_ACCESS_RESPONSE_2" | json_pp

if [[ $ADMIN_ACCESS_RESPONSE_2 == *'"success":true'* ]]; then
  print_success "Validación de roles funcionando correctamente - Acceso permitido para administrador"
else
  print_error "Error en la validación de roles - Administrador no pudo acceder a sus recursos"
fi

# 5. Resumen de la prueba
print_section "5. Resumen de la Prueba"

echo -e "La API de Parking ha sido probada en las siguientes áreas:\n"
echo -e "1. Registro de usuarios (cliente y administrador)"
echo -e "2. Inicio de sesión y obtención de tokens JWT"
echo -e "3. Obtención del perfil de usuario"
echo -e "4. Validación de roles y permisos"

echo -e "\nPara continuar probando otras funcionalidades de la API, puede usar los siguientes tokens:\n"
echo -e "Token de Cliente: $CLIENTE_TOKEN"
echo -e "Token de Administrador: $ADMIN_TOKEN"

echo -e "\nUtilice estos tokens en el encabezado 'Authorization: Bearer <token>' para sus solicitudes."