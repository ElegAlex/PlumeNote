// ===========================================
// Routes Attachments (US-028)
// Gestion des pièces jointes (images, fichiers)
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import { createAuditLog } from '../services/audit.js';
import { checkPermission } from '../services/permissions.js';
import { config } from '../config/index.js';
import {
  LocalStorageProvider,
  ImageProcessor,
  FileValidator,
  FileValidationError,
  MIME_TO_EXTENSION,
} from '../services/storage/index.js';
import { logger } from '../lib/logger.js';

// ----- Initialisation des services -----

const storageProvider = new LocalStorageProvider(
  config.uploadDir,
  '/api/v1/attachments'
);
const imageProcessor = new ImageProcessor({
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 85,
});
const fileValidator = new FileValidator();

// ----- Schémas de validation -----

const uploadQuerySchema = z.object({
  noteId: z.string().uuid(),
});

const attachmentParamsSchema = z.object({
  id: z.string().uuid(),
});

const noteIdParamsSchema = z.object({
  noteId: z.string().uuid(),
});

// ----- Routes -----

export const attachmentsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/attachments/upload
   * Upload un fichier attaché à une note
   */
  app.post<{
    Querystring: z.infer<typeof uploadQuerySchema>;
  }>('/upload', {
    schema: {
      tags: ['Attachments'],
      summary: 'Upload attachment',
      description: 'Upload a file and attach it to a note',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          noteId: { type: 'string', format: 'uuid' },
        },
        required: ['noteId'],
      },
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                url: { type: 'string' },
                filename: { type: 'string' },
                mimeType: { type: 'string' },
                size: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    // Valider les paramètres
    const queryParse = uploadQuerySchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'noteId is required in query parameters',
          details: queryParse.error.flatten(),
        },
      });
    }
    const { noteId } = queryParse.data;

    // Vérifier que la note existe
    const note = await prisma.note.findUnique({
      where: { id: noteId, isDeleted: false },
      select: { id: true, folderId: true },
    });

    if (!note) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Note not found',
        },
      });
    }

    // Vérifier les permissions d'écriture
    const hasWriteAccess = await checkPermission(
      userId,
      'NOTE',
      noteId,
      'WRITE'
    );

    if (!hasWriteAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Write access required to upload attachments',
        },
      });
    }

    // Récupérer le fichier uploadé
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file provided',
        },
      });
    }

    try {
      // Lire le buffer du fichier
      const buffer = await file.toBuffer();

      // Valider le fichier
      const validation = fileValidator.validate({
        filename: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
      });

      // Traiter les images (compression/redimensionnement)
      let processedBuffer = buffer;
      let finalMimeType = file.mimetype;

      if (validation.category === 'image' && fileValidator.isImage(file.mimetype)) {
        // Ne pas traiter les SVG
        if (file.mimetype !== 'image/svg+xml') {
          const processed = await imageProcessor.process(buffer);
          processedBuffer = processed.buffer;
          finalMimeType = processed.mimeType;
        }
      }

      // Générer l'ID et le chemin de stockage
      const attachmentId = randomUUID();
      const extension = MIME_TO_EXTENSION[finalMimeType] || validation.extension;
      const storagePath = `attachments/${noteId}/${attachmentId}.${extension}`;

      // Uploader le fichier
      await storageProvider.upload(storagePath, processedBuffer, {
        contentType: finalMimeType,
      });

      // Sauvegarder les métadonnées en base
      const attachment = await prisma.attachment.create({
        data: {
          id: attachmentId,
          noteId,
          filename: validation.sanitizedFilename || file.filename,
          mimeType: finalMimeType,
          sizeBytes: processedBuffer.length,
          storagePath,
          uploadedBy: userId,
        },
      });

      // Audit log
      await createAuditLog({
        userId,
        action: 'UPLOAD_ATTACHMENT',
        resourceType: 'ATTACHMENT',
        resourceId: attachment.id,
        details: {
          noteId,
          filename: file.filename,
          mimeType: finalMimeType,
          sizeBytes: processedBuffer.length,
          wasProcessed: processedBuffer.length !== buffer.length,
        },
      });

      logger.info({
        attachmentId: attachment.id,
        noteId,
        userId,
        filename: file.filename,
        size: processedBuffer.length,
      }, 'Attachment uploaded');

      return reply.status(201).send({
        success: true,
        data: {
          id: attachment.id,
          url: storageProvider.getUrl(storagePath),
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.sizeBytes,
        },
      });
    } catch (error) {
      if (error instanceof FileValidationError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      }

      logger.error({ err: error, userId, noteId }, 'Upload failed');
      throw error;
    }
  });

  /**
   * GET /api/v1/attachments/:id
   * Télécharge/affiche un fichier attaché
   */
  app.get<{
    Params: z.infer<typeof attachmentParamsSchema>;
  }>('/:id', {
    schema: {
      tags: ['Attachments'],
      summary: 'Get attachment',
      description: 'Download or display an attachment',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    const paramsParse = attachmentParamsSchema.safeParse(request.params);
    if (!paramsParse.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid attachment ID',
        },
      });
    }
    const { id } = paramsParse.data;

    // Récupérer l'attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        noteId: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storagePath: true,
      },
    });

    if (!attachment) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        },
      });
    }

    // Vérifier les permissions de lecture sur la note
    const hasReadAccess = await checkPermission(
      userId,
      'NOTE',
      attachment.noteId,
      'READ'
    );

    if (!hasReadAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Read access required',
        },
      });
    }

    try {
      // Télécharger le fichier depuis le stockage
      const buffer = await storageProvider.download(attachment.storagePath);

      // Headers pour le cache et le type de contenu
      reply.header('Content-Type', attachment.mimeType);
      reply.header('Content-Length', buffer.length);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');

      // Pour les images, afficher inline; sinon, proposer téléchargement
      const disposition = attachment.mimeType.startsWith('image/')
        ? 'inline'
        : `attachment; filename="${attachment.filename}"`;
      reply.header('Content-Disposition', disposition);

      return reply.send(buffer);
    } catch (error) {
      logger.error({ err: error, attachmentId: id }, 'Download failed');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download attachment',
        },
      });
    }
  });

  /**
   * DELETE /api/v1/attachments/:id
   * Supprime un fichier attaché
   */
  app.delete<{
    Params: z.infer<typeof attachmentParamsSchema>;
  }>('/:id', {
    schema: {
      tags: ['Attachments'],
      summary: 'Delete attachment',
      description: 'Delete an attachment from a note',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    const paramsParse = attachmentParamsSchema.safeParse(request.params);
    if (!paramsParse.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid attachment ID',
        },
      });
    }
    const { id } = paramsParse.data;

    // Récupérer l'attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        noteId: true,
        filename: true,
        storagePath: true,
      },
    });

    if (!attachment) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        },
      });
    }

    // Vérifier les permissions d'écriture
    const hasWriteAccess = await checkPermission(
      userId,
      'NOTE',
      attachment.noteId,
      'WRITE'
    );

    if (!hasWriteAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Write access required to delete attachments',
        },
      });
    }

    try {
      // Supprimer du stockage
      await storageProvider.delete(attachment.storagePath);

      // Supprimer de la base
      await prisma.attachment.delete({
        where: { id },
      });

      // Audit log
      await createAuditLog({
        userId,
        action: 'DELETE_ATTACHMENT',
        resourceType: 'ATTACHMENT',
        resourceId: id,
        details: {
          noteId: attachment.noteId,
          filename: attachment.filename,
        },
      });

      logger.info({
        attachmentId: id,
        noteId: attachment.noteId,
        userId,
      }, 'Attachment deleted');

      return reply.send({
        success: true,
        message: 'Attachment deleted',
      });
    } catch (error) {
      logger.error({ err: error, attachmentId: id }, 'Delete failed');
      throw error;
    }
  });

  /**
   * GET /api/v1/attachments/note/:noteId
   * Liste les attachments d'une note
   */
  app.get<{
    Params: z.infer<typeof noteIdParamsSchema>;
  }>('/note/:noteId', {
    schema: {
      tags: ['Attachments'],
      summary: 'List note attachments',
      description: 'List all attachments for a note',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          noteId: { type: 'string', format: 'uuid' },
        },
        required: ['noteId'],
      },
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    const paramsParse = noteIdParamsSchema.safeParse(request.params);
    if (!paramsParse.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid note ID',
        },
      });
    }
    const { noteId } = paramsParse.data;

    // Vérifier les permissions de lecture
    const hasReadAccess = await checkPermission(
      userId,
      'NOTE',
      noteId,
      'READ'
    );

    if (!hasReadAccess) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Read access required',
        },
      });
    }

    // Récupérer les attachments
    const attachments = await prisma.attachment.findMany({
      where: { noteId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        storagePath: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: attachments.map((att) => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.sizeBytes,
        url: storageProvider.getUrl(att.storagePath),
        createdAt: att.createdAt.toISOString(),
        uploadedBy: att.uploadedBy,
      })),
    });
  });
};
