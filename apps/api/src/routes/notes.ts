// ===========================================
// Routes Notes (EP-002)
// US-010: Création note
// US-011: Lecture note
// US-012: Modification note
// US-013: Suppression note
// US-014: Duplication
// US-015/016: Historique et restauration
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import type { Note, CreateNoteRequest, NoteFrontmatter } from '@collabnotes/types';
import { createAuditLog } from '../services/audit.js';
import { checkPermission } from '../services/permissions.js';
import { parseLinks, updateLinks } from '../services/links.js';

// ----- Schémas de validation -----

const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  folderId: z.string().uuid(),
  content: z.string().default(''),
  frontmatter: z.record(z.unknown()).optional(),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  frontmatter: z.record(z.unknown()).optional(),
  position: z.number().int().min(0).optional(),
});

// ----- Helpers -----

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

function createDefaultFrontmatter(
  title: string,
  username: string
): NoteFrontmatter {
  return {
    title,
    created: new Date().toISOString(),
    author: username,
    tags: [],
  };
}

// ----- Routes -----

export const notesRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/notes/recent
   * Notes récemment modifiées
   */
  app.get('/recent', {
    schema: {
      tags: ['Notes'],
      summary: 'Get recent notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user.userId;
    const { limit = '10' } = request.query as { limit?: string };

    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
        folder: {
          select: { id: true, name: true, path: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 10, 50),
    });

    return {
      notes: notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })),
    };
  });

  /**
   * POST /api/v1/notes
   * US-010: Créer une note
   */
  app.post('/', {
    schema: {
      tags: ['Notes'],
      summary: 'Create note',
      description: 'Create a new Markdown note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = createNoteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid note data',
        details: parseResult.error.flatten(),
      });
    }

    const { title, folderId, content, frontmatter: customFrontmatter } = parseResult.data;
    const userId = request.user.userId;
    const username = request.user.username;

    // Vérifier les permissions sur le dossier
    const hasPermission = await checkPermission(userId, 'FOLDER', folderId, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits d'écriture sur ce dossier",
      });
    }

    // Générer le slug et vérifier l'unicité
    let slug = generateSlug(title);
    const existing = await prisma.note.findFirst({
      where: { folderId, slug },
    });

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Créer le frontmatter par défaut
    const frontmatter = {
      ...createDefaultFrontmatter(title, username),
      ...customFrontmatter,
    };

    // Calculer la position
    const maxPosition = await prisma.note.aggregate({
      where: { folderId },
      _max: { position: true },
    });
    const position = (maxPosition._max.position ?? -1) + 1;

    const note = await prisma.note.create({
      data: {
        title,
        slug,
        folderId,
        content,
        frontmatter,
        authorId: userId,
        position,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true },
        },
        folder: {
          select: { id: true, name: true, path: true },
        },
      },
    });

    // Parser et enregistrer les liens
    if (content) {
      await updateLinks(note.id, content);
    }

    // Créer la première version
    await prisma.noteVersion.create({
      data: {
        noteId: note.id,
        versionNumber: 1,
        content,
        frontmatter,
        authorId: userId,
        changeSummary: 'Création initiale',
      },
    });

    await createAuditLog({
      userId,
      action: 'NOTE_CREATED',
      resourceType: 'NOTE',
      resourceId: note.id,
      details: { title, folderId },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  });

  /**
   * GET /api/v1/notes/:id
   * US-011: Lire une note
   */
  app.get('/:id', {
    schema: {
      tags: ['Notes'],
      summary: 'Get note by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        modifier: {
          select: { id: true, username: true, displayName: true },
        },
        folder: {
          select: { id: true, name: true, path: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!note || note.isDeleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    // Vérifier les permissions
    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'READ');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas accès à cette note",
      });
    }

    // Récupérer les rétroliens
    const backlinks = await prisma.link.findMany({
      where: { targetNoteId: id, isBroken: false },
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
            folderId: true,
            folder: { select: { path: true } },
          },
        },
      },
    });

    return {
      ...note,
      tags: note.tags.map((nt) => nt.tag),
      backlinks: backlinks.map((bl) => ({
        noteId: bl.sourceNote.id,
        noteTitle: bl.sourceNote.title,
        folderPath: bl.sourceNote.folder.path,
        context: bl.context,
      })),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  });

  /**
   * PATCH /api/v1/notes/:id
   * US-012: Modifier une note
   */
  app.patch('/:id', {
    schema: {
      tags: ['Notes'],
      summary: 'Update note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;
    const username = request.user.username;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.isDeleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits de modification sur cette note",
      });
    }

    const parseResult = updateNoteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update data',
        details: parseResult.error.flatten(),
      });
    }

    const updates = parseResult.data;
    const updateData: Record<string, unknown> = {};

    // Mettre à jour les champs
    if (updates.title) {
      updateData.title = updates.title;
      updateData.slug = generateSlug(updates.title);
    }
    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }
    if (updates.position !== undefined) {
      updateData.position = updates.position;
    }

    // Mettre à jour le frontmatter avec modified/modified_by
    const currentFrontmatter = note.frontmatter as NoteFrontmatter;
    const newFrontmatter = {
      ...currentFrontmatter,
      ...updates.frontmatter,
      modified: new Date().toISOString(),
      modified_by: username,
    };
    updateData.frontmatter = newFrontmatter;
    updateData.modifiedBy = userId;

    const updated = await prisma.note.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        folder: { select: { id: true, name: true, path: true } },
      },
    });

    // Mettre à jour les liens si le contenu a changé
    if (updates.content !== undefined) {
      await updateLinks(id, updates.content);
    }

    // Créer une nouvelle version (toutes les 5 minutes ou sauvegarde manuelle)
    const lastVersion = await prisma.noteVersion.findFirst({
      where: { noteId: id },
      orderBy: { versionNumber: 'desc' },
    });

    const shouldCreateVersion =
      !lastVersion ||
      Date.now() - lastVersion.createdAt.getTime() > 5 * 60 * 1000;

    if (shouldCreateVersion) {
      await prisma.noteVersion.create({
        data: {
          noteId: id,
          versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
          content: updated.content,
          frontmatter: newFrontmatter,
          authorId: userId,
        },
      });
    }

    await createAuditLog({
      userId,
      action: 'NOTE_UPDATED',
      resourceType: 'NOTE',
      resourceId: id,
      details: { fields: Object.keys(updates) },
      ipAddress: request.ip,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /**
   * DELETE /api/v1/notes/:id
   * US-013: Supprimer une note (soft delete)
   */
  app.delete('/:id', {
    schema: {
      tags: ['Notes'],
      summary: 'Delete note',
      description: 'Soft delete - moves to trash',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.isDeleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits de suppression sur cette note",
      });
    }

    // Soft delete
    await prisma.note.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    // Marquer les liens pointant vers cette note comme brisés
    await prisma.link.updateMany({
      where: { targetNoteId: id },
      data: { isBroken: true },
    });

    await createAuditLog({
      userId,
      action: 'NOTE_DELETED',
      resourceType: 'NOTE',
      resourceId: id,
      details: { title: note.title },
      ipAddress: request.ip,
    });

    return { success: true };
  });

  /**
   * POST /api/v1/notes/:id/duplicate
   * US-014: Dupliquer une note
   */
  app.post('/:id/duplicate', {
    schema: {
      tags: ['Notes'],
      summary: 'Duplicate note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;
    const username = request.user.username;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note || note.isDeleted) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    // Vérifier lecture sur source et écriture sur destination
    const hasReadPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'READ');
    const hasWritePermission = await checkPermission(userId, 'FOLDER', note.folderId, 'WRITE');

    if (!hasReadPermission || !hasWritePermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits nécessaires pour dupliquer cette note",
      });
    }

    const newTitle = `${note.title} (copie)`;
    const newSlug = `${note.slug}-copy-${Date.now()}`;

    const frontmatter = {
      ...(note.frontmatter as NoteFrontmatter),
      title: newTitle,
      created: new Date().toISOString(),
      author: username,
      modified: undefined,
      modified_by: undefined,
    };

    const duplicate = await prisma.note.create({
      data: {
        title: newTitle,
        slug: newSlug,
        folderId: note.folderId,
        content: note.content,
        frontmatter,
        authorId: userId,
        position: note.position + 1,
      },
    });

    await createAuditLog({
      userId,
      action: 'NOTE_CREATED',
      resourceType: 'NOTE',
      resourceId: duplicate.id,
      details: { duplicatedFrom: id },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      ...duplicate,
      createdAt: duplicate.createdAt.toISOString(),
      updatedAt: duplicate.updatedAt.toISOString(),
    });
  });

  /**
   * GET /api/v1/notes/:id/versions
   * US-015: Historique des versions
   */
  app.get('/:id/versions', {
    schema: {
      tags: ['Notes'],
      summary: 'Get note version history',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'READ');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas accès à cette note",
      });
    }

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { versionNumber: 'desc' },
      take: 50,
    });

    return {
      versions: versions.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  });

  /**
   * POST /api/v1/notes/:id/restore
   * US-016: Restaurer une version
   */
  app.post('/:id/restore/:versionNumber', {
    schema: {
      tags: ['Notes'],
      summary: 'Restore note version',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id, versionNumber } = request.params as {
      id: string;
      versionNumber: string;
    };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits de modification sur cette note",
      });
    }

    const version = await prisma.noteVersion.findUnique({
      where: {
        noteId_versionNumber: {
          noteId: id,
          versionNumber: parseInt(versionNumber, 10),
        },
      },
    });

    if (!version) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Version non trouvée',
      });
    }

    // Restaurer le contenu
    const updated = await prisma.note.update({
      where: { id },
      data: {
        content: version.content,
        frontmatter: version.frontmatter,
        modifiedBy: userId,
      },
    });

    // Créer une nouvelle version marquant la restauration
    const lastVersion = await prisma.noteVersion.findFirst({
      where: { noteId: id },
      orderBy: { versionNumber: 'desc' },
    });

    await prisma.noteVersion.create({
      data: {
        noteId: id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        content: version.content,
        frontmatter: version.frontmatter as NoteFrontmatter,
        authorId: userId,
        changeSummary: `Restauration de la version ${versionNumber}`,
      },
    });

    await createAuditLog({
      userId,
      action: 'NOTE_UPDATED',
      resourceType: 'NOTE',
      resourceId: id,
      details: { restoredVersion: versionNumber },
      ipAddress: request.ip,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /**
   * POST /api/v1/notes/:id/restore-from-trash
   * Restaurer une note supprimée
   */
  app.post('/:id/restore-from-trash', {
    schema: {
      tags: ['Notes'],
      summary: 'Restore deleted note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note non trouvée',
      });
    }

    if (!note.isDeleted) {
      return reply.status(400).send({
        error: 'INVALID_OPERATION',
        message: "Cette note n'est pas dans la corbeille",
      });
    }

    const hasPermission = await checkPermission(userId, 'FOLDER', note.folderId, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits de restauration",
      });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });

    // Restaurer les liens
    await prisma.link.updateMany({
      where: { targetNoteId: id },
      data: { isBroken: false },
    });

    await createAuditLog({
      userId,
      action: 'NOTE_RESTORED',
      resourceType: 'NOTE',
      resourceId: id,
      ipAddress: request.ip,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
};
