import request from 'supertest';
import { bootstrap } from './tests/utils/bootstrap.ts';
import { clearAllStores } from './internal/adapters/redis/redis.adapter.ts';

async function debugRegister() {
  console.log('🔍 Iniciando debug del registro...');
  
  try {
    const app = await bootstrap();
    console.log('✅ App bootstrap completado');
    
    // Clear stores
    await clearAllStores();
    console.log('✅ Stores limpiados');
    
    // Try register
    const registerData = {
      email: 'debug-test@demo.com',
      password: 'password123',
      name: 'Debug User',
      tenant_id: '01234567-89ab-cdef-0123-456789abcdef'
    };
    
    console.log('📨 Enviando request de registro:', registerData);
    
    const response = await request(app)
      .post('/register')
      .send(registerData);
    
    console.log('📥 Respuesta del registro:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
    console.log('Headers:', response.headers);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugRegister();