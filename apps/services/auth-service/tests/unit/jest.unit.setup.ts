// Configuración por defecto del guard administrativo para pruebas unitarias
if (!process.env.AUTH_ADMIN_API_KEY || !process.env.AUTH_ADMIN_API_KEY.trim()) {
  process.env.AUTH_ADMIN_API_KEY = 'test-admin-key';
}
if (!process.env.AUTH_ADMIN_API_HEADER || !process.env.AUTH_ADMIN_API_HEADER.trim()) {
  process.env.AUTH_ADMIN_API_HEADER = 'x-admin-api-key';
}
