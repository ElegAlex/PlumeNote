// ===========================================
// Markdown Parser
// EP-008: Parsing de fichiers Markdown avec frontmatter
// ===========================================

/**
 * Métadonnées extraites du frontmatter YAML
 */
export interface Frontmatter {
  title?: string;
  tags?: string[];
  created?: string;
  modified?: string;
  author?: string;
  aliases?: string[];
  [key: string]: unknown;
}

/**
 * Lien wiki extrait [[target|alias]]
 */
export interface WikiLink {
  /** Cible du lien (nom de la note ou chemin) */
  target: string;
  /** Alias d'affichage optionnel */
  alias: string | null;
  /** Position dans le contenu */
  position: number;
  /** Texte de contexte autour du lien */
  context: string;
}

/**
 * Image extraite du contenu
 */
export interface ExtractedImage {
  /** URL ou chemin de l'image */
  src: string;
  /** Texte alternatif */
  alt: string;
  /** Position dans le contenu */
  position: number;
  /** Indique si c'est un chemin local */
  isLocal: boolean;
}

/**
 * Tag inline extrait (#tag)
 */
export interface InlineTag {
  /** Nom du tag sans le # */
  name: string;
  /** Position dans le contenu */
  position: number;
}

/**
 * Résultat du parsing d'un fichier Markdown
 */
export interface ParsedMarkdown {
  /** Frontmatter YAML */
  frontmatter: Frontmatter;
  /** Contenu Markdown sans le frontmatter */
  content: string;
  /** Titre extrait (frontmatter, premier heading, ou nom de fichier) */
  title: string;
  /** Liens wiki [[...]] */
  wikilinks: WikiLink[];
  /** Images */
  images: ExtractedImage[];
  /** Tags inline #tag */
  inlineTags: InlineTag[];
  /** Tags combinés (frontmatter + inline) */
  allTags: string[];
}

// Expressions régulières
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const INLINE_TAG_REGEX = /#([a-zA-Z0-9_-]+)/g;
const HEADING_REGEX = /^#{1,6}\s+(.+)$/m;

/**
 * Parser de fichiers Markdown
 */
export class MarkdownParser {
  private readonly contextRadius: number;

  constructor(contextRadius: number = 50) {
    this.contextRadius = contextRadius;
  }

  /**
   * Parse un fichier Markdown complet
   */
  parse(content: string, filename?: string): ParsedMarkdown {
    const { frontmatter, body } = this.extractFrontmatter(content);
    const wikilinks = this.extractWikilinks(body);
    const images = this.extractImages(body);
    const inlineTags = this.extractInlineTags(body);

    // Déterminer le titre
    const title = this.determineTitle(frontmatter, body, filename);

    // Combiner les tags
    const allTags = this.combineTags(frontmatter, inlineTags);

    return {
      frontmatter,
      content: body.trim(),
      title,
      wikilinks,
      images,
      inlineTags,
      allTags,
    };
  }

  /**
   * Extrait le frontmatter YAML du contenu
   */
  extractFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const yaml = match[1];
    const body = content.slice(match[0].length);

    try {
      const frontmatter = this.parseYaml(yaml);
      return { frontmatter, body };
    } catch {
      return { frontmatter: {}, body: content };
    }
  }

  /**
   * Parse simple du YAML (sans dépendance externe)
   */
  private parseYaml(yaml: string): Frontmatter {
    const result: Frontmatter = {};
    const lines = yaml.split('\n');
    let currentKey: string | null = null;
    let arrayBuffer: string[] = [];
    let inArray = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Ignorer les lignes vides
      if (!trimmed) continue;

      // Élément de liste YAML (- item)
      if (trimmed.startsWith('- ') && currentKey) {
        inArray = true;
        const value = trimmed.slice(2).trim().replace(/^["']|["']$/g, '');
        arrayBuffer.push(value);
        continue;
      }

      // Sauvegarder le tableau précédent si on sort d'un contexte de liste
      if (inArray && currentKey && !trimmed.startsWith('-')) {
        result[currentKey] = arrayBuffer;
        arrayBuffer = [];
        inArray = false;
      }

      // Paire clé: valeur
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        currentKey = trimmed.slice(0, colonIndex).trim();
        let value = trimmed.slice(colonIndex + 1).trim();

        // Valeur vide = début d'une liste
        if (!value) {
          arrayBuffer = [];
          continue;
        }

        // Liste inline [item1, item2]
        const arrayMatch = value.match(/^\[(.*)\]$/);
        if (arrayMatch) {
          result[currentKey] = arrayMatch[1]
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
          currentKey = null;
          continue;
        }

        // Valeur simple
        value = value.replace(/^["']|["']$/g, '');

        // Conversion de types
        if (value === 'true') {
          result[currentKey] = true;
        } else if (value === 'false') {
          result[currentKey] = false;
        } else if (value === 'null' || value === '~') {
          result[currentKey] = null;
        } else if (/^-?\d+$/.test(value)) {
          result[currentKey] = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
          result[currentKey] = parseFloat(value);
        } else {
          result[currentKey] = value;
        }
      }
    }

    // Sauvegarder le dernier tableau si présent
    if (inArray && currentKey) {
      result[currentKey] = arrayBuffer;
    }

    return result;
  }

  /**
   * Extrait les wikilinks [[target|alias]]
   */
  extractWikilinks(content: string): WikiLink[] {
    const links: WikiLink[] = [];
    let match: RegExpExecArray | null;

    // Reset regex
    WIKILINK_REGEX.lastIndex = 0;

    while ((match = WIKILINK_REGEX.exec(content)) !== null) {
      const target = match[1].trim();
      const alias = match[2]?.trim() || null;
      const position = match.index;

      // Extraire le contexte
      const contextStart = Math.max(0, position - this.contextRadius);
      const contextEnd = Math.min(content.length, position + match[0].length + this.contextRadius);
      const context = content.slice(contextStart, contextEnd).replace(/\n/g, ' ').trim();

      links.push({ target, alias, position, context });
    }

    return links;
  }

  /**
   * Extrait les images ![alt](src)
   */
  extractImages(content: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    let match: RegExpExecArray | null;

    // Reset regex
    IMAGE_REGEX.lastIndex = 0;

    while ((match = IMAGE_REGEX.exec(content)) !== null) {
      const alt = match[1];
      const src = match[2];
      const position = match.index;

      // Déterminer si c'est un chemin local
      const isLocal = !src.startsWith('http://') &&
                      !src.startsWith('https://') &&
                      !src.startsWith('data:');

      images.push({ src, alt, position, isLocal });
    }

    return images;
  }

  /**
   * Extrait les tags inline #tag
   */
  extractInlineTags(content: string): InlineTag[] {
    const tags: InlineTag[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    // Reset regex
    INLINE_TAG_REGEX.lastIndex = 0;

    while ((match = INLINE_TAG_REGEX.exec(content)) !== null) {
      const name = match[1].toLowerCase();
      const position = match.index;

      // Éviter les doublons
      if (!seen.has(name)) {
        seen.add(name);
        tags.push({ name, position });
      }
    }

    return tags;
  }

  /**
   * Détermine le titre de la note
   */
  private determineTitle(frontmatter: Frontmatter, content: string, filename?: string): string {
    // 1. Titre du frontmatter
    if (frontmatter.title && typeof frontmatter.title === 'string') {
      return frontmatter.title;
    }

    // 2. Premier heading
    const headingMatch = content.match(HEADING_REGEX);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // 3. Nom de fichier
    if (filename) {
      return filename
        .replace(/\.md$/i, '')
        .replace(/^.*[\\/]/, '') // Supprimer le chemin
        .replace(/-/g, ' ')
        .replace(/_/g, ' ');
    }

    return 'Sans titre';
  }

  /**
   * Combine les tags du frontmatter et les tags inline
   */
  private combineTags(frontmatter: Frontmatter, inlineTags: InlineTag[]): string[] {
    const tags = new Set<string>();

    // Tags du frontmatter
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach(tag => {
        if (typeof tag === 'string') {
          tags.add(tag.toLowerCase());
        }
      });
    }

    // Tags inline
    inlineTags.forEach(tag => tags.add(tag.name));

    return Array.from(tags).sort();
  }

  /**
   * Génère un slug à partir d'un titre
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100); // Limiter la longueur
  }
}

// Instance singleton
export const markdownParser = new MarkdownParser();
