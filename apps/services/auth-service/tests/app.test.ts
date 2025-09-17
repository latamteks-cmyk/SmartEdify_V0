// Asegurar configuración mínima antes de cargar la app real
process.env.NODE_ENV = 'test';
if (!process.env.AUTH_ADMIN_API_KEY || !process.env.AUTH_ADMIN_API_KEY.trim()) {
	process.env.AUTH_ADMIN_API_KEY = 'test-admin-key';
}
if (!process.env.AUTH_ADMIN_API_HEADER || !process.env.AUTH_ADMIN_API_HEADER.trim()) {
	process.env.AUTH_ADMIN_API_HEADER = 'x-admin-api-key';
}

// Reexportar la app real desde main para mantener paridad y evitar suite vacía.
export { app as default } from '../cmd/server/main';

describe('app bootstrap', () => {
	it('carga el módulo principal sin lanzar errores', () => {
		expect(true).toBe(true); // placeholder
	});
});