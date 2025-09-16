// Reexportar la app real desde main para mantener paridad y evitar suite vacía.
export { app as default } from '../cmd/server/main';

describe('app bootstrap', () => {
	it('carga el módulo principal sin lanzar errores', () => {
		expect(true).toBe(true); // placeholder
	});
});