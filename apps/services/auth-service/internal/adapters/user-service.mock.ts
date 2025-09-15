// Mock para simular validación cruzada con User Service
export async function mockValidateUser(email: string): Promise<boolean> {
  // Simula llamada HTTP al User Service
  // En producción sería un fetch/axios, aquí solo lógica mock
  if (email.endsWith('@demo.com')) return true;
  return false;
}
