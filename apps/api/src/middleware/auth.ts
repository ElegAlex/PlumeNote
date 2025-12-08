// ===========================================
// Middleware d'authentification
// ===========================================

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { prisma } from '@plumenote/database';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      username: string;
      roleId: string;
    };
  }
}

/**
 * Crée un middleware d'authentification lié à l'instance Fastify
 */
export function createAuthMiddleware(app: FastifyInstance) {
  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      throw err;
    }
  };
}

/**
 * Crée un middleware d'autorisation admin
 */
export function createAdminMiddleware() {
  return async function authorizeAdmin(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // D'abord authentifier l'utilisateur via JWT
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      throw err;
    }

    if (!request.user?.userId) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { role: true },
    });

    if (!user || user.role.name !== 'admin') {
      reply.status(403).send({ error: 'FORBIDDEN', message: 'Admin access required' });
      throw new Error('Admin access required');
    }
  };
}

/**
 * Crée un middleware d'autorisation éditeur
 */
export function createEditorMiddleware() {
  return async function authorizeEditor(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // D'abord authentifier l'utilisateur via JWT
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
      throw err;
    }

    if (!request.user?.userId) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'User not authenticated' });
      throw new Error('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { role: true },
    });

    if (!user || !['admin', 'editor'].includes(user.role.name)) {
      reply.status(403).send({ error: 'FORBIDDEN', message: 'Editor access required' });
      throw new Error('Editor access required');
    }
  };
}

/**
 * Enregistre les décorateurs d'authentification sur l'instance Fastify
 */
export function registerAuthMiddleware(app: FastifyInstance) {
  const authenticate = createAuthMiddleware(app);
  const authorizeAdmin = createAdminMiddleware();
  const authorizeEditor = createEditorMiddleware();

  app.decorate('authenticate', authenticate);
  app.decorate('authorizeAdmin', authorizeAdmin);
  app.decorate('authorizeEditor', authorizeEditor);
}

// Type augmentation for Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: ReturnType<typeof createAuthMiddleware>;
    authorizeAdmin: ReturnType<typeof createAdminMiddleware>;
    authorizeEditor: ReturnType<typeof createEditorMiddleware>;
  }
}
