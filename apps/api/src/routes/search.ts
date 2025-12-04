// ===========================================
// Routes Recherche (EP-006)
// US-060: Recherche full-text avec PostgreSQL
// US-061: Filtres de recherche avancés
// US-062: Recherche par tags
// US-063: Facettes et statistiques
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { Prisma } from '@prisma/client';
import { getEffectivePermissions } from '../services/permissions.js';

const searchSchema = z.object({
  q: z.string().min(1).max(500),
  folderId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  tags: z.string().optional(), // Comma-separated
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['relevance', 'date', 'title']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/search
   * US-060: Recherche full-text
   */
  app.get('/', {
    schema: {
      tags: ['Search'],
      summary: 'Search notes',
      description: 'Full-text search across notes with filters',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' },
          folderId: { type: 'string' },
          authorId: { type: 'string' },
          tags: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          limit: { type: 'number' },
          offset: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const parseResult = searchSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { q, folderId, authorId, tags, dateFrom, dateTo, limit, offset } = parseResult.data;
    const userId = request.user.userId;

    // Récupérer les dossiers accessibles
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    // Construire la requête WHERE
    const where: Record<string, unknown> = {
      isDeleted: false,
      folderId: { in: accessibleFolderIds },
    };

    if (folderId) {
      where.folderId = folderId;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim());
      where.tags = {
        some: {
          tag: {
            name: { in: tagList },
          },
        },
      };
    }

    if (dateFrom || dateTo) {
      where.updatedAt = {};
      if (dateFrom) (where.updatedAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.updatedAt as Record<string, Date>).lte = new Date(dateTo);
    }

    // Recherche full-text avec PostgreSQL
    // Note: Pour une vraie implémentation, utiliser Prisma.$queryRaw avec ts_rank
    const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean);

    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
      ...searchTerms.map((term) => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } },
        ],
      })),
    ];

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          author: { select: { displayName: true } },
          folder: { select: { path: true, name: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.note.count({ where }),
    ]);

    // Générer les snippets avec surlignage
    const results = notes.map((note) => {
      const snippet = generateSnippet(note.content, searchTerms);

      return {
        noteId: note.id,
        title: note.title,
        slug: note.slug,
        folderPath: `${note.folder.path}${note.folder.name}`,
        snippet,
        rank: calculateRank(note, searchTerms),
        authorName: note.author.displayName,
        updatedAt: note.updatedAt.toISOString(),
        tags: note.tags.map((nt) => nt.tag.name),
      };
    });

    // Trier par pertinence
    results.sort((a, b) => b.rank - a.rank);

    return {
      results,
      total,
      query: q,
      facets: await generateFacets(accessibleFolderIds, searchTerms),
    };
  });

  /**
   * GET /api/v1/search/facets
   * US-063: Facettes de recherche
   */
  app.get('/facets', {
    schema: {
      tags: ['Search'],
      summary: 'Get search facets',
      description: 'Get available facets for filtering search results',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    return generateFacets(accessibleFolderIds, []);
  });

  /**
   * GET /api/v1/search/suggestions
   * Suggestions de recherche (autocomplétion)
   */
  app.get('/suggestions', {
    schema: {
      tags: ['Search'],
      summary: 'Get search suggestions',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const { q } = request.query as { q?: string };

    if (!q || q.length < 2) {
      return { suggestions: [] };
    }

    const userId = request.user.userId;
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    // Chercher dans les titres
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        folderId: { in: accessibleFolderIds },
        title: { contains: q, mode: 'insensitive' },
      },
      select: { title: true },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    // Chercher dans les tags
    const tags = await prisma.tag.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { name: true },
      take: 5,
    });

    return {
      suggestions: [
        ...notes.map((n) => ({ type: 'note', value: n.title })),
        ...tags.map((t) => ({ type: 'tag', value: `tag:${t.name}` })),
      ],
    };
  });
};

/**
 * Génère un extrait de texte avec les termes surlignés
 */
function generateSnippet(content: string, terms: string[]): string {
  const maxLength = 200;

  // Trouver la première occurrence d'un terme
  let startIndex = 0;
  for (const term of terms) {
    const idx = content.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1) {
      startIndex = Math.max(0, idx - 50);
      break;
    }
  }

  let snippet = content.slice(startIndex, startIndex + maxLength);

  // Ajouter des ellipses si nécessaire
  if (startIndex > 0) snippet = '...' + snippet;
  if (startIndex + maxLength < content.length) snippet = snippet + '...';

  // Nettoyer le markdown
  snippet = snippet
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\n/g, ' ')
    .trim();

  return snippet;
}

/**
 * Calcule un score de pertinence simple
 */
function calculateRank(
  note: { title: string; content: string },
  terms: string[]
): number {
  let rank = 0;

  for (const term of terms) {
    const termLower = term.toLowerCase();

    // Match dans le titre (poids élevé)
    if (note.title.toLowerCase().includes(termLower)) {
      rank += 10;
    }

    // Match exact du titre
    if (note.title.toLowerCase() === termLower) {
      rank += 20;
    }

    // Compter les occurrences dans le contenu
    const regex = new RegExp(termLower, 'gi');
    const matches = note.content.match(regex);
    rank += (matches?.length || 0) * 0.5;
  }

  return rank;
}

/**
 * Génère les facettes de recherche
 */
async function generateFacets(accessibleFolderIds: string[], searchTerms: string[]) {
  const whereBase = {
    isDeleted: false,
    folderId: { in: accessibleFolderIds },
  };

  // Facette par dossier
  const folderFacets = await prisma.folder.findMany({
    where: { id: { in: accessibleFolderIds } },
    select: {
      id: true,
      name: true,
      path: true,
      _count: {
        select: {
          notes: {
            where: { isDeleted: false },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Facette par tag
  const tagFacets = await prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: {
          notes: {
            where: {
              note: whereBase,
            },
          },
        },
      },
    },
    orderBy: {
      notes: {
        _count: 'desc',
      },
    },
    take: 20,
  });

  // Facette par auteur
  const authorFacets = await prisma.user.findMany({
    where: {
      createdNotes: {
        some: whereBase,
      },
    },
    select: {
      id: true,
      displayName: true,
      _count: {
        select: {
          createdNotes: {
            where: whereBase,
          },
        },
      },
    },
    orderBy: {
      createdNotes: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  // Facette par date (regroupement par mois)
  const dateStats = await prisma.note.groupBy({
    by: ['updatedAt'],
    where: whereBase,
    _count: true,
    orderBy: { updatedAt: 'desc' },
  });

  // Regrouper par mois
  const dateGroups = new Map<string, number>();
  dateStats.forEach((stat) => {
    const monthKey = stat.updatedAt.toISOString().slice(0, 7); // YYYY-MM
    dateGroups.set(monthKey, (dateGroups.get(monthKey) || 0) + stat._count);
  });

  return {
    folders: folderFacets.map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      count: f._count.notes,
    })),
    tags: tagFacets
      .filter((t) => t._count.notes > 0)
      .map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: t._count.notes,
      })),
    authors: authorFacets.map((a) => ({
      id: a.id,
      name: a.displayName,
      count: a._count.createdNotes,
    })),
    dates: Array.from(dateGroups.entries())
      .slice(0, 12)
      .map(([month, count]) => ({
        month,
        label: formatMonth(month),
        count,
      })),
  };
}

/**
 * Formate un mois YYYY-MM en label lisible
 */
function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}
