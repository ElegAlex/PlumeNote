// ===========================================
// File Validator - Validation des fichiers
// US-028: Validation MIME, taille, extension
// ===========================================

import { config } from '../../../config/index.js';

/**
 * Types MIME autorisés par catégorie
 */
export const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
  ],
  archive: [
    'application/zip',
    'application/x-zip-compressed',
  ],
} as const;

/**
 * Tous les types MIME autorisés
 */
export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.document,
  ...ALLOWED_MIME_TYPES.archive,
];

/**
 * Extensions de fichier par type MIME
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

/**
 * Erreurs de validation spécifiques
 */
export class FileValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Options de validation
 */
export interface FileValidationOptions {
  filename: string;
  mimeType: string;
  size: number;
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

/**
 * Résultat de validation
 */
export interface FileValidationResult {
  isValid: boolean;
  sanitizedFilename: string;
  extension: string;
  category: 'image' | 'document' | 'archive' | 'unknown';
}

/**
 * Validateur de fichiers uploadés
 */
export class FileValidator {
  private readonly maxSizeBytes: number;
  private readonly allowedMimeTypes: string[];

  constructor(options?: { maxSizeMb?: number; allowedMimeTypes?: string[] }) {
    this.maxSizeBytes = (options?.maxSizeMb || config.maxFileSizeMb) * 1024 * 1024;
    this.allowedMimeTypes = options?.allowedMimeTypes || ALL_ALLOWED_MIME_TYPES;
  }

  /**
   * Valide un fichier uploadé
   * @throws FileValidationError si le fichier est invalide
   */
  validate(options: FileValidationOptions): FileValidationResult {
    const { filename, mimeType, size } = options;
    const maxSize = options.maxSizeBytes || this.maxSizeBytes;
    const allowedTypes = options.allowedMimeTypes || this.allowedMimeTypes;

    // Validation de la taille
    if (size > maxSize) {
      throw new FileValidationError(
        `File size ${this.formatBytes(size)} exceeds maximum ${this.formatBytes(maxSize)}`,
        'FILE_TOO_LARGE',
        { size, maxSize }
      );
    }

    if (size === 0) {
      throw new FileValidationError(
        'File is empty',
        'FILE_EMPTY'
      );
    }

    // Validation du type MIME
    if (!allowedTypes.includes(mimeType)) {
      throw new FileValidationError(
        `File type "${mimeType}" is not allowed`,
        'INVALID_MIME_TYPE',
        { mimeType, allowedTypes }
      );
    }

    // Obtenir l'extension
    const extension = MIME_TO_EXTENSION[mimeType] || this.extractExtension(filename);
    if (!extension) {
      throw new FileValidationError(
        'Could not determine file extension',
        'INVALID_EXTENSION'
      );
    }

    // Sanitiser le nom de fichier
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Déterminer la catégorie
    const category = this.getCategory(mimeType);

    return {
      isValid: true,
      sanitizedFilename,
      extension,
      category,
    };
  }

  /**
   * Vérifie si un type MIME correspond à une image
   */
  isImage(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.image.includes(mimeType as typeof ALLOWED_MIME_TYPES.image[number]);
  }

  /**
   * Sanitise un nom de fichier pour le stockage
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Remplacer caractères spéciaux
      .replace(/__+/g, '_') // Éviter underscores multiples
      .replace(/^_|_$/g, '') // Supprimer underscores début/fin
      .slice(0, 200); // Limiter la longueur
  }

  /**
   * Extrait l'extension d'un nom de fichier
   */
  private extractExtension(filename: string): string | null {
    const parts = filename.split('.');
    if (parts.length < 2) return null;
    return parts.pop()?.toLowerCase() || null;
  }

  /**
   * Détermine la catégorie d'un fichier
   */
  private getCategory(mimeType: string): 'image' | 'document' | 'archive' | 'unknown' {
    if (ALLOWED_MIME_TYPES.image.includes(mimeType as typeof ALLOWED_MIME_TYPES.image[number])) {
      return 'image';
    }
    if (ALLOWED_MIME_TYPES.document.includes(mimeType as typeof ALLOWED_MIME_TYPES.document[number])) {
      return 'document';
    }
    if (ALLOWED_MIME_TYPES.archive.includes(mimeType as typeof ALLOWED_MIME_TYPES.archive[number])) {
      return 'archive';
    }
    return 'unknown';
  }

  /**
   * Formate une taille en bytes de manière lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
