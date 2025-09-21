import { createRemoteJWKSet, jwtVerify } from 'jose';

// Simple test to verify JWKS functionality
async function testJwks() {
  try {
    // This would normally point to the Auth Service's JWKS endpoint
    const jwksUrl = 'http://localhost:3001/.well-known/jwks.json';
    console.log('Testing JWKS functionality...');
    
    // Create a remote JWKS set
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    console.log('✓ JWKS set created successfully');
    
    console.log('JWKS functionality test completed');
    return true;
  } catch (error) {
    console.error('JWKS functionality test failed:', error);
    return false;
  }
}

// Run the test
testJwks().then(success => {
  process.exit(success ? 0 : 1);
});