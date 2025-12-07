// ===========================================
// Routes Health Check
// US-052: Ajout vérification Redis
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@plumenote/database';
import { isRedisAvailable } from '../services/cache';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Health check simple
  app.get('/', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // Health check détaillé
  app.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check with dependencies',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const checks: Record<string, string> = {};

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Check Redis (US-052) - optionnel, pas critique
    checks.redis = isRedisAvailable() ? 'ok' : 'unavailable';

    // Seule la DB est critique pour le readiness
    const isReady = checks.database === 'ok';

    return reply.status(isReady ? 200 : 503).send({
      status: isReady ? 'ok' : 'degraded',
      checks: {
        ...checks,
        timestamp: new Date().toISOString(),
      },
    });
  });
};
