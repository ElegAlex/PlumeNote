// ===========================================
// Service Liens (EP-006)
// US-050: Wikilinks
// US-051: Rétroliens
// US-052: Liens brisés
// ===========================================

import { prisma } from '@collabnotes/database';

// Regex pour détecter les wikilinks [[titre]] ou [[titre|alias]]
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export interface ParsedLink {
  target: string;
  alias: string | null;
  position: number;
}

/**
 * Parse le contenu Markdown et extrait les wikilinks
 */
export function parseLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    links.push({
      target: match[1].trim(),
      alias: match[2]?.trim() || null,
      position: match.index,
    });
  }

  return links;
}

/**
 * Met à jour les liens d'une note après modification du contenu
 */
export async function updateLinks(noteId: string, content: string): Promise<void> {
  // Supprimer les anciens liens
  await prisma.link.deleteMany({
    where: { sourceNoteId: noteId },
  });

  // Parser les nouveaux liens
  const parsedLinks = parseLinks(content);

  if (parsedLinks.length === 0) return;

  // Résoudre les cibles
  const linksToCreate = await Promise.all(
    parsedLinks.map(async (link) => {
      const resolved = await resolveLink(link.target);

      // Extraire le contexte (texte autour du lien)
      const contextStart = Math.max(0, link.position - 50);
      const contextEnd = Math.min(content.length, link.position + link.target.length + 52);
      const context = content.slice(contextStart, contextEnd).replace(/\n/g, ' ').trim();

      return {
        sourceNoteId: noteId,
        targetNoteId: resolved.noteId,
        targetSlug: link.target,
        alias: link.alias,
        position: link.position,
        context,
        isBroken: !resolved.noteId,
      };
    })
  );

  // Créer les liens en batch
  if (linksToCreate.length > 0) {
    await prisma.link.createMany({
      data: linksToCreate,
    });
  }
}

/**
 * Résout un lien vers une note
 */
async function resolveLink(
  target: string
): Promise<{ noteId: string | null; isBroken: boolean }> {
  // Si le target contient un chemin (ex: "Projets/Ma note")
  if (target.includes('/')) {
    const parts = target.split('/');
    const noteSlug = generateSlug(parts.pop()!);
    const folderPath = parts.join('/');

    const note = await prisma.note.findFirst({
      where: {
        slug: noteSlug,
        isDeleted: false,
        folder: {
          path: { endsWith: folderPath },
        },
      },
      select: { id: true },
    });

    return { noteId: note?.id || null, isBroken: !note };
  }

  // Recherche par titre exact (case-insensitive)
  const slug = generateSlug(target);

  const note = await prisma.note.findFirst({
    where: {
      OR: [
        { slug },
        { title: { equals: target, mode: 'insensitive' } },
      ],
      isDeleted: false,
    },
    select: { id: true },
  });

  return { noteId: note?.id || null, isBroken: !note };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Met à jour les liens après renommage d'une note
 */
export async function updateLinksAfterRename(
  noteId: string,
  oldTitle: string,
  newTitle: string
): Promise<void> {
  // Trouver toutes les notes qui lient vers cette note
  const links = await prisma.link.findMany({
    where: { targetNoteId: noteId },
    include: {
      sourceNote: { select: { id: true, content: true } },
    },
  });

  // Mettre à jour le contenu de chaque note source
  for (const link of links) {
    const oldPattern = new RegExp(
      `\\[\\[${escapeRegex(oldTitle)}(\\|[^\\]]+)?\\]\\]`,
      'g'
    );

    const newContent = link.sourceNote.content.replace(
      oldPattern,
      (match, alias) => `[[${newTitle}${alias || ''}]]`
    );

    await prisma.note.update({
      where: { id: link.sourceNote.id },
      data: { content: newContent },
    });
  }

  // Mettre à jour les slugs dans la table links
  await prisma.link.updateMany({
    where: { targetNoteId: noteId },
    data: { targetSlug: newTitle },
  });
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Récupère les rétroliens d'une note
 */
export async function getBacklinks(noteId: string) {
  const links = await prisma.link.findMany({
    where: {
      targetNoteId: noteId,
      isBroken: false,
    },
    include: {
      sourceNote: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          folder: {
            select: { path: true },
          },
        },
      },
    },
    orderBy: {
      sourceNote: { updatedAt: 'desc' },
    },
  });

  return links.map((link) => ({
    noteId: link.sourceNote.id,
    noteTitle: link.sourceNote.title,
    folderPath: link.sourceNote.folder.path,
    context: link.context,
    updatedAt: link.sourceNote.updatedAt.toISOString(),
  }));
}

/**
 * Trouve les liens brisés dans l'application
 */
export async function findBrokenLinks() {
  return prisma.link.findMany({
    where: { isBroken: true },
    include: {
      sourceNote: {
        select: {
          id: true,
          title: true,
          folder: { select: { path: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Alias pour compatibilité
export const extractLinksFromContent = parseLinks;
