import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Esquema de validación de query
const ctxQuerySchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid()
});

// Función simple para derivar una versión numérica estable a partir del contenido
function computeVersion(payload: { roles: string[] }) {
  const base = payload.roles.sort().join('|');
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0; // unsigned
  }
  // Evitar 0
  return hash === 0 ? 1 : hash;
}

export async function tenantContextRoute(app: FastifyInstance) {
  app.get('/tenant-context', async (req: FastifyRequest<{ Querystring: any }>, reply) => {
    const parsed = ctxQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'validation_error', details: parsed.error.flatten() });
    }
    const { tenantId, userId } = parsed.data;

  // Roles combinados: governance + roles asignados
  let roles: string[] = [];
    try {
      // governanceRepo no tiene método directo de búsqueda en el scaffold actual.
      // Implementación mínima: consultar directamente la DB vía repos existentes si fuera necesario.
      // Aquí asumimos que el único rol posible en Fase 0 es 'admin' y se deduce buscando coincidencia
      // en tabla governance_positions (omitir si no disponible en repos públicos).
      const maybeAdmin = await app.di.governanceRepo.isAdmin?.(tenantId, userId);
      if (maybeAdmin) roles.push('admin');
      if (app.di.rolesRepo) {
        const assigned = await app.di.rolesRepo.getUserRoles(tenantId, userId);
        roles.push(...assigned);
      }
    } catch (e) {
      // Ignorar si el método no existe; fallback se mantiene vacío.
    }

    // Memberships podrían influir en validación futura de acceso; no agregan roles de gobierno ahora.

    if (roles.length === 0) {
      // En Fase 0 interpretamos como 404 si no tiene contexto (ni membership ni governance relevante)
      return reply.code(404).send({ error: 'not_found' });
    }

    const version = computeVersion({ roles });
    return reply.code(200).send({ userId, tenantId, roles, version });
  });
}
