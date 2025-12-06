// ===========================================
// Routes Dossiers (EP-003)
// US-020: Affichage arborescence
// US-021: Création dossier
// US-022: Renommage
// US-023: Déplacement
// US-024: Suppression
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import type { Folder, FolderTreeNode, CreateFolderRequest } from '@collabnotes/types';
import { createAuditLog } from '../services/audit.js';
import { checkPermission, getEffectivePermissions } from '../services/permissions.js';

// ----- Schémas de validation -----

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

// ----- Helpers -----

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function buildFolderPath(parentId: string | null): Promise<string> {
  if (!parentId) return '/';

  const parent = await prisma.folder.findUnique({
    where: { id: parentId },
    select: { path: true, slug: true },
  });

  if (!parent) return '/';
  return `${parent.path}${parent.slug}/`;
}

// ----- Routes -----

export const foldersRoutes: FastifyPluginAsync = async (app) => {
  // Middleware d'authentification pour toutes les routes
  app.addHook('preHandler', app.authenticate);

  /**
   * GET /api/v1/folders/tree
   * US-020: Récupérer l'arborescence complète
   */
  app.get('/tree', {
    schema: {
      tags: ['Folders'],
      summary: 'Get folder tree',
      description: 'Get the complete folder tree structure with notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;

    // Récupérer uniquement les dossiers de l'espace général (pas personnels)
    const folders = await prisma.folder.findMany({
      where: {
        isPersonal: false,
      },
      orderBy: [{ path: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      include: {
        notes: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            slug: true,
            folderId: true,
            authorId: true,
            updatedAt: true,
            isDeleted: true,
          },
          orderBy: [{ position: 'asc' }, { title: 'asc' }],
        },
      },
    });

    // Récupérer les permissions effectives de l'utilisateur
    const permissions = await getEffectivePermissions(userId, 'FOLDER');

    // Construire l'arbre avec permissions
    const buildTree = (parentId: string | null, level: number): FolderTreeNode[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((folder) => {
          const perm = permissions.find((p) => p.resourceId === folder.id);
          const accessLevel = perm?.level || null;
          const hasAccess = accessLevel !== null && accessLevel !== 'NONE';

          return {
            ...folder,
            createdAt: folder.createdAt.toISOString(),
            updatedAt: folder.updatedAt.toISOString(),
            children: buildTree(folder.id, level + 1),
            notes: hasAccess
              ? folder.notes.map((n) => ({
                  ...n,
                  updatedAt: n.updatedAt.toISOString(),
                }))
              : [],
            level,
            hasAccess,
            accessLevel,
          } as FolderTreeNode;
        });
    };

    return { tree: buildTree(null, 0) };
  });

  /**
   * POST /api/v1/folders
   * US-021: Créer un dossier
   */
  app.post('/', {
    schema: {
      tags: ['Folders'],
      summary: 'Create folder',
      description: 'Create a new folder',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          parentId: { type: 'string', nullable: true },
          color: { type: 'string' },
          icon: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const parseResult = createFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid folder data',
        details: parseResult.error.flatten(),
      });
    }

    const { name, parentId, color, icon } = parseResult.data;
    const userId = request.user.userId;

    // Vérifier les permissions sur le dossier parent
    if (parentId) {
      const hasPermission = await checkPermission(userId, 'FOLDER', parentId, 'WRITE');
      if (!hasPermission) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: "Vous n'avez pas les droits d'écriture sur ce dossier",
        });
      }
    }

    const slug = generateSlug(name);
    const path = await buildFolderPath(parentId);

    // Vérifier que le parent n'est pas un dossier personnel
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId },
        select: { isPersonal: true },
      });
      if (parentFolder?.isPersonal) {
        return reply.status(400).send({
          error: 'INVALID_OPERATION',
          message: 'Impossible de créer un dossier général dans un dossier personnel',
        });
      }
    }

    // Vérifier l'unicité du slug dans le parent (espace général uniquement)
    const existing = await prisma.folder.findFirst({
      where: { parentId, slug, isPersonal: false },
    });

    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    // Calculer la position (espace général uniquement)
    const maxPosition = await prisma.folder.aggregate({
      where: { parentId, isPersonal: false },
      _max: { position: true },
    });
    const position = (maxPosition._max.position ?? -1) + 1;

    const folder = await prisma.folder.create({
      data: {
        name,
        slug: finalSlug,
        path,
        parentId,
        color,
        icon,
        position,
        createdBy: userId,
      },
    });

    // Hériter des permissions du parent
    if (parentId) {
      const parentPermissions = await prisma.permission.findMany({
        where: { resourceType: 'FOLDER', resourceId: parentId },
      });

      if (parentPermissions.length > 0) {
        await prisma.permission.createMany({
          data: parentPermissions.map((p) => ({
            resourceType: 'FOLDER' as const,
            resourceId: folder.id,
            principalType: p.principalType,
            principalId: p.principalId,
            level: p.level,
            inherited: true,
            grantedBy: userId,
          })),
        });
      }
    }

    await createAuditLog({
      userId,
      action: 'FOLDER_CREATED',
      resourceType: 'FOLDER',
      resourceId: folder.id,
      details: { name, parentId },
      ipAddress: request.ip,
    });

    return reply.status(201).send({
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    });
  });

  /**
   * GET /api/v1/folders/:id/content
   * P0: Lazy loading du contenu d'un dossier (sous-dossiers + notes)
   * Optimisé pour la sidebar avec tri alphabétique
   * Retourne aussi le breadcrumb pour la navigation en page
   */
  app.get('/:id/content', {
    schema: {
      tags: ['Folders'],
      summary: 'Get folder content for lazy loading',
      description: 'Returns children folders and notes sorted alphabetically (folders first, then notes)',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const hasPermission = await checkPermission(userId, 'FOLDER', id, 'READ');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas accès à ce dossier",
      });
    }

    const folder = await prisma.folder.findUnique({
      where: {
        id,
        isPersonal: false,  // Uniquement espace général
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
        parentId: true,
        path: true,
        children: {
          where: { isPersonal: false },  // Filtrer les enfants aussi
          orderBy: [{ name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
            position: true,
            _count: {
              select: {
                children: true,
                notes: { where: { isDeleted: false } },
              },
            },
          },
        },
        notes: {
          where: { isDeleted: false, isPersonal: false },
          orderBy: [{ title: 'asc' }],
          select: {
            id: true,
            title: true,
            slug: true,
            position: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!folder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier non trouvé',
      });
    }

    // Construire le breadcrumb en remontant les parents (espace général uniquement)
    const breadcrumb: Array<{ id: string; name: string; slug: string }> = [];
    let currentParentId = folder.parentId;

    while (currentParentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: currentParentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });
      if (!parent) break;
      breadcrumb.unshift({ id: parent.id, name: parent.name, slug: parent.slug });
      currentParentId = parent.parentId;
    }

    // Ajouter le dossier courant à la fin du breadcrumb
    breadcrumb.push({ id: folder.id, name: folder.name, slug: folder.slug });

    // Formater la réponse selon FolderContentResponse (format page)
    return {
      folder: {
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        color: folder.color,
        icon: folder.icon,
        parentId: folder.parentId,
        path: folder.path,
      },
      children: folder.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        color: child.color,
        icon: child.icon,
        position: child.position,
        hasChildren: child._count.children > 0,
        notesCount: child._count.notes,
      })),
      notes: folder.notes.map((note) => ({
        id: note.id,
        title: note.title,
        slug: note.slug,
        position: note.position,
        updatedAt: note.updatedAt.toISOString(),
        createdAt: note.createdAt.toISOString(),
      })),
      breadcrumb,
    };
  });

  /**
   * GET /api/v1/folders/:id
   * Récupérer un dossier par ID
   */
  app.get('/:id', {
    schema: {
      tags: ['Folders'],
      summary: 'Get folder by ID',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const hasPermission = await checkPermission(userId, 'FOLDER', id, 'READ');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas accès à ce dossier",
      });
    }

    const folder = await prisma.folder.findUnique({
      where: {
        id,
        isPersonal: false,  // Uniquement espace général
      },
      include: {
        notes: {
          where: { isDeleted: false, isPersonal: false },
          orderBy: [{ position: 'asc' }, { title: 'asc' }],
        },
        children: {
          where: { isPersonal: false },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!folder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier non trouvé',
      });
    }

    return {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  });

  /**
   * PATCH /api/v1/folders/:id
   * US-022: Renommer un dossier
   */
  app.patch('/:id', {
    schema: {
      tags: ['Folders'],
      summary: 'Update folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const hasPermission = await checkPermission(userId, 'FOLDER', id, 'WRITE');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits de modification sur ce dossier",
      });
    }

    const parseResult = updateFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid update data',
        details: parseResult.error.flatten(),
      });
    }

    // Vérifier que le dossier existe et n'est pas personnel
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      select: { isPersonal: true },
    });
    if (!existingFolder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier non trouvé',
      });
    }
    if (existingFolder.isPersonal) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Cette route ne permet pas de modifier un dossier personnel',
      });
    }

    const updates = parseResult.data;
    const updateData: Record<string, unknown> = { ...updates };

    // Si le nom change, mettre à jour le slug
    if (updates.name) {
      updateData.slug = generateSlug(updates.name);
    }

    const folder = await prisma.folder.update({
      where: { id, isPersonal: false },
      data: updateData,
    });

    await createAuditLog({
      userId,
      action: 'FOLDER_UPDATED',
      resourceType: 'FOLDER',
      resourceId: id,
      details: updates,
      ipAddress: request.ip,
    });

    return {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  });

  /**
   * POST /api/v1/folders/:id/move
   * US-023: Déplacer un dossier
   */
  app.post('/:id/move', {
    schema: {
      tags: ['Folders'],
      summary: 'Move folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const parseResult = moveFolderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid move data',
      });
    }

    const { parentId: newParentId } = parseResult.data;

    // Vérifier les permissions
    const hasSourcePermission = await checkPermission(userId, 'FOLDER', id, 'WRITE');
    if (!hasSourcePermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits sur ce dossier",
      });
    }

    if (newParentId) {
      const hasTargetPermission = await checkPermission(userId, 'FOLDER', newParentId, 'WRITE');
      if (!hasTargetPermission) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: "Vous n'avez pas les droits sur le dossier de destination",
        });
      }

      // Empêcher de déplacer un dossier dans lui-même ou un descendant
      if (newParentId === id) {
        return reply.status(400).send({
          error: 'INVALID_OPERATION',
          message: 'Un dossier ne peut pas être déplacé dans lui-même',
        });
      }
    }

    // Vérifier que le dossier source existe et n'est pas personnel
    const folder = await prisma.folder.findUnique({
      where: { id },
      select: { id: true, parentId: true, isPersonal: true },
    });
    if (!folder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier non trouvé',
      });
    }
    if (folder.isPersonal) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Cette route ne permet pas de déplacer un dossier personnel',
      });
    }

    // Vérifier que la destination n'est pas un dossier personnel
    if (newParentId) {
      const targetFolder = await prisma.folder.findUnique({
        where: { id: newParentId },
        select: { isPersonal: true },
      });
      if (targetFolder?.isPersonal) {
        return reply.status(400).send({
          error: 'INVALID_OPERATION',
          message: 'Impossible de déplacer un dossier général vers un dossier personnel',
        });
      }
    }

    const newPath = await buildFolderPath(newParentId);

    const updated = await prisma.folder.update({
      where: { id, isPersonal: false },
      data: {
        parentId: newParentId,
        path: newPath,
      },
    });

    await createAuditLog({
      userId,
      action: 'FOLDER_UPDATED',
      resourceType: 'FOLDER',
      resourceId: id,
      details: { moved: true, from: folder.parentId, to: newParentId },
      ipAddress: request.ip,
    });

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /**
   * DELETE /api/v1/folders/:id
   * US-024: Supprimer un dossier
   */
  app.delete('/:id', {
    schema: {
      tags: ['Folders'],
      summary: 'Delete folder',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const hasPermission = await checkPermission(userId, 'FOLDER', id, 'ADMIN');
    if (!hasPermission) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: "Vous n'avez pas les droits d'administration sur ce dossier",
      });
    }

    // Vérifier que le dossier existe et n'est pas personnel
    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      select: { isPersonal: true },
    });
    if (!existingFolder) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Dossier non trouvé',
      });
    }
    if (existingFolder.isPersonal) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Cette route ne permet pas de supprimer un dossier personnel',
      });
    }

    // Compter les éléments impactés (espace général uniquement)
    const notesCount = await prisma.note.count({
      where: { folderId: id, isDeleted: false, isPersonal: false },
    });
    const subFoldersCount = await prisma.folder.count({
      where: { parentId: id, isPersonal: false },
    });

    // Soft delete des notes (espace général uniquement)
    await prisma.note.updateMany({
      where: { folderId: id, isPersonal: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    // Supprimer le dossier (cascade sur sous-dossiers via Prisma)
    await prisma.folder.delete({ where: { id, isPersonal: false } });

    await createAuditLog({
      userId,
      action: 'FOLDER_DELETED',
      resourceType: 'FOLDER',
      resourceId: id,
      details: { notesCount, subFoldersCount },
      ipAddress: request.ip,
    });

    return { success: true, deleted: { notes: notesCount, folders: subFoldersCount + 1 } };
  });
};
