const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE PARKING');
console.log('=====================================\n');

// 1. Verificar archivo .env
console.log('1. Verificando archivo .env...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ Archivo .env encontrado');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasUrl = envContent.includes('SUPABASE_URL=') && !envContent.includes('tu_url_de_supabase_aqui');
  const hasKey = envContent.includes('SUPABASE_KEY=') && !envContent.includes('tu_clave_anonima_de_supabase_aqui');
  const hasJwt = envContent.includes('JWT_SECRET=') && !envContent.includes('tu_clave_secreta_jwt_aqui');
  
  console.log(`   SUPABASE_URL: ${hasUrl ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   SUPABASE_KEY: ${hasKey ? '✅ Configurado' : '❌ No configurado'}`);
  console.log(`   JWT_SECRET: ${hasJwt ? '✅ Configurado' : '❌ No configurado'}`);
} else {
  console.log('❌ Archivo .env no encontrado');
  console.log('   Ejecuta: node setup-env.js');
}

// 2. Verificar dependencias
console.log('\n2. Verificando dependencias...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = ['@supabase/supabase-js', 'express', 'jsonwebtoken', 'dotenv'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`   ${dep}: ✅ ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`   ${dep}: ❌ No encontrado`);
    }
  });
}

// 3. Verificar estructura de archivos
console.log('\n3. Verificando estructura de archivos...');
const requiredFiles = [
  'src/index.js',
  'src/config/supabase.js',
  'src/models/parking.model.js',
  'src/controllers/parking.controller.js',
  'src/routes/parking.routes.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ${file}: ✅ Encontrado`);
  } else {
    console.log(`   ${file}: ❌ No encontrado`);
  }
});

console.log('\n📋 PRÓXIMOS PASOS:');
console.log('1. Si falta el archivo .env, ejecuta: node setup-env.js');
console.log('2. Configura las variables de entorno en .env');
console.log('3. Instala dependencias: npm install');
console.log('4. Inicia el servidor: npm run dev');
console.log('5. Verifica los logs del servidor para más detalles');
