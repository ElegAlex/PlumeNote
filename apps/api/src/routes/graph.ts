// ===========================================
// Routes Graph et Backlinks (EP-007)
// US-030: Liens entre notes (wikilinks)
// US-031: Backlinks automatiques
// US-032: Graph de connaissances
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { getEffectivePermissions } from '../services/permissions.js';

export const graphRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/graph/backlinks/:noteId
   * US-031: Récupérer les backlinks d'une note
   */
  app.get('/backlinks/:noteId', {
    schema: {
      tags: ['Graph'],
      summary: 'Get backlinks for a note',
      description: 'Returns all notes that link to this note',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['noteId'],
        properties: {
          noteId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const userId = request.user.userId;

    // Vérifier l'accès à la note
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { folderId: true },
    });

    if (!note) {
      return reply.status(404).send({ error: 'NOTE_NOT_FOUND' });
    }

    // Récupérer les backlinks
    const backlinks = await prisma.link.findMany({
      where: {
        targetNoteId: noteId,
        sourceNote: {
          isDeleted: false,
        },
      },
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
            slug: true,
            folder: {
              select: { path: true, name: true },
            },
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filtrer par permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = new Set(
      permissions.filter((p) => p.level !== 'NONE').map((p) => p.resourceId)
    );

    const filteredBacklinks = backlinks
      .filter((link) => {
        const sourceFolder = link.sourceNote.folder;
        return sourceFolder && accessibleFolderIds.has(link.sourceNote.folder.id);
      })
      .map((link) => ({
        noteId: link.sourceNote.id,
        title: link.sourceNote.title,
        slug: link.sourceNote.slug,
        folderPath: `${link.sourceNote.folder?.path || ''}/${link.sourceNote.folder?.name || ''}`,
        context: link.context,
        updatedAt: link.sourceNote.updatedAt.toISOString(),
      }));

    return {
      noteId,
      backlinks: filteredBacklinks,
      count: filteredBacklinks.length,
    };
  });

  /**
   * GET /api/v1/graph/outlinks/:noteId
   * Récupérer les liens sortants d'une note
   */
  app.get('/outlinks/:noteId', {
    schema: {
      tags: ['Graph'],
      summary: 'Get outgoing links for a note',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['noteId'],
        properties: {
          noteId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };

    const outlinks = await prisma.link.findMany({
      where: {
        sourceNoteId: noteId,
      },
      include: {
        targetNote: {
          select: {
            id: true,
            title: true,
            slug: true,
            isDeleted: true,
            folder: {
              select: { path: true, name: true },
            },
          },
        },
      },
    });

    return {
      noteId,
      outlinks: outlinks.map((link) => ({
        targetNoteId: link.targetNoteId,
        targetSlug: link.targetSlug,
        alias: link.alias,
        isBroken: link.isBroken || !link.targetNote || link.targetNote.isDeleted,
        title: link.targetNote?.title || link.targetSlug,
        folderPath: link.targetNote
          ? `${link.targetNote.folder?.path || ''}/${link.targetNote.folder?.name || ''}`
          : null,
      })),
      count: outlinks.length,
    };
  });

  /**
   * GET /api/v1/graph/local/:noteId
   * US-032: Graph local (connexions directes d'une note)
   */
  app.get('/local/:noteId', {
    schema: {
      tags: ['Graph'],
      summary: 'Get local graph for a note',
      description: 'Returns nodes and edges for the local graph view',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['noteId'],
        properties: {
          noteId: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          depth: { type: 'number', default: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { depth = 1 } = request.query as { depth?: number };
    const userId = request.user.userId;

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, slug: true, folderId: true },
    });

    if (!note) {
      return reply.status(404).send({ error: 'NOTE_NOT_FOUND' });
    }

    // Récupérer les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = new Set(
      permissions.filter((p) => p.level !== 'NONE').map((p) => p.resourceId)
    );

    // Construire le graph local
    const nodes = new Map<string, { id: string; title: string; isCenter: boolean }>();
    const edges: { source: string; target: string; }[] = [];
    const visited = new Set<string>();

    async function expandNode(currentNoteId: string, currentDepth: number) {
      if (currentDepth > depth || visited.has(currentNoteId)) return;
      visited.add(currentNoteId);

      const currentNote = await prisma.note.findUnique({
        where: { id: currentNoteId },
        select: { id: true, title: true, folderId: true },
      });

      if (!currentNote || !accessibleFolderIds.has(currentNote.folderId)) return;

      nodes.set(currentNote.id, {
        id: currentNote.id,
        title: currentNote.title,
        isCenter: currentNote.id === noteId,
      });

      // Liens sortants
      const outlinks = await prisma.link.findMany({
        where: { sourceNoteId: currentNoteId, isBroken: false },
        select: { targetNoteId: true },
      });

      for (const link of outlinks) {
        if (link.targetNoteId) {
          edges.push({ source: currentNoteId, target: link.targetNoteId });
          if (currentDepth < depth) {
            await expandNode(link.targetNoteId, currentDepth + 1);
          }
        }
      }

      // Backlinks
      const backlinks = await prisma.link.findMany({
        where: { targetNoteId: currentNoteId, isBroken: false },
        select: { sourceNoteId: true },
      });

      for (const link of backlinks) {
        edges.push({ source: link.sourceNoteId, target: currentNoteId });
        if (currentDepth < depth) {
          await expandNode(link.sourceNoteId, currentDepth + 1);
        }
      }
    }

    await expandNode(noteId, 0);

    return {
      nodes: Array.from(nodes.values()),
      edges: edges.filter(
        (edge, index, self) =>
          index === self.findIndex((e) => e.source === edge.source && e.target === edge.target)
      ),
    };
  });

  /**
   * GET /api/v1/graph/global
   * US-032: Graph global de toutes les notes
   */
  app.get('/global', {
    schema: {
      tags: ['Graph'],
      summary: 'Get global knowledge graph',
      description: 'Returns all nodes and edges for the full graph',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 500 },
        },
      },
    },
  }, async (request) => {
    const { limit = 500 } = request.query as { limit?: number };
    const userId = request.user.userId;

    // Récupérer les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    // Récupérer toutes les notes accessibles
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        folderId: { in: accessibleFolderIds },
      },
      select: {
        id: true,
        title: true,
        folderId: true,
        folder: { select: { color: true } },
        _count: {
          select: {
            linksFrom: true,
            linksTo: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    // Récupérer tous les liens
    const noteIds = notes.map((n) => n.id);
    const links = await prisma.link.findMany({
      where: {
        sourceNoteId: { in: noteIds },
        targetNoteId: { in: noteIds },
        isBroken: false,
      },
      select: {
        sourceNoteId: true,
        targetNoteId: true,
      },
    });

    return {
      nodes: notes.map((note) => ({
        id: note.id,
        title: note.title,
        color: note.folder?.color || null,
        connections: note._count.linksFrom + note._count.linksTo,
      })),
      edges: links.map((link) => ({
        source: link.sourceNoteId,
        target: link.targetNoteId!,
      })),
      stats: {
        totalNotes: notes.length,
        totalLinks: links.length,
      },
    };
  });

  /**
   * GET /api/v1/graph/orphans
   * Notes orphelines (sans liens)
   */
  app.get('/orphans', {
    schema: {
      tags: ['Graph'],
      summary: 'Get orphan notes',
      description: 'Returns notes without any links',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    const orphans = await prisma.note.findMany({
      where: {
        isDeleted: false,
        folderId: { in: accessibleFolderIds },
        AND: [
          { linksFrom: { none: {} } },
          { linksTo: { none: {} } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        folder: { select: { path: true, name: true } },
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      orphans: orphans.map((note) => ({
        id: note.id,
        title: note.title,
        folderPath: `${note.folder.path}/${note.folder.name}`,
        updatedAt: note.updatedAt.toISOString(),
      })),
      count: orphans.length,
    };
  });
};
