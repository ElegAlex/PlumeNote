// ===========================================
// Routes Health Check
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@collabnotes/database';

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

    const allOk = Object.values(checks).every(v => v === 'ok');

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks: {
        ...checks,
        timestamp: new Date().toISOString(),
      },
    });
  });
};
