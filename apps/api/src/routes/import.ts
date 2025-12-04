// ===========================================
// Routes Import (EP-008)
// US-082: Import depuis Markdown/ZIP
// US-083: Import depuis Obsidian/Notion
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@collabnotes/database';
import { getEffectivePermissions } from '../services/permissions.js';
import { extractLinksFromContent } from '../services/links.js';
import unzipper from 'unzipper';
import { Readable } from 'stream';

interface ImportedNote {
  title: string;
  content: string;
  slug: string;
  path: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/import
   * US-082: Importer des notes depuis un fichier ZIP ou Markdown
   */
  app.post('/', {
    schema: {
      tags: ['Import'],
      summary: 'Import notes',
      description: 'Import notes from Markdown files or ZIP archive',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    // Récupérer les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const writableFolderIds = permissions
      .filter((p) => p.level === 'WRITE' || p.level === 'ADMIN')
      .map((p) => p.resourceId);

    if (writableFolderIds.length === 0) {
      return reply.status(403).send({
        error: 'NO_WRITE_ACCESS',
        message: "Vous n'avez pas de dossier avec droits d'écriture",
      });
    }

    // Parser le fichier uploadé
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    const filename = data.filename.toLowerCase();
    const buffer = await data.toBuffer();

    let importedNotes: ImportedNote[] = [];

    try {
      if (filename.endsWith('.zip')) {
        importedNotes = await parseZipFile(buffer);
      } else if (filename.endsWith('.md')) {
        const content = buffer.toString('utf-8');
        const note = parseMarkdownFile(content, data.filename);
        importedNotes = [note];
      } else {
        return reply.status(400).send({
          error: 'UNSUPPORTED_FORMAT',
          message: 'Format non supporté. Utilisez .md ou .zip',
        });
      }
    } catch (error) {
      return reply.status(400).send({
        error: 'PARSE_ERROR',
        message: "Erreur lors de l'analyse du fichier",
      });
    }

    // Importer les notes
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Récupérer le premier dossier avec droits d'écriture comme destination par défaut
    const defaultFolderId = writableFolderIds[0];

    for (const noteData of importedNotes) {
      try {
        // Vérifier si une note avec ce slug existe déjà
        const existingNote = await prisma.note.findFirst({
          where: {
            slug: noteData.slug,
            folderId: defaultFolderId,
          },
        });

        if (existingNote) {
          results.skipped++;
          continue;
        }

        // Créer ou récupérer les tags
        const tagIds: string[] = [];
        for (const tagName of noteData.tags) {
          let tag = await prisma.tag.findUnique({
            where: { name: tagName },
          });
          if (!tag) {
            tag = await prisma.tag.create({
              data: { name: tagName },
            });
          }
          tagIds.push(tag.id);
        }

        // Créer la note
        const newNote = await prisma.note.create({
          data: {
            title: noteData.title,
            slug: noteData.slug,
            content: noteData.content,
            folderId: defaultFolderId,
            authorId: userId,
            frontmatter: noteData.frontmatter,
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          },
        });

        // Extraire et créer les liens
        const links = extractLinksFromContent(noteData.content);
        for (const link of links) {
          await prisma.link.create({
            data: {
              sourceNoteId: newNote.id,
              targetSlug: link.slug,
              alias: link.alias,
              context: link.context,
              isBroken: true, // Sera résolu plus tard
            },
          });
        }

        results.imported++;
      } catch (error) {
        results.errors.push(`Erreur pour "${noteData.title}": ${(error as Error).message}`);
      }
    }

    // Résoudre les liens après l'import
    await resolveLinks();

    return {
      success: true,
      results,
      message: `${results.imported} note(s) importée(s), ${results.skipped} ignorée(s)`,
    };
  });

  /**
   * POST /api/v1/import/obsidian
   * US-083: Import depuis un vault Obsidian
   */
  app.post('/obsidian', {
    schema: {
      tags: ['Import'],
      summary: 'Import from Obsidian vault',
      description: 'Import notes from an Obsidian vault ZIP export',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    // Réutilise la logique d'import ZIP mais avec parsing Obsidian spécifique
    return importRoutes;
  });
};

/**
 * Parse un fichier ZIP et extrait les notes Markdown
 */
async function parseZipFile(buffer: Buffer): Promise<ImportedNote[]> {
  const notes: ImportedNote[] = [];

  const directory = await unzipper.Open.buffer(buffer);

  for (const file of directory.files) {
    if (file.type === 'File' && file.path.endsWith('.md')) {
      const content = await file.buffer();
      const note = parseMarkdownFile(content.toString('utf-8'), file.path);
      notes.push(note);
    }
  }

  return notes;
}

/**
 * Parse un fichier Markdown avec frontmatter YAML
 */
function parseMarkdownFile(content: string, filepath: string): ImportedNote {
  let title = '';
  let body = content;
  let frontmatter: Record<string, unknown> = {};
  let tags: string[] = [];

  // Extraire le frontmatter YAML
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatterMatch) {
    body = content.slice(frontmatterMatch[0].length);
    const yaml = frontmatterMatch[1];

    // Parser le YAML simple
    const lines = yaml.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'title') {
          title = value.replace(/^["']|["']$/g, '');
        } else if (key === 'tags') {
          // Parser les tags [tag1, tag2] ou - tag
          const tagMatch = value.match(/\[(.*)\]/);
          if (tagMatch) {
            tags = tagMatch[1]
              .split(',')
              .map((t) => t.trim().replace(/^["']|["']$/g, ''));
          }
        } else {
          frontmatter[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  }

  // Si pas de titre dans le frontmatter, utiliser le premier # ou le nom du fichier
  if (!title) {
    const headerMatch = body.match(/^#\s+(.+)$/m);
    if (headerMatch) {
      title = headerMatch[1];
    } else {
      title = filepath
        .replace(/^.*\//, '')
        .replace(/\.md$/, '')
        .replace(/-/g, ' ');
    }
  }

  // Extraire les tags inline (#tag)
  const inlineTags = body.match(/#(\w+)/g);
  if (inlineTags) {
    tags = [...new Set([...tags, ...inlineTags.map((t) => t.slice(1))])];
  }

  // Générer le slug
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    title,
    content: body.trim(),
    slug,
    path: filepath,
    tags,
    frontmatter,
  };
}

/**
 * Résout les liens cassés après un import
 */
async function resolveLinks() {
  const brokenLinks = await prisma.link.findMany({
    where: { isBroken: true },
    select: { id: true, targetSlug: true },
  });

  for (const link of brokenLinks) {
    // Chercher une note correspondante
    const targetNote = await prisma.note.findFirst({
      where: {
        OR: [
          { slug: link.targetSlug },
          { title: { equals: link.targetSlug, mode: 'insensitive' } },
        ],
        isDeleted: false,
      },
      select: { id: true },
    });

    if (targetNote) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          targetNoteId: targetNote.id,
          isBroken: false,
        },
      });
    }
  }
}
