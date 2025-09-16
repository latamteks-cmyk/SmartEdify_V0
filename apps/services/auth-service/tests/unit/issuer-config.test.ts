import type { getIssuer as GetIssuerFn, issuerUrl as IssuerUrlFn } from '../../internal/config/issuer';

describe('configuración del issuer', () => {
  const ORIGINAL_ENV_REF = process.env;
  const ORIGINAL_ENV_SNAPSHOT = { ...process.env };

  const resetEnv = () => {
    process.env = { ...ORIGINAL_ENV_SNAPSHOT };
    delete process.env.AUTH_ISSUER;
    delete process.env.AUTH_ISSUER_URL;
    delete process.env.AUTH_PUBLIC_URL;
    delete process.env.AUTH_BASE_URL;
    delete process.env.AUTH_HOST;
    delete process.env.AUTH_PORT;
    delete process.env.AUTH_USE_TLS;
  };

  const loadModule = () =>
    require('../../internal/config/issuer') as {
      getIssuer: typeof GetIssuerFn;
      issuerUrl: typeof IssuerUrlFn;
    };

  beforeEach(() => {
    jest.resetModules();
    resetEnv();
  });

  afterEach(() => {
    jest.resetModules();
    resetEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV_REF;
  });

  it('usa la primera variable disponible y elimina barras sobrantes', () => {
    process.env.AUTH_ISSUER = 'https://issuer.smartedify.dev/base///';
    process.env.AUTH_ISSUER_URL = 'https://secondary.smartedify.dev/otro';

    const { getIssuer } = loadModule();

    expect(getIssuer()).toBe('https://issuer.smartedify.dev/base');
  });

  it('normaliza valores sin esquema y espacios en blanco', () => {
    process.env.AUTH_PUBLIC_URL = '  auth.demo.local/tenants///  ';

    const { getIssuer } = loadModule();

    expect(getIssuer()).toBe('https://auth.demo.local/tenants');
  });

  it('construye el issuer a partir del host, puerto y TLS cuando no hay overrides', () => {
    process.env.AUTH_USE_TLS = 'true';
    process.env.AUTH_HOST = 'interna.smartedify.local//';
    process.env.AUTH_PORT = '8443';

    const { getIssuer } = loadModule();

    expect(getIssuer()).toBe('https://interna.smartedify.local:8443');
  });

  it('compone correctamente rutas relativas y absolutas', () => {
    process.env.AUTH_ISSUER_URL = 'https://issuer.smartedify.dev/api';

    const { getIssuer, issuerUrl } = loadModule();

    expect(getIssuer()).toBe('https://issuer.smartedify.dev/api');
    expect(issuerUrl('/oauth/token')).toBe('https://issuer.smartedify.dev/api/oauth/token');
    expect(issuerUrl('health')).toBe('https://issuer.smartedify.dev/api/health');
    expect(issuerUrl('https://external.service.local/status//')).toBe('https://external.service.local/status');
  });

  it('mantiene en caché el primer valor resuelto', () => {
    process.env.AUTH_PUBLIC_URL = ' primer.smartedify.dev/contexto// ';

    const { getIssuer } = loadModule();

    expect(getIssuer()).toBe('https://primer.smartedify.dev/contexto');

    process.env.AUTH_ISSUER = 'https://segundo.smartedify.dev';
    process.env.AUTH_PUBLIC_URL = 'otro.smartedify.dev';

    expect(getIssuer()).toBe('https://primer.smartedify.dev/contexto');
  });
});
