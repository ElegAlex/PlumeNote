// ===========================================
// Routes NoteTags - Tags par note
// GET/PUT pour gérer les tags d'une note
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { checkPermission } from '../services/permissions.js';

const putTagsSchema = z.array(z.string().min(1).max(100));

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

export const noteTagsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/notes/:noteId/tags - Liste les tags de la note
  app.get('/:noteId/tags', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'READ');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const noteTags = await prisma.noteTag.findMany({
      where: { noteId },
      include: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return {
      noteId,
      tags: noteTags.map((nt) => ({
        id: nt.tag.id,
        name: nt.tag.name,
        color: nt.tag.color,
      })),
    };
  });

  // PUT /api/v1/notes/:noteId/tags - Remplace tous les tags de la note
  app.put('/:noteId/tags', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const parseResult = putTagsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parseResult.error.flatten() });
    }

    const tagNames = parseResult.data;

    await prisma.$transaction(async (tx) => {
      // Supprimer les tags existants
      await tx.noteTag.deleteMany({ where: { noteId } });

      if (tagNames.length === 0) return;

      // Créer ou récupérer les tags
      const tags = await Promise.all(
        tagNames.map(async (name) => {
          const normalized = name.trim().toLowerCase();
          let tag = await tx.tag.findUnique({ where: { name: normalized } });
          if (!tag) {
            tag = await tx.tag.create({ data: { name: normalized } });
          }
          return tag;
        })
      );

      // Associer les tags à la note
      await tx.noteTag.createMany({
        data: tags.map((tag) => ({
          noteId,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    });

    // Récupérer les tags mis à jour
    const noteTags = await prisma.noteTag.findMany({
      where: { noteId },
      include: {
        tag: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    return {
      noteId,
      tags: noteTags.map((nt) => ({
        id: nt.tag.id,
        name: nt.tag.name,
        color: nt.tag.color,
      })),
    };
  });

  // POST /api/v1/notes/:noteId/tags - Ajouter un tag
  app.post('/:noteId/tags', async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    const body = request.body as { name?: string };
    if (!body.name || typeof body.name !== 'string') {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'name is required' });
    }

    const normalized = body.name.trim().toLowerCase();

    // Créer ou récupérer le tag
    let tag = await prisma.tag.findUnique({ where: { name: normalized } });
    if (!tag) {
      tag = await prisma.tag.create({ data: { name: normalized } });
    }

    // Vérifier si déjà associé
    const existing = await prisma.noteTag.findUnique({
      where: { noteId_tagId: { noteId, tagId: tag.id } },
    });

    if (!existing) {
      await prisma.noteTag.create({
        data: { noteId, tagId: tag.id },
      });
    }

    return reply.status(201).send({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
  });

  // DELETE /api/v1/notes/:noteId/tags/:tagId - Supprimer un tag
  app.delete('/:noteId/tags/:tagId', async (request, reply) => {
    const { noteId, tagId } = request.params as { noteId: string; tagId: string };
    const { error } = await checkNoteAccess(noteId, request.user.userId, 'WRITE');

    if (error === 'NOT_FOUND') return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note non trouvée' });
    if (error === 'FORBIDDEN') return reply.status(403).send({ error: 'FORBIDDEN', message: 'Accès refusé' });

    await prisma.noteTag.deleteMany({
      where: { noteId, tagId },
    });

    return reply.status(204).send();
  });
};
