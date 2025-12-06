// ===========================================
// Wikilink Resolver
// EP-008: Résolution des liens [[...]] après import
// ===========================================

import { prisma } from '@collabnotes/database';

/**
 * Résultat de résolution d'un lien
 */
export interface ResolvedLink {
  linkId: string;
  targetSlug: string;
  resolved: boolean;
  targetNoteId: string | null;
  targetNoteTitle: string | null;
}

/**
 * Statistiques de résolution
 */
export interface ResolutionStats {
  total: number;
  resolved: number;
  unresolved: number;
}

/**
 * Résolveur de wikilinks après import
 */
export class WikilinkResolver {
  /**
   * Résout tous les liens brisés créés lors d'un import
   * @param createdNoteIds Liste des IDs de notes créées lors de l'import
   */
  async resolveForImportedNotes(createdNoteIds: string[]): Promise<ResolutionStats> {
    if (createdNoteIds.length === 0) {
      return { total: 0, resolved: 0, unresolved: 0 };
    }

    // Récupérer tous les liens brisés des notes importées
    const brokenLinks = await prisma.link.findMany({
      where: {
        sourceNoteId: { in: createdNoteIds },
        isBroken: true,
      },
      select: {
        id: true,
        targetSlug: true,
        sourceNoteId: true,
      },
    });

    let resolved = 0;

    for (const link of brokenLinks) {
      const targetNote = await this.findTargetNote(link.targetSlug);

      if (targetNote) {
        await prisma.link.update({
          where: { id: link.id },
          data: {
            targetNoteId: targetNote.id,
            isBroken: false,
          },
        });
        resolved++;
      }
    }

    return {
      total: brokenLinks.length,
      resolved,
      unresolved: brokenLinks.length - resolved,
    };
  }

  /**
   * Résout tous les liens brisés globalement
   */
  async resolveAllBrokenLinks(): Promise<ResolutionStats> {
    const brokenLinks = await prisma.link.findMany({
      where: { isBroken: true },
      select: {
        id: true,
        targetSlug: true,
      },
    });

    let resolved = 0;

    for (const link of brokenLinks) {
      const targetNote = await this.findTargetNote(link.targetSlug);

      if (targetNote) {
        await prisma.link.update({
          where: { id: link.id },
          data: {
            targetNoteId: targetNote.id,
            isBroken: false,
          },
        });
        resolved++;
      }
    }

    return {
      total: brokenLinks.length,
      resolved,
      unresolved: brokenLinks.length - resolved,
    };
  }

  /**
   * Met à jour les liens pointant vers une note renommée
   */
  async updateLinksAfterRename(
    noteId: string,
    oldTitle: string,
    newTitle: string
  ): Promise<void> {
    // Mettre à jour les slugs des liens vers cette note
    await prisma.link.updateMany({
      where: { targetNoteId: noteId },
      data: { targetSlug: newTitle },
    });
  }

  /**
   * Trouve une note cible par son slug ou titre
   */
  private async findTargetNote(
    target: string
  ): Promise<{ id: string; title: string } | null> {
    const slug = this.generateSlug(target);

    // Si le target contient un chemin (ex: "Projets/Ma note")
    if (target.includes('/')) {
      const parts = target.split('/');
      const noteTitle = parts.pop()!;
      const noteSlug = this.generateSlug(noteTitle);
      const folderPath = parts.join('/');

      const note = await prisma.note.findFirst({
        where: {
          slug: noteSlug,
          isDeleted: false,
          isPersonal: false, // Ignorer les notes personnelles
          folder: {
            path: { endsWith: folderPath },
          },
        },
        select: { id: true, title: true },
      });

      if (note) return note;
    }

    // Recherche par slug ou titre exact (insensible à la casse)
    const note = await prisma.note.findFirst({
      where: {
        OR: [
          { slug },
          { title: { equals: target, mode: 'insensitive' } },
        ],
        isDeleted: false,
        isPersonal: false,
      },
      select: { id: true, title: true },
    });

    return note;
  }

  /**
   * Génère un slug à partir d'un titre
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Récupère les liens non résolus pour une liste de notes
   */
  async getUnresolvedLinks(noteIds: string[]): Promise<Array<{
    noteId: string;
    noteTitle: string;
    targetSlug: string;
    context: string | null;
  }>> {
    const links = await prisma.link.findMany({
      where: {
        sourceNoteId: { in: noteIds },
        isBroken: true,
      },
      select: {
        sourceNoteId: true,
        targetSlug: true,
        context: true,
        sourceNote: {
          select: { title: true },
        },
      },
    });

    return links.map(link => ({
      noteId: link.sourceNoteId,
      noteTitle: link.sourceNote.title,
      targetSlug: link.targetSlug,
      context: link.context,
    }));
  }
}

// Instance singleton
export const wikilinkResolver = new WikilinkResolver();
