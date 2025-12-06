// ===========================================
// Routes Notes Personnelles
// Espace privé isolé pour chaque utilisateur
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { createAuditLog } from '../services/audit.js';

// ----- Schémas de validation -----

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
});

const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  folderId: z.string().uuid().optional(),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

const searchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ----- Helpers -----

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

async function buildPersonalFolderPath(
  userId: string,
  parentId: string | null
): Promise<string> {
  if (!parentId) return '/personal/';

  const parent = await prisma.folder.findFirst({
    where: {
      id: parentId,
      isPersonal: true,
      ownerId: userId,
    },
    select: { path: true, slug: true },
  });

  if (!parent) return '/personal/';
  return `${parent.path}${parent.slug}/`;
}

// Middleware pour vérifier que l'utilisateur a le rôle admin ou editor
async function checkEditorRole(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  return user !== null && ['admin', 'editor'].includes(user.role.name);
}

// ----- Routes -----

export const personalRoutes: FastifyPluginAsync = async (app) => {
  // Middleware d'authentification pour toutes les routes
  app.addHook('preHandler', app.authenticate);

  // Vérification du rôle pour l'accès aux notes personnelles
  app.addHook('preHandler', async (request, reply) => {
    const hasAccess = await checkEditorRole(request.user.userId);
    if (!hasAccess) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Les notes personnelles sont réservées aux éditeurs et administrateurs',
      });
    }
  });

  // ===============================
  // FOLDERS
  // ===============================

  /**
   * GET /api/v1/personal/folders
   * Liste des dossiers personnels racine
   */
  app.get('/folders', {
    schema: {
      tags: ['Personal'],
      summary: 'Get personal root folders',
      description: 'Get all personal root folders for the current user',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const folders = await prisma.folder.findMany({
      where: {
        isPersonal: true,
        ownerId: userId,
        parentId: null,
      },
      include: {
        children: {
          where: { isPersonal: true, ownerId: userId },
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            notes: {
              where: { isPersonal: true, ownerId: userId, isDeleted: false },
            },
          },
        },
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return {
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        path: f.path,
        color: f.color,
        icon: f.icon,
        position: f.position,
        hasChildren: f.children.length > 0,
        notesCount: f._count.notes,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    };
  });

  /**
   * GET /api/v1/personal/folders/:id
   * Détail d'un dossier personnel avec contenu
   */
  app.get('/folders/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Get personal folder details',
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
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        isPersonal: true,
        ownerId: userId,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: { isPersonal: true, ownerId: userId },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
            position: true,
            _count: {
              select: {
                notes: { where: { isPersonal: true, ownerId: userId, isDeleted: false } },
                children: { where: { isPersonal: true, ownerId: userId } },
              },
            },
          },
        },
        notes: {
          where: { isPersonal: true, ownerId: userId, isDeleted: false },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!folder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier personnel non trouvé',
      });
    }

    return {
      folder: {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        path: folder.path,
        color: folder.color,
        icon: folder.icon,
        position: folder.position,
        parent: folder.parent,
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      },
      children: folder.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        color: c.color,
        icon: c.icon,
        position: c.position,
        hasChildren: c._count.children > 0,
        notesCount: c._count.notes,
      })),
      notes: folder.notes.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        updatedAt: n.updatedAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });

  /**
   * POST /api/v1/personal/folders
   * Créer un dossier personnel
   */
  app.post('/folders', {
    schema: {
      tags: ['Personal'],
      summary: 'Create personal folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = createFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { name, parentId, color, icon } = parseResult.data;
    const userId = request.user.userId;

    // Vérifier que le parent appartient à l'utilisateur
    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, isPersonal: true, ownerId: userId },
      });

      if (!parent) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Dossier parent non accessible',
        });
      }
    }

    const slug = generateSlug(name);
    const path = await buildPersonalFolderPath(userId, parentId ?? null);

    const folder = await prisma.folder.create({
      data: {
        name,
        slug,
        path,
        parentId: parentId ?? null,
        color,
        icon,
        isPersonal: true,
        ownerId: userId,
        createdBy: userId,
      },
    });

    await createAuditLog({
      userId,
      action: 'CREATE_PERSONAL_FOLDER',
      resourceType: 'FOLDER',
      resourceId: folder.id,
      details: { name },
    });

    return reply.status(201).send({
      folder: {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        path: folder.path,
        color: folder.color,
        icon: folder.icon,
        createdAt: folder.createdAt.toISOString(),
      },
    });
  });

  /**
   * PATCH /api/v1/personal/folders/:id
   * Modifier un dossier personnel
   */
  app.patch('/folders/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Update personal folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const parseResult = updateFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    // Vérifier la propriété
    const existing = await prisma.folder.findFirst({
      where: { id, isPersonal: true, ownerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier personnel non trouvé',
      });
    }

    const { name, parentId, color, icon } = parseResult.data;

    // Vérifier le nouveau parent si fourni
    if (parentId !== undefined && parentId !== null) {
      if (parentId === id) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Un dossier ne peut pas être son propre parent',
        });
      }

      const parent = await prisma.folder.findFirst({
        where: { id: parentId, isPersonal: true, ownerId: userId },
      });

      if (!parent) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Dossier parent non accessible',
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = generateSlug(name);
    }
    if (parentId !== undefined) {
      updateData.parentId = parentId;
      updateData.path = await buildPersonalFolderPath(userId, parentId);
    }
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const folder = await prisma.folder.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId,
      action: 'UPDATE_PERSONAL_FOLDER',
      resourceType: 'FOLDER',
      resourceId: folder.id,
      details: updateData,
    });

    return { folder };
  });

  /**
   * DELETE /api/v1/personal/folders/:id
   * Supprimer un dossier personnel (cascade)
   */
  app.delete('/folders/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Delete personal folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const existing = await prisma.folder.findFirst({
      where: { id, isPersonal: true, ownerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier personnel non trouvé',
      });
    }

    await prisma.folder.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'DELETE_PERSONAL_FOLDER',
      resourceType: 'FOLDER',
      resourceId: id,
      details: { name: existing.name },
    });

    return reply.status(204).send();
  });

  // ===============================
  // NOTES
  // ===============================

  /**
   * GET /api/v1/personal/notes
   * Liste des notes personnelles (avec filtre optionnel par dossier)
   */
  app.get('/notes', {
    schema: {
      tags: ['Personal'],
      summary: 'Get personal notes',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          folderId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request) => {
    const { folderId } = request.query as { folderId?: string };
    const userId = request.user.userId;

    const where: Record<string, unknown> = {
      isPersonal: true,
      ownerId: userId,
      isDeleted: false,
    };

    if (folderId) {
      where.folderId = folderId;
    } else {
      where.folderId = null; // Notes à la racine
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        createdAt: true,
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        folderId: n.folder?.id ?? null,
        folderName: n.folder?.name ?? null,
        updatedAt: n.updatedAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /api/v1/personal/notes/all
   * Liste toutes les notes personnelles (tous dossiers confondus)
   */
  app.get('/notes/all', {
    schema: {
      tags: ['Personal'],
      summary: 'Get all personal notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    const notes = await prisma.note.findMany({
      where: {
        isPersonal: true,
        ownerId: userId,
        isDeleted: false,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        createdAt: true,
        folder: {
          select: { id: true, name: true, path: true },
        },
      },
    });

    return {
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        folderId: n.folder?.id ?? null,
        folderPath: n.folder ? `${n.folder.path}${n.folder.name}` : null,
        updatedAt: n.updatedAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });

  /**
   * GET /api/v1/personal/notes/:id
   * Détail d'une note personnelle
   */
  app.get('/notes/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Get personal note details',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const note = await prisma.note.findFirst({
      where: {
        id,
        isPersonal: true,
        ownerId: userId,
        isDeleted: false,
      },
      include: {
        folder: {
          select: { id: true, name: true, slug: true, path: true },
        },
      },
    });

    if (!note) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note personnelle non trouvée',
      });
    }

    return {
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        content: note.content,
        frontmatter: note.frontmatter,
        folderId: note.folderId,
        folder: note.folder,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    };
  });

  /**
   * POST /api/v1/personal/notes
   * Créer une note personnelle
   */
  app.post('/notes', {
    schema: {
      tags: ['Personal'],
      summary: 'Create personal note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = createNoteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { title, content, folderId } = parseResult.data;
    const userId = request.user.userId;

    // Vérifier que le dossier appartient à l'utilisateur
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, isPersonal: true, ownerId: userId },
      });

      if (!folder) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Dossier non accessible',
        });
      }
    }

    const slug = generateSlug(title);

    // Récupérer le nom d'utilisateur pour le frontmatter
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const note = await prisma.note.create({
      data: {
        title,
        slug,
        content: content ?? '',
        folderId: folderId ?? null,
        authorId: userId,
        isPersonal: true,
        ownerId: userId,
        frontmatter: {
          title,
          created: new Date().toISOString(),
          author: user?.username ?? 'unknown',
          tags: [],
        },
      },
    });

    await createAuditLog({
      userId,
      action: 'CREATE_PERSONAL_NOTE',
      resourceType: 'NOTE',
      resourceId: note.id,
      details: { title },
    });

    return reply.status(201).send({
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        folderId: note.folderId,
        createdAt: note.createdAt.toISOString(),
      },
    });
  });

  /**
   * PATCH /api/v1/personal/notes/:id
   * Modifier une note personnelle
   */
  app.patch('/notes/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Update personal note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const parseResult = updateNoteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    // Vérifier la propriété
    const existing = await prisma.note.findFirst({
      where: { id, isPersonal: true, ownerId: userId, isDeleted: false },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note personnelle non trouvée',
      });
    }

    const { title, content, folderId } = parseResult.data;

    // Vérifier le nouveau dossier si fourni
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, isPersonal: true, ownerId: userId },
      });

      if (!folder) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Dossier non accessible',
        });
      }
    }

    const updateData: Record<string, unknown> = {
      modifiedBy: userId,
    };
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = generateSlug(title);
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (folderId !== undefined) {
      updateData.folderId = folderId;
    }

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId,
      action: 'UPDATE_PERSONAL_NOTE',
      resourceType: 'NOTE',
      resourceId: note.id,
      details: { title: note.title },
    });

    return { note };
  });

  /**
   * DELETE /api/v1/personal/notes/:id
   * Supprimer une note personnelle
   */
  app.delete('/notes/:id', {
    schema: {
      tags: ['Personal'],
      summary: 'Delete personal note',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const existing = await prisma.note.findFirst({
      where: { id, isPersonal: true, ownerId: userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Note personnelle non trouvée',
      });
    }

    // Suppression définitive (pas de corbeille pour notes personnelles)
    await prisma.note.delete({ where: { id } });

    await createAuditLog({
      userId,
      action: 'DELETE_PERSONAL_NOTE',
      resourceType: 'NOTE',
      resourceId: id,
      details: { title: existing.title },
    });

    return reply.status(204).send();
  });

  // ===============================
  // SEARCH
  // ===============================

  /**
   * GET /api/v1/personal/search
   * Recherche dans l'espace personnel uniquement
   */
  app.get('/search', {
    schema: {
      tags: ['Personal'],
      summary: 'Search personal notes',
      description: 'Search only within personal notes (isolated from global search)',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = searchSchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { q, limit } = parseResult.data;
    const userId = request.user.userId;

    const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean);

    const notes = await prisma.note.findMany({
      where: {
        isPersonal: true,
        ownerId: userId,
        isDeleted: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          ...searchTerms.map((term) => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { content: { contains: term, mode: 'insensitive' } },
            ],
          })),
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        updatedAt: true,
        folder: {
          select: { id: true, name: true, path: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Générer les extraits
    const results = notes.map((note) => {
      const excerpt = generateExcerpt(note.content, searchTerms);
      return {
        id: note.id,
        title: note.title,
        slug: note.slug,
        excerpt,
        folderPath: note.folder ? `${note.folder.path}${note.folder.name}` : null,
        updatedAt: note.updatedAt.toISOString(),
      };
    });

    return {
      results,
      total: results.length,
      query: q,
    };
  });

  // ===============================
  // TREE VIEW
  // ===============================

  /**
   * GET /api/v1/personal/tree
   * Arborescence complète de l'espace personnel
   */
  app.get('/tree', {
    schema: {
      tags: ['Personal'],
      summary: 'Get personal folder tree',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    // Récupérer tous les dossiers personnels
    const folders = await prisma.folder.findMany({
      where: {
        isPersonal: true,
        ownerId: userId,
      },
      orderBy: [{ path: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      include: {
        notes: {
          where: { isPersonal: true, ownerId: userId, isDeleted: false },
          select: {
            id: true,
            title: true,
            slug: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            children: { where: { isPersonal: true, ownerId: userId } },
          },
        },
      },
    });

    // Notes à la racine (sans dossier)
    const rootNotes = await prisma.note.findMany({
      where: {
        isPersonal: true,
        ownerId: userId,
        isDeleted: false,
        folderId: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Construire l'arborescence
    const folderMap = new Map<string | null, typeof folders>();
    for (const folder of folders) {
      const parentId = folder.parentId;
      if (!folderMap.has(parentId)) {
        folderMap.set(parentId, []);
      }
      folderMap.get(parentId)!.push(folder);
    }

    function buildTree(parentId: string | null): unknown[] {
      const children = folderMap.get(parentId) || [];
      return children.map((folder) => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        color: folder.color,
        icon: folder.icon,
        hasChildren: folder._count.children > 0,
        children: buildTree(folder.id),
        notes: folder.notes.map((n) => ({
          id: n.id,
          title: n.title,
          slug: n.slug,
          updatedAt: n.updatedAt.toISOString(),
        })),
      }));
    }

    return {
      tree: buildTree(null),
      rootNotes: rootNotes.map((n) => ({
        id: n.id,
        title: n.title,
        slug: n.slug,
        updatedAt: n.updatedAt.toISOString(),
      })),
    };
  });
};

/**
 * Génère un extrait de texte autour des termes recherchés
 */
function generateExcerpt(content: string, terms: string[]): string {
  const maxLength = 200;

  let startIndex = 0;
  for (const term of terms) {
    const idx = content.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1) {
      startIndex = Math.max(0, idx - 50);
      break;
    }
  }

  let excerpt = content.slice(startIndex, startIndex + maxLength);

  if (startIndex > 0) excerpt = '...' + excerpt;
  if (startIndex + maxLength < content.length) excerpt = excerpt + '...';

  // Nettoyer le markdown
  excerpt = excerpt
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\n/g, ' ')
    .trim();

  return excerpt;
}
