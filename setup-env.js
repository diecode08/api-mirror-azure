const fs = require('fs');
const path = require('path');

// Crear archivo .env si no existe
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  const envContent = `# Configuración de Supabase
SUPABASE_URL=tu_url_de_supabase_aqui
SUPABASE_KEY=tu_clave_anonima_de_supabase_aqui

# Configuración de JWT
JWT_SECRET=tu_clave_secreta_jwt_aqui

# Configuración del servidor
PORT=3000
NODE_ENV=development`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado exitosamente');
  console.log('📝 Por favor, edita el archivo .env con tus credenciales de Supabase');
  console.log('🔑 Necesitas:');
  console.log('   - SUPABASE_URL: La URL de tu proyecto Supabase');
  console.log('   - SUPABASE_KEY: La clave anónima de tu proyecto Supabase');
  console.log('   - JWT_SECRET: Una clave secreta para firmar tokens JWT');
} else {
  console.log('ℹ️  El archivo .env ya existe');
}

console.log('\n📋 Pasos para configurar:');
console.log('1. Ve a tu proyecto en Supabase');
console.log('2. Ve a Settings > API');
console.log('3. Copia la URL y la clave anónima');
console.log('4. Edita el archivo .env con esos valores');
console.log('5. Reinicia el servidor');
