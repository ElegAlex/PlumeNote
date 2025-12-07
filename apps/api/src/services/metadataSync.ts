// ===========================================
// Service de synchronisation Metadata <-> YAML
// Bidirectionnel : Table NoteMetadata <-> Frontmatter Markdown
// ===========================================

import { parse, stringify } from 'yaml';
import { prisma, MetadataType } from '@plumenote/database';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Helper: extraire le frontmatter d'un contenu Markdown
export function extractFrontmatter(content: string): { frontmatter: Record<string, unknown> | null; body: string } {
  if (!content) return { frontmatter: null, body: '' };
  const match = content.match(FRONTMATTER_REGEX);
  if (!match || !match[1]) return { frontmatter: null, body: content };
  try {
    const frontmatter = parse(match[1] as string) as Record<string, unknown>;
    const body = content.slice(match[0].length);
    return { frontmatter: frontmatter || null, body };
  } catch {
    return { frontmatter: null, body: content };
  }
}

// Helper: injecter le frontmatter dans un contenu Markdown
export function injectFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return body;
  const yamlStr = stringify(frontmatter, { lineWidth: 0 }).trim();
  return `---\n${yamlStr}\n---\n${body}`;
}

// Inférer le type de métadonnée depuis une valeur
function inferType(value: unknown): MetadataType {
  if (typeof value === 'boolean') return 'CHECKBOX';
  if (typeof value === 'number') return 'NUMBER';
  if (Array.isArray(value)) return 'MULTI_SELECT';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATE';
    if (/^https?:\/\//.test(value)) return 'URL';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'EMAIL';
  }
  return 'TEXT';
}

// Table → Frontmatter YAML : génère le nouveau contenu Markdown avec frontmatter
export async function syncMetadataToYaml(noteId: string): Promise<string> {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { content: true } });
  if (!note) throw new Error('Note not found');

  const metadata = await prisma.noteMetadata.findMany({
    where: { noteId },
    orderBy: { position: 'asc' },
  });

  const { body } = extractFrontmatter(note.content || '');
  if (metadata.length === 0) return body;

  const frontmatter: Record<string, unknown> = {};
  for (const m of metadata) {
    try {
      frontmatter[m.key] = JSON.parse(m.value);
    } catch {
      frontmatter[m.key] = m.value;
    }
  }

  return injectFrontmatter(frontmatter, body);
}

// Frontmatter YAML → Table : parse et met à jour la table
export async function syncYamlToMetadata(noteId: string, markdownContent: string): Promise<void> {
  const { frontmatter } = extractFrontmatter(markdownContent);

  await prisma.$transaction(async (tx) => {
    await tx.noteMetadata.deleteMany({ where: { noteId } });

    if (!frontmatter || Object.keys(frontmatter).length === 0) return;

    const entries = Object.entries(frontmatter);
    await tx.noteMetadata.createMany({
      data: entries.map(([key, value], idx) => ({
        noteId,
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        type: inferType(value),
        position: idx,
      })),
    });
  });
}
