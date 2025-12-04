// ===========================================
// Routes Import/Export (EP-008)
// US-080: Export notes en Markdown
// US-081: Export en ZIP avec structure
// US-082: Import depuis Markdown/ZIP
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { getEffectivePermissions } from '../services/permissions.js';
import archiver from 'archiver';
import { Readable } from 'stream';

const exportSchema = z.object({
  noteIds: z.array(z.string().uuid()).optional(),
  folderId: z.string().uuid().optional(),
  format: z.enum(['markdown', 'json', 'zip']).default('zip'),
  includeMetadata: z.boolean().default(true),
  includeAttachments: z.boolean().default(false),
});

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

    // Récupérer les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = new Set(
      permissions.filter((p) => p.level !== 'NONE').map((p) => p.resourceId)
    );

    // Construire la requête
    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (noteIds && noteIds.length > 0) {
      where.id = { in: noteIds };
    } else if (folderId) {
      where.folderId = folderId;
    }

    // Récupérer les notes
    const notes = await prisma.note.findMany({
      where,
      include: {
        folder: { select: { path: true, name: true } },
        author: { select: { displayName: true } },
        tags: { include: { tag: true } },
      },
    });

    // Filtrer par permissions
    const accessibleNotes = notes.filter((note) =>
      accessibleFolderIds.has(note.folderId)
    );

    if (accessibleNotes.length === 0) {
      return reply.status(404).send({
        error: 'NO_NOTES_FOUND',
        message: 'Aucune note accessible à exporter',
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
        `attachment; filename="collabnotes-export-${Date.now()}.json"`
      );
      return exportData;
    }

    // Format Markdown simple (une seule note)
    if (format === 'markdown' && accessibleNotes.length === 1) {
      const note = accessibleNotes[0];
      const markdown = generateMarkdown(note, includeMetadata);

      reply.header('Content-Type', 'text/markdown');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${note.slug}.md"`
      );
      return markdown;
    }

    // Format ZIP (structure de dossiers)
    reply.header('Content-Type', 'application/zip');
    reply.header(
      'Content-Disposition',
      `attachment; filename="collabnotes-export-${Date.now()}.zip"`
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
    for (const [folderPath, folderNotes] of notesByFolder) {
      for (const note of folderNotes) {
        const markdown = generateMarkdown(note, includeMetadata);
        const filePath = `${folderPath}/${note.slug}.md`;
        archive.append(markdown, { name: filePath });
      }
    }

    // Ajouter un fichier index
    const indexContent = generateIndexFile(accessibleNotes);
    archive.append(indexContent, { name: 'index.md' });

    archive.finalize();

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
  let content = '# CollabNotes Export\n\n';
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
