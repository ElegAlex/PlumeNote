// ===========================================
// ZIP Extractor
// EP-008: Extraction de fichiers depuis un archive ZIP
// ===========================================
// Security: Includes Zip Slip protection (path traversal prevention)
// ===========================================

import unzipper from 'unzipper';
import { Readable } from 'node:stream';
import path from 'node:path';

/**
 * Fichier extrait d'une archive ZIP
 */
export interface ExtractedFile {
  /** Chemin relatif dans l'archive */
  path: string;
  /** Contenu du fichier */
  content: Buffer;
  /** Indique si c'est un répertoire */
  isDirectory: boolean;
  /** Taille en octets */
  size: number;
}

/**
 * Résultat de l'analyse d'un ZIP
 */
export interface ZipAnalysis {
  /** Liste des fichiers Markdown */
  markdownFiles: string[];
  /** Liste des dossiers */
  directories: string[];
  /** Liste des fichiers assets (images, etc.) */
  assetFiles: string[];
  /** Nombre total de fichiers */
  totalFiles: number;
}

/**
 * Options d'extraction
 */
export interface ExtractOptions {
  /** Extensions de fichiers à inclure (par défaut: tous) */
  includeExtensions?: string[];
  /** Préfixes de chemins à ignorer */
  ignorePrefixes?: string[];
  /** Taille max par fichier en octets */
  maxFileSize?: number;
}

const DEFAULT_IGNORE_PREFIXES = [
  '.', // Fichiers/dossiers cachés
  '__MACOSX', // Dossiers macOS
  'node_modules',
  '.git',
  '.obsidian', // Dossier de config Obsidian (optionnel)
];

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'];
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'];

/**
 * Extracteur de fichiers ZIP
 */
export class ZipExtractor {
  private readonly maxFileSize: number;
  private readonly ignorePrefixes: string[];

  constructor(maxFileSizeMb: number = 10) {
    this.maxFileSize = maxFileSizeMb * 1024 * 1024;
    this.ignorePrefixes = DEFAULT_IGNORE_PREFIXES;
  }

  /**
   * Analyse le contenu d'un ZIP sans l'extraire complètement
   */
  async analyze(buffer: Buffer): Promise<ZipAnalysis> {
    const directory = await unzipper.Open.buffer(buffer);

    const markdownFiles: string[] = [];
    const directories = new Set<string>();
    const assetFiles: string[] = [];

    for (const file of directory.files) {
      // Security: Validate path to prevent Zip Slip attacks
      if (!this.isPathSafe(file.path)) {
        continue;
      }

      if (this.shouldIgnore(file.path)) {
        continue;
      }

      if (file.type === 'Directory') {
        directories.add(file.path);
        continue;
      }

      const lowerPath = file.path.toLowerCase();

      if (MARKDOWN_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
        markdownFiles.push(file.path);

        // Ajouter les répertoires parents
        const parts = file.path.split('/');
        for (let i = 1; i < parts.length; i++) {
          directories.add(parts.slice(0, i).join('/') + '/');
        }
      } else if (ASSET_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
        assetFiles.push(file.path);
      }
    }

    return {
      markdownFiles: markdownFiles.sort(),
      directories: Array.from(directories).sort(),
      assetFiles: assetFiles.sort(),
      totalFiles: markdownFiles.length + assetFiles.length,
    };
  }

  /**
   * Liste les fichiers Markdown dans le ZIP
   */
  async listMarkdownFiles(buffer: Buffer): Promise<string[]> {
    const analysis = await this.analyze(buffer);
    return analysis.markdownFiles;
  }

  /**
   * Extrait tous les fichiers du ZIP
   */
  async extract(buffer: Buffer, options?: ExtractOptions): Promise<ExtractedFile[]> {
    const directory = await unzipper.Open.buffer(buffer);
    const files: ExtractedFile[] = [];

    for (const file of directory.files) {
      // Security: Validate path to prevent Zip Slip attacks
      if (!this.isPathSafe(file.path)) {
        continue;
      }

      if (this.shouldIgnore(file.path)) {
        continue;
      }

      if (file.type === 'Directory') {
        continue;
      }

      // Filtrer par extension si spécifié
      if (options?.includeExtensions) {
        const ext = this.getExtension(file.path);
        if (!options.includeExtensions.includes(ext)) {
          continue;
        }
      }

      // Ignorer les fichiers trop volumineux
      const maxSize = options?.maxFileSize || this.maxFileSize;
      if (file.uncompressedSize > maxSize) {
        continue;
      }

      try {
        const content = await file.buffer();

        files.push({
          path: this.normalizePath(file.path),
          content,
          isDirectory: false,
          size: content.length,
        });
      } catch {
        // Ignorer les fichiers non lisibles
      }
    }

    return files;
  }

  /**
   * Extrait uniquement les fichiers Markdown
   */
  async extractMarkdownFiles(buffer: Buffer): Promise<ExtractedFile[]> {
    return this.extract(buffer, {
      includeExtensions: MARKDOWN_EXTENSIONS,
    });
  }

  /**
   * Extrait uniquement les fichiers assets
   */
  async extractAssets(buffer: Buffer): Promise<ExtractedFile[]> {
    return this.extract(buffer, {
      includeExtensions: ASSET_EXTENSIONS,
    });
  }

  /**
   * Vérifie si un chemin doit être ignoré
   */
  private shouldIgnore(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    return parts.some(part =>
      this.ignorePrefixes.some(prefix =>
        part.startsWith(prefix)
      )
    );
  }

  /**
   * Security: Validates that a path doesn't contain path traversal sequences.
   * Prevents Zip Slip attacks (CVE-2018-1002203).
   *
   * @returns true if path is safe, false if it contains traversal
   */
  private isPathSafe(filePath: string): boolean {
    const normalized = path.normalize(filePath).replace(/\\/g, '/');

    // Reject absolute paths
    if (path.isAbsolute(normalized)) {
      return false;
    }

    // Reject paths that escape the extraction directory
    if (normalized.startsWith('../') || normalized.includes('/../')) {
      return false;
    }

    // Reject paths with null bytes (can confuse C-based parsers)
    if (normalized.includes('\0')) {
      return false;
    }

    // Reject excessively deep paths
    const depth = normalized.split('/').length;
    if (depth > 50) {
      return false;
    }

    return true;
  }

  /**
   * Normalise un chemin de fichier
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
  }

  /**
   * Extrait l'extension d'un fichier
   */
  private getExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1) return '';
    return path.slice(lastDot).toLowerCase();
  }
}

// Instance singleton
export const zipExtractor = new ZipExtractor();
