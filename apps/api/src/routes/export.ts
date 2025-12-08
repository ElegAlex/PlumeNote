// ===========================================
// Routes Import/Export (EP-008)
// US-080: Export notes en Markdown
// US-081: Export en ZIP avec structure
// US-082: Import depuis Markdown/ZIP
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import archiver from 'archiver';
import { logger } from '../lib/logger.js';

const exportSchema = z.object({
  noteIds: z.array(z.string().uuid()).optional(),
  folderId: z.string().uuid().optional(),
  format: z.enum(['markdown', 'json', 'zip']).default('zip'),
  includeMetadata: z.boolean().default(true),
  includeAttachments: z.boolean().default(false),
});

/**
 * Vérifie si un utilisateur a accès à un dossier
 * Utilise le système accessType (OPEN/RESTRICTED) + folder_access
 */
async function canAccessFolder(
  userId: string,
  folderId: string,
  isAdmin: boolean
): Promise<boolean> {
  // Les admins ont accès à tout
  if (isAdmin) return true;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: {
      accessType: true,
      accessList: {
        where: { userId },
        select: { canRead: true },
      },
    },
  });

  if (!folder) return false;

  // Dossiers OPEN sont accessibles à tous les utilisateurs authentifiés
  if (folder.accessType === 'OPEN') return true;

  // Dossiers RESTRICTED nécessitent un accès explicite
  return folder.accessList.some((a) => a.canRead);
}

/**
 * Récupère tous les IDs de dossiers accessibles par un utilisateur
 */
async function getAccessibleFolderIds(
  userId: string,
  isAdmin: boolean
): Promise<Set<string>> {
  // Les admins ont accès à tout
  if (isAdmin) {
    const allFolders = await prisma.folder.findMany({
      where: { isPersonal: false },
      select: { id: true },
    });
    return new Set(allFolders.map((f) => f.id));
  }

  // Récupérer tous les dossiers avec leur type d'accès
  const folders = await prisma.folder.findMany({
    where: { isPersonal: false },
    select: {
      id: true,
      accessType: true,
      accessList: {
        where: { userId },
        select: { canRead: true },
      },
    },
  });

  const accessibleIds = new Set<string>();

  for (const folder of folders) {
    // Dossiers OPEN sont accessibles à tous
    if (folder.accessType === 'OPEN') {
      accessibleIds.add(folder.id);
    }
    // Dossiers RESTRICTED avec accès explicite
    else if (folder.accessList.some((a) => a.canRead)) {
      accessibleIds.add(folder.id);
    }
  }

  return accessibleIds;
}

export const exportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/export
   * US-080/081: Exporter des notes
   */
  app.post('/', {
    schema: {
      tags: ['Export'],
      summary: 'Export notes',
      description: 'Export notes in various formats',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = exportSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const { noteIds, folderId, format, includeMetadata } = parseResult.data;
    const userId = request.user.userId;

    // Vérifier si l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const isAdmin = user?.role.name === 'admin';

    // Valider l'accès au dossier demandé AVANT de récupérer les notes
    if (folderId) {
      const folderExists = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true },
      });

      if (!folderExists) {
        return reply.status(404).send({
          error: 'FOLDER_NOT_FOUND',
          message: 'Le dossier demandé n\'existe pas',
        });
      }

      const hasAccess = await canAccessFolder(userId, folderId, isAdmin);
      if (!hasAccess) {
        return reply.status(403).send({
          error: 'FORBIDDEN',
          message: 'Vous n\'avez pas accès à ce dossier',
        });
      }
    }

    // Récupérer les IDs des dossiers accessibles
    const accessibleFolderIds = await getAccessibleFolderIds(userId, isAdmin);

    // Construire la requête
    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (noteIds && noteIds.length > 0) {
      where.id = { in: noteIds };
    } else if (folderId) {
      // Récupérer le dossier et tous ses sous-dossiers
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { path: true, name: true },
      });

      if (folder) {
        // Construire le chemin complet du dossier
        const folderFullPath = folder.path === '/'
          ? `/${folder.name}`
          : `${folder.path}/${folder.name}`;

        // Récupérer tous les dossiers qui commencent par ce chemin (incluant le dossier lui-même)
        const subfolders = await prisma.folder.findMany({
          where: {
            OR: [
              { id: folderId }, // Le dossier lui-même
              { path: { startsWith: folderFullPath } }, // Sous-dossiers
            ],
          },
          select: { id: true },
        });

        const folderIds = subfolders.map((f) => f.id);
        where.folderId = { in: folderIds };

        logger.info({ folderId, folderFullPath, subfolderCount: folderIds.length }, '[Export] Including subfolders');
      } else {
        where.folderId = folderId;
      }
    }

    logger.info({ where, userId, isAdmin }, '[Export] Query parameters');

    // Récupérer les notes
    const notes = await prisma.note.findMany({
      where,
      include: {
        folder: { select: { path: true, name: true } },
        author: { select: { displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    logger.info({ notesCount: notes.length }, '[Export] Notes found');

    // Filtrer par permissions (pour le cas des noteIds sans folderId spécifique)
    const accessibleNotes = folderId
      ? notes // Si folderId spécifié et accès validé, toutes les notes sont accessibles
      : notes.filter((note) => accessibleFolderIds.has(note.folderId));

    logger.info({ accessibleNotesCount: accessibleNotes.length }, '[Export] Accessible notes after filtering');

    // Cas spécifique : export par noteIds sans aucune note accessible
    if (noteIds && noteIds.length > 0 && accessibleNotes.length === 0) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Aucune des notes demandées n\'est accessible',
      });
    }

    // Format JSON simple
    if (format === 'json') {
      const exportData = accessibleNotes.map((note) => ({
        id: note.id,
        title: note.title,
        slug: note.slug,
        content: note.content,
        folderPath: `${note.folder.path}/${note.folder.name}`,
        tags: note.tags.map((t) => t.tag.name),
        author: note.author.displayName,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        ...(includeMetadata && { frontmatter: note.frontmatter }),
      }));

      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="plumenote-export-${Date.now()}.json"`
      );
      // Retourne un tableau vide si aucune note (dossier vide mais accessible)
      return exportData;
    }

    // Format Markdown simple (une seule note uniquement)
    if (format === 'markdown') {
      if (accessibleNotes.length === 0) {
        return reply.status(200).send({
          message: 'Le dossier est vide, aucune note à exporter',
          notesCount: 0,
        });
      }
      if (accessibleNotes.length === 1) {
        const note = accessibleNotes[0];
        const markdown = generateMarkdown(note, includeMetadata);

        reply.header('Content-Type', 'text/markdown');
        reply.header(
          'Content-Disposition',
          `attachment; filename="${note.slug}.md"`
        );
        return markdown;
      }
      // Plus d'une note -> forcer le format ZIP
      // Fall through to ZIP handling
    }

    // Format ZIP (structure de dossiers)
    reply.header('Content-Type', 'application/zip');
    reply.header(
      'Content-Disposition',
      `attachment; filename="plumenote-export-${Date.now()}.zip"`
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    // Organiser par dossier
    const notesByFolder = new Map<string, typeof accessibleNotes>();
    for (const note of accessibleNotes) {
      const folderPath = `${note.folder.path}/${note.folder.name}`.replace(/^\//, '');
      if (!notesByFolder.has(folderPath)) {
        notesByFolder.set(folderPath, []);
      }
      notesByFolder.get(folderPath)!.push(note);
    }

    // Ajouter les fichiers au ZIP
    let addedFiles = 0;
    for (const [folderPath, folderNotes] of notesByFolder) {
      for (const note of folderNotes) {
        const markdown = generateMarkdown(note, includeMetadata);
        const filePath = `${folderPath}/${note.slug}.md`;
        archive.append(markdown, { name: filePath });
        addedFiles++;
        logger.info({ noteTitle: note.title, filePath }, '[Export] Adding note to ZIP');
      }
    }

    // Ajouter un fichier index
    const indexContent = generateIndexFile(accessibleNotes);
    archive.append(indexContent, { name: 'index.md' });
    addedFiles++;

    logger.info({ totalFiles: addedFiles }, '[Export] Finalizing ZIP');

    // IMPORTANT: attendre que finalize() soit terminé avant d'envoyer
    await archive.finalize();

    logger.info({ archiveSize: archive.pointer() }, '[Export] ZIP finalized');

    return reply.send(archive);
  });

  /**
   * GET /api/v1/export/note/:noteId
   * Export d'une seule note
   */
  app.get('/note/:noteId', {
    schema: {
      tags: ['Export'],
      summary: 'Export single note',
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
          format: { type: 'string', enum: ['markdown', 'json'] },
        },
      },
    },
  }, async (request, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { format = 'markdown' } = request.query as { format?: string };

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folder: { select: { path: true, name: true } },
        author: { select: { displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'NOTE_NOT_FOUND' });
    }

    if (format === 'json') {
      reply.header('Content-Type', 'application/json');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${note.slug}.json"`
      );
      return {
        title: note.title,
        content: note.content,
        tags: note.tags.map((t) => t.tag.name),
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      };
    }

    const markdown = generateMarkdown(note, true);
    reply.header('Content-Type', 'text/markdown');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${note.slug}.md"`
    );
    return markdown;
  });
};

/**
 * Génère le contenu Markdown avec frontmatter YAML
 */
function generateMarkdown(
  note: {
    title: string;
    content: string;
    slug: string;
    folder: { path: string; name: string };
    author: { displayName: string };
    tags: { tag: { name: string } }[];
    frontmatter: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
  includeMetadata: boolean
): string {
  let markdown = '';

  if (includeMetadata) {
    const tags = note.tags.map((t) => t.tag.name);
    markdown += '---\n';
    markdown += `title: "${note.title}"\n`;
    markdown += `slug: "${note.slug}"\n`;
    markdown += `author: "${note.author.displayName}"\n`;
    if (tags.length > 0) {
      markdown += `tags: [${tags.map((t) => `"${t}"`).join(', ')}]\n`;
    }
    markdown += `created: ${note.createdAt.toISOString()}\n`;
    markdown += `updated: ${note.updatedAt.toISOString()}\n`;
    markdown += '---\n\n';
  }

  markdown += note.content;

  return markdown;
}

/**
 * Génère le fichier index avec la liste des notes
 */
function generateIndexFile(
  notes: {
    title: string;
    slug: string;
    folder: { path: string; name: string };
    updatedAt: Date;
  }[]
): string {
  let content = '# PlumeNote Export\n\n';
  content += `Exported on ${new Date().toISOString()}\n\n`;
  content += `Total notes: ${notes.length}\n\n`;
  content += '## Notes\n\n';

  // Grouper par dossier
  const notesByFolder = new Map<string, typeof notes>();
  for (const note of notes) {
    const folderPath = `${note.folder.path}/${note.folder.name}`;
    if (!notesByFolder.has(folderPath)) {
      notesByFolder.set(folderPath, []);
    }
    notesByFolder.get(folderPath)!.push(note);
  }

  for (const [folderPath, folderNotes] of notesByFolder) {
    content += `### ${folderPath}\n\n`;
    for (const note of folderNotes) {
      content += `- [[${note.title}]] (${note.slug}.md)\n`;
    }
    content += '\n';
  }

  return content;
}
