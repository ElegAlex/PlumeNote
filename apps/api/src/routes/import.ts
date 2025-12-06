// ===========================================
// Routes Import (EP-008)
// US-082: Import depuis Markdown/ZIP
// US-083: Import depuis Obsidian/Notion
// ===========================================

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { importService } from '../modules/import/index.js';
import { getEffectivePermissions } from '../services/permissions.js';

// ----- Schémas de validation -----

const startImportSchema = z.object({
  targetFolderId: z.string().uuid().optional(),
  conflictStrategy: z.enum(['RENAME', 'SKIP', 'OVERWRITE']).default('RENAME'),
});

const jobIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// ----- Routes -----

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/import/upload
   * Upload un fichier ZIP pour import
   */
  app.post('/upload', {
    schema: {
      tags: ['Import'],
      summary: 'Upload ZIP file for import',
      description: 'Upload a ZIP file containing Markdown notes for import',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fileName: { type: 'string' },
            totalFiles: { type: 'number' },
            markdownFiles: { type: 'array', items: { type: 'string' } },
            directories: { type: 'array', items: { type: 'string' } },
            assetFiles: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;

    // Vérifier les permissions d'écriture
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const hasWriteAccess = permissions.some(
      (p) => p.level === 'WRITE' || p.level === 'ADMIN'
    );

    if (!hasWriteAccess) {
      return reply.status(403).send({
        error: 'NO_WRITE_ACCESS',
        message: "Vous n'avez pas de dossier avec droits d'écriture",
      });
    }

    // Récupérer le fichier
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    // Valider le type de fichier
    const filename = data.filename.toLowerCase();
    if (!filename.endsWith('.zip')) {
      return reply.status(400).send({
        error: 'INVALID_FORMAT',
        message: 'Le fichier doit être au format ZIP',
      });
    }

    // Lire le buffer
    const buffer = await data.toBuffer();

    // Valider la taille (100MB max)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return reply.status(400).send({
        error: 'FILE_TOO_LARGE',
        message: 'Le fichier ne doit pas dépasser 100MB',
      });
    }

    try {
      const preview = await importService.createImportJob(
        userId,
        data.filename,
        buffer
      );

      return reply.status(201).send(preview);
    } catch (error) {
      return reply.status(400).send({
        error: 'PARSE_ERROR',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/v1/import/jobs
   * Liste les imports de l'utilisateur
   */
  app.get('/jobs', {
    schema: {
      tags: ['Import'],
      summary: 'List import jobs',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              fileName: { type: 'string' },
              status: { type: 'string' },
              totalFiles: { type: 'number' },
              processedFiles: { type: 'number' },
              successCount: { type: 'number' },
              errorCount: { type: 'number' },
              warningCount: { type: 'number' },
              createdAt: { type: 'string' },
              startedAt: { type: 'string', nullable: true },
              completedAt: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;
    const jobs = await importService.getJobsByUser(userId);
    return reply.send(jobs);
  });

  /**
   * GET /api/v1/import/jobs/:id
   * Détail d'un import
   */
  app.get('/jobs/:id', {
    schema: {
      tags: ['Import'],
      summary: 'Get import job details',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;
    const { id } = jobIdParamsSchema.parse(request.params);

    const job = await importService.getJobById(userId, id);

    if (!job) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Import non trouvé',
      });
    }

    return reply.send(job);
  });

  /**
   * POST /api/v1/import/jobs/:id/start
   * Démarrer le traitement d'un import
   */
  app.post('/jobs/:id/start', {
    schema: {
      tags: ['Import'],
      summary: 'Start import processing',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          targetFolderId: { type: 'string', format: 'uuid' },
          conflictStrategy: {
            type: 'string',
            enum: ['RENAME', 'SKIP', 'OVERWRITE'],
            default: 'RENAME',
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;
    const { id } = jobIdParamsSchema.parse(request.params);
    const body = startImportSchema.parse(request.body || {});

    try {
      const job = await importService.startImport(userId, id, {
        targetFolderId: body.targetFolderId,
        conflictStrategy: body.conflictStrategy,
      });

      return reply.send(job);
    } catch (error) {
      const message = (error as Error).message;

      if (message.includes('non trouvé')) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message,
        });
      }

      if (message.includes('déjà été traité')) {
        return reply.status(400).send({
          error: 'ALREADY_PROCESSED',
          message,
        });
      }

      return reply.status(400).send({
        error: 'START_ERROR',
        message,
      });
    }
  });

  /**
   * DELETE /api/v1/import/jobs/:id
   * Supprimer un import
   */
  app.delete('/jobs/:id', {
    schema: {
      tags: ['Import'],
      summary: 'Delete import job',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;
    const { id } = jobIdParamsSchema.parse(request.params);

    try {
      await importService.deleteJob(userId, id);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/v1/import (rétrocompatibilité)
   * Import direct simple (ancien comportement)
   */
  app.post('/', {
    schema: {
      tags: ['Import'],
      summary: 'Quick import (legacy)',
      description: 'Import notes directly from Markdown files or ZIP archive',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;

    // Vérifier les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const hasWriteAccess = permissions.some(
      (p) => p.level === 'WRITE' || p.level === 'ADMIN'
    );

    if (!hasWriteAccess) {
      return reply.status(403).send({
        error: 'NO_WRITE_ACCESS',
        message: "Vous n'avez pas de dossier avec droits d'écriture",
      });
    }

    // Récupérer le fichier
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    const filename = data.filename.toLowerCase();
    const buffer = await data.toBuffer();

    // Pour un fichier .md unique, utiliser le nouveau système aussi
    if (!filename.endsWith('.zip') && !filename.endsWith('.md')) {
      return reply.status(400).send({
        error: 'UNSUPPORTED_FORMAT',
        message: 'Format non supporté. Utilisez .md ou .zip',
      });
    }

    try {
      // Créer le job et le démarrer immédiatement
      const preview = await importService.createImportJob(
        userId,
        data.filename,
        buffer
      );

      const job = await importService.startImport(userId, preview.id, {
        conflictStrategy: 'RENAME',
      });

      return reply.send({
        success: true,
        jobId: job.id,
        message: `Import démarré: ${preview.totalFiles} fichier(s) à traiter`,
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'IMPORT_ERROR',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/v1/import/obsidian
   * Import depuis un vault Obsidian
   */
  app.post('/obsidian', {
    schema: {
      tags: ['Import'],
      summary: 'Import from Obsidian vault',
      description: 'Import notes from an Obsidian vault ZIP export',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Utilise la même logique que /upload
    // L'extracteur ZIP gère déjà le format Obsidian
    const userId = request.user.userId;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    const buffer = await data.toBuffer();

    try {
      const preview = await importService.createImportJob(
        userId,
        data.filename,
        buffer
      );

      return reply.status(201).send({
        ...preview,
        message: `Vault Obsidian détecté: ${preview.totalFiles} notes Markdown`,
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'PARSE_ERROR',
        message: (error as Error).message,
      });
    }
  });
};
