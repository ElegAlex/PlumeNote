// ===========================================
// Routes NoteMetadata - Table dédiée
// CRUD pour les métadonnées indexées
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma, MetadataType } from '@plumenote/database';
import { checkPermission } from '../services/permissions.js';
import { createAuditLog } from '../services/audit.js';

// Validation du type contre l'enum Prisma
const metadataTypeSchema = z.enum([
  'TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'URL', 'EMAIL'
]);

const metadataItemSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: metadataTypeSchema,
  position: z.number().int().min(0).optional(),
});

const putMetadataSchema = z.array(metadataItemSchema);

const patchMetadataSchema = z.object({
  value: z.string().optional(),
  type: metadataTypeSchema.optional(),
  position: z.number().int().min(0).optional(),
});

// Helper: vérifier note existe et permissions
async function checkNoteAccess(noteId: string, userId: string, permission: 'READ' | 'WRITE') {
  const note = await prisma.note.findFirst({
    where: { id: noteId, isDeleted: false },
    select: { id: true, folderId: true },
  });
  if (!note) return { error: 'NOT_FOUND', note: null };

  const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, permission);
  if (!hasPermission) return { error: 'FORBIDDEN', note: null };

  return { error: null, note };
}

export const noteMetadataRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/notes/:noteId/metadata - Liste toutes les métadonnées
  app.get('/:noteId/metadata', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'READ');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const metadata = await prisma.noteMetadata.findMany({
      where: { noteId },
      orderBy: { position: 'asc' },
      select: { key: true, value: true, type: true, position: true, updatedAt: true },
    });

    return { noteId, metadata };
  });

  // PUT /api/v1/notes/:noteId/metadata - Remplace toutes les métadonnées
  app.put('/:noteId/metadata', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const parseResult = putMetadataSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.flatten() });
    }

    const items = parseResult.data;

    // Transaction: supprimer tout puis recréer
    await prisma.$transaction(async (tx) => {
      await tx.noteMetadata.deleteMany({ where: { noteId } });
      if (items.length > 0) {
        await tx.noteMetadata.createMany({
          data: items.map((item, idx) => ({
            noteId,
            key: item.key,
            value: item.value,
            type: item.type as MetadataType,
            position: item.position ?? idx,
          })),
        });
      }
    });

    await createAuditLog({
      userId: request.user.userId,
      action: 'METADATA_UPDATED',
      resourceType: 'NOTE',
      resourceId: noteId,
      details: { keys: items.map(i => i.key) },
      ipAddress: request.ip,
    });

    const metadata = await prisma.noteMetadata.findMany({
      where: { noteId },
      orderBy: { position: 'asc' },
      select: { key: true, value: true, type: true, position: true },
    });

    return { noteId, metadata };
  });

  // PATCH /api/v1/notes/:noteId/metadata/:key - Modifier une métadonnée
  app.patch('/:noteId/metadata/:key', async (request, reply) => {
    const { noteId, key } = request.params as { noteId: string; key: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const parseResult = patchMetadataSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.flatten() });
    }

    const existing = await prisma.noteMetadata.findUnique({
      where: { noteId_key: { noteId, key } },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Metadata '${key}' non trouvée` });
    }

    const updates = parseResult.data;
    const updated = await prisma.noteMetadata.update({
      where: { noteId_key: { noteId, key } },
      data: {
        ...(updates.value !== undefined && { value: updates.value }),
        ...(updates.type !== undefined && { type: updates.type as MetadataType }),
        ...(updates.position !== undefined && { position: updates.position }),
      },
    });

    return { key: updated.key, value: updated.value, type: updated.type, position: updated.position };
  });

  // DELETE /api/v1/notes/:noteId/metadata/:key - Supprimer une métadonnée
  app.delete('/:noteId/metadata/:key', async (request, reply) => {
    const { noteId, key } = request.params as { noteId: string; key: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const existing = await prisma.noteMetadata.findUnique({
      where: { noteId_key: { noteId, key } },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Metadata '${key}' non trouvée` });
    }

    await prisma.noteMetadata.delete({ where: { noteId_key: { noteId, key } } });

    return reply.status(204).send();
  });
};
