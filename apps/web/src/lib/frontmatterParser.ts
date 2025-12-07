// ===========================================
// Parser Frontmatter YAML (P2)
// Parse et sérialise le YAML frontmatter des notes
// ===========================================

import type { NoteMetadata } from '@plumenote/types';

// Regex pour détecter le frontmatter
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Extrait le frontmatter d'un contenu Markdown
 */
export function extractFrontmatter(content: string): {
  frontmatter: NoteMetadata;
  body: string;
} {
  const match = content.match(FRONTMATTER_REGEX);

  if (!match || !match[1]) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = content.slice(match[0].length);

  try {
    const frontmatter = parseYaml(yamlContent);
    return { frontmatter, body };
  } catch {
    // En cas d'erreur de parsing, retourner le contenu tel quel
    return { frontmatter: {}, body: content };
  }
}

/**
 * Combine le frontmatter avec le corps du document
 */
export function combineFrontmatter(
  frontmatter: NoteMetadata,
  body: string
): string {
  const keys = Object.keys(frontmatter);

  if (keys.length === 0) {
    return body;
  }

  const yaml = serializeYaml(frontmatter);
  return `---\n${yaml}---\n\n${body}`;
}

/**
 * Met à jour le frontmatter d'un contenu existant
 */
export function updateFrontmatter(
  content: string,
  updates: NoteMetadata
): string {
  const { frontmatter, body } = extractFrontmatter(content);
  const newFrontmatter = { ...frontmatter, ...updates };
  return combineFrontmatter(newFrontmatter, body);
}

/**
 * Supprime une clé du frontmatter
 */
export function removeFrontmatterKey(
  content: string,
  key: string
): string {
  const { frontmatter, body } = extractFrontmatter(content);
  const { [key]: _, ...rest } = frontmatter;
  return combineFrontmatter(rest, body);
}

// ----- Parser YAML simplifié -----
// Note: Pour une implémentation production, utiliser js-yaml

/**
 * Parse une chaîne YAML simple en objet
 */
function parseYaml(yaml: string): NoteMetadata {
  const result: NoteMetadata = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: unknown[] | null = null;

  for (const line of lines) {
    // Ligne vide
    if (!line.trim()) continue;

    // Élément de liste (pour les arrays)
    if (line.match(/^\s+-\s+/)) {
      const value = line.replace(/^\s+-\s+/, '').trim();
      if (currentKey !== null && currentArray !== null) {
        currentArray.push(parseValue(value));
      }
      continue;
    }

    // Clé-valeur
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)?$/);
    if (kvMatch && kvMatch[1]) {
      // Sauvegarder l'array précédent
      if (currentKey !== null && currentArray !== null) {
        result[currentKey] = currentArray;
      }

      currentKey = kvMatch[1];
      const rawValue = kvMatch[2]?.trim();

      if (!rawValue) {
        // Début d'un array (valeur vide = liste à suivre)
        currentArray = [];
      } else {
        currentArray = null;
        result[currentKey] = parseValue(rawValue);
      }
    }
  }

  // Ne pas oublier le dernier array
  if (currentKey !== null && currentArray !== null) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Parse une valeur YAML
 */
function parseValue(value: string): unknown {
  // Booléens
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null
  if (value === 'null' || value === '~') return null;

  // Nombres
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  // Chaînes entre guillemets
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Arrays inline [a, b, c]
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1);
    if (!inner.trim()) return [];
    return inner.split(',').map(v => parseValue(v.trim()));
  }

  // Chaîne par défaut
  return value;
}

/**
 * Sérialise un objet en YAML
 */
function serializeYaml(obj: NoteMetadata): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${serializeValue(item)}`);
        }
      }
    } else {
      lines.push(`${key}: ${serializeValue(value)}`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Sérialise une valeur en YAML
 */
function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    // Échapper les chaînes avec caractères spéciaux
    if (value.includes(':') || value.includes('#') || value.includes('\n') ||
        value.startsWith('"') || value.startsWith("'") ||
        /^[0-9]/.test(value) || value === 'true' || value === 'false' ||
        value === 'null' || value === '~') {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  // Pour les objets imbriqués, convertir en JSON
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

// ----- Utilitaires -----

/**
 * Vérifie si un contenu a un frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  return FRONTMATTER_REGEX.test(content);
}

/**
 * Obtient uniquement le frontmatter (sans le parser)
 */
export function getRawFrontmatter(content: string): string | null {
  const match = content.match(FRONTMATTER_REGEX);
  return match?.[1] ?? null;
}

/**
 * Formate une date pour le frontmatter
 */
export function formatDateForYaml(date: Date): string {
  const isoString = date.toISOString();
  return isoString.split('T')[0] ?? isoString;
}

/**
 * Formate une datetime pour le frontmatter
 */
export function formatDateTimeForYaml(date: Date): string {
  return date.toISOString();
}
