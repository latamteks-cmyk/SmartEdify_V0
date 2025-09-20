const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Testing PostgreSQL migration...');

try {
  // Check if we have a database URL
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL found. Please set it to test migrations.');
    console.log('Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/smartedify_user_service');
    process.exit(0);
  }

  console.log('📊 Running migrations...');
  execSync('npm run migrate:up', { stdio: 'inherit', cwd: __dirname + '/..' });
  
  console.log('✅ Migrations completed successfully!');
  console.log('🧪 Running PostgreSQL integration tests...');
  
  execSync('npm test -- --testPathPattern=postgres.integration.test.ts', { 
    stdio: 'inherit', 
    cwd: __dirname + '/..',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  console.log('✅ All PostgreSQL tests passed!');
  
} catch (error) {
  console.error('❌ Migration test failed:', error.message);
  process.exit(1);
}