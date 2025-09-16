import request from 'supertest';
import app from '../app.test';

/**
 * Rotación manual de claves:
 * - Asegura que al inicio hay una clave current.
 * - Genera una clave next (forzando insert) realizando un POST /admin/rotate-keys (si falta next se crea current-> permanece y se genera next?)
 * - Segundo POST /admin/rotate-keys debe: mover current->retiring, next->current y crear nueva next.
 * - Validar presencia de statuses esperados vía /.well-known/jwks.json
 */

describe('POST /admin/rotate-keys', () => {
  it('rota correctamente current/next y preserva retiring verificable', async () => {
    // Primer JWKS: sólo current
    let jwksRes = await request(app).get('/.well-known/jwks.json').expect(200);
    const initialKids = jwksRes.body.keys.map((k: any) => k.kid);
    expect(initialKids.length).toBeGreaterThanOrEqual(1);
    const initialCurrent = jwksRes.body.keys.find((k: any) => k.status === 'current');
    expect(initialCurrent).toBeDefined();

    // Primera rotación: si no existe next se generará y current sigue current
    const rotate1 = await request(app).post('/admin/rotate-keys').send({}).expect(200);
    expect(rotate1.body.current.kid).toBeDefined();

    jwksRes = await request(app).get('/.well-known/jwks.json').expect(200);
    const afterFirst = jwksRes.body.keys;
    const hasNext = afterFirst.some((k: any) => k.status === 'next');
    expect(hasNext).toBe(true);

    const currentKidBefore = afterFirst.find((k: any) => k.status === 'current')?.kid;
    const nextKidBefore = afterFirst.find((k: any) => k.status === 'next')?.kid;
    expect(currentKidBefore).toBeDefined();
    expect(nextKidBefore).toBeDefined();

    // Segunda rotación: current -> retiring, next -> current, new next generado
    const rotate2 = await request(app).post('/admin/rotate-keys').send({}).expect(200);
    expect(rotate2.body.current.kid).toBeDefined();

    jwksRes = await request(app).get('/.well-known/jwks.json').expect(200);
    const afterSecond = jwksRes.body.keys;
    const retiring = afterSecond.filter((k: any) => k.status === 'retiring');
    const currentKidAfter = afterSecond.find((k: any) => k.status === 'current')?.kid;
    const nextKidAfter = afterSecond.find((k: any) => k.status === 'next')?.kid;

    // Validaciones de ciclo
    expect(retiring.length).toBeGreaterThanOrEqual(1);
    expect(currentKidAfter).not.toEqual(currentKidBefore); // Debe haber cambiado
    expect(currentKidAfter).toEqual(nextKidBefore); // El old next ahora es current
    expect(nextKidAfter).not.toEqual(nextKidBefore); // Nuevo next distinto
  });
});
