// ===========================================
// CollabNotes API - Configuration Fastify
// ===========================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { registerAuthMiddleware } from './middleware/auth.js';

// Routes
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { foldersRoutes } from './routes/folders.js';
import { notesRoutes } from './routes/notes.js';
import { searchRoutes } from './routes/search.js';
import { tagsRoutes } from './routes/tags.js';
import { permissionsRoutes } from './routes/permissions.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
import { graphRoutes } from './routes/graph.js';
import { exportRoutes } from './routes/export.js';
import { importRoutes } from './routes/import.js';
import { dataviewRoutes } from './routes/dataview.js';
import { attachmentsRoutes } from './routes/attachments.js';

export async function buildApp() {
  const app = Fastify({
    logger: logger,
    trustProxy: true,
  });

  // ----- Plugins de sécurité -----
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.cookieSecret,
    parseOptions: {},
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // ----- Middleware d'authentification -----
  registerAuthMiddleware(app);

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    keyGenerator: (request) => {
      return request.ip;
    },
  });

  // ----- Plugins utilitaires -----
  await app.register(sensible);

  await app.register(multipart, {
    limits: {
      fileSize: config.maxFileSizeMb * 1024 * 1024,
    },
  });

  // ----- Documentation API (Swagger) -----
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'CollabNotes API',
        description: 'API de la plateforme de gestion de notes collaboratives',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'token',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // ----- Routes -----
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(usersRoutes, { prefix: '/api/v1/users' });
  await app.register(foldersRoutes, { prefix: '/api/v1/folders' });
  await app.register(notesRoutes, { prefix: '/api/v1/notes' });
  await app.register(searchRoutes, { prefix: '/api/v1/search' });
  await app.register(tagsRoutes, { prefix: '/api/v1/tags' });
  await app.register(permissionsRoutes, { prefix: '/api/v1/permissions' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(graphRoutes, { prefix: '/api/v1/graph' });
  await app.register(exportRoutes, { prefix: '/api/v1/export' });
  await app.register(importRoutes, { prefix: '/api/v1/import' });
  await app.register(dataviewRoutes, { prefix: '/api/v1/dataview' });
  await app.register(attachmentsRoutes, { prefix: '/api/v1/attachments' });

  // ----- Error Handler global -----
  app.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, requestId: request.id }, 'Request error');

    // Erreurs de validation Zod
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.validation,
        },
      });
    }

    // Erreurs HTTP standard
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message,
        },
      });
    }

    // Erreur interne
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.env === 'production'
          ? 'An internal error occurred'
          : error.message,
      },
    });
  });

  return app;
}
