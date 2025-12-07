// ===========================================
// Plugin d'authentification Fastify
// ===========================================

import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@plumenote/database';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorizeAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: {
      userId: string;
      username: string;
      roleId: string;
    };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Décorateur d'authentification
  fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      throw err;
    }
  });

  // Décorateur d'autorisation admin
  fastify.decorate('authorizeAdmin', async function(request: FastifyRequest, reply: FastifyReply) {
    console.log('[authorizeAdmin] request.user:', request.user);

    if (!request.user?.userId) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { role: true },
    });

    console.log('[authorizeAdmin] DB user:', user?.username, 'role:', user?.role?.name);

    if (!user || user.role.name !== 'admin') {
      reply.status(403).send({ error: 'FORBIDDEN', message: 'Admin access required' });
      throw new Error('Admin access required');
    }
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['@fastify/jwt'],
});
