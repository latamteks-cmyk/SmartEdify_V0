jest.mock('../../internal/adapters/db/pg.adapter', () => ({
  listRoles: jest.fn()
}));

import { rolesHandler, permissionsHandler } from '../../internal/adapters/http/roles-permissions.handler';
import { listRoles } from '../../internal/adapters/db/pg.adapter';

function mockReqRes(query: Record<string, any> = {}) {
  const req: any = { query };
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return { req, res };
}

describe('rolesHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('incluye roles de base de datos y fallback', async () => {
    (listRoles as jest.Mock).mockResolvedValue(['auditor', 'user']);
    const { req, res } = mockReqRes();
    await rolesHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.roles).toEqual(expect.arrayContaining(['auditor', 'user', 'admin', 'guest']));
  });

  it('usa tenantId si está presente', async () => {
    (listRoles as jest.Mock).mockResolvedValue(['admin']);
    const { req, res } = mockReqRes({ tenantId: 'tenant-1' });
    await rolesHandler(req as any, res as any);
    expect(listRoles).toHaveBeenCalledWith('tenant-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('permissionsHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve unión de permisos', async () => {
    (listRoles as jest.Mock).mockResolvedValue(['admin']);
    const { req, res } = mockReqRes();
    await permissionsHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.permissions).toEqual(expect.arrayContaining(['read', 'write', 'delete']));
  });

  it('filtra por rol cuando se solicita', async () => {
    (listRoles as jest.Mock).mockResolvedValue(['custom']);
    const { req, res } = mockReqRes({ role: 'custom' });
    await permissionsHandler(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('role', 'custom');
    expect(payload.permissions.length).toBeGreaterThan(0);
  });
});
