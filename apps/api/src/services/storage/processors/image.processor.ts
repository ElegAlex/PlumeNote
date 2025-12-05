// ===========================================
// Image Processor - Traitement d'images
// US-028: Compression, redimensionnement
// ===========================================

import sharp from 'sharp';

/**
 * Options de traitement d'image
 */
export interface ImageProcessingOptions {
  /** Largeur maximale (défaut: 2048) */
  maxWidth?: number;
  /** Hauteur maximale (défaut: 2048) */
  maxHeight?: number;
  /** Qualité JPEG/WebP (1-100, défaut: 85) */
  quality?: number;
  /** Convertir en format spécifique */
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  /** Générer des miniatures */
  generateThumbnail?: boolean;
  /** Taille de la miniature (défaut: 200) */
  thumbnailSize?: number;
}

/**
 * Résultat du traitement d'image
 */
export interface ImageProcessingResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasResized: boolean;
  thumbnail?: Buffer;
}

/**
 * Métadonnées d'image extraites
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  space?: string;
  channels?: number;
  hasAlpha?: boolean;
}

/**
 * Processeur d'images avec Sharp.
 * Gère le redimensionnement, la compression et l'optimisation.
 */
export class ImageProcessor {
  private readonly defaultOptions: Required<Omit<ImageProcessingOptions, 'format' | 'generateThumbnail'>> & {
    generateThumbnail: boolean;
  };

  constructor(defaultOptions?: Partial<ImageProcessingOptions>) {
    this.defaultOptions = {
      maxWidth: defaultOptions?.maxWidth ?? 2048,
      maxHeight: defaultOptions?.maxHeight ?? 2048,
      quality: defaultOptions?.quality ?? 85,
      thumbnailSize: defaultOptions?.thumbnailSize ?? 200,
      generateThumbnail: defaultOptions?.generateThumbnail ?? false,
    };
  }

  /**
   * Traite une image: redimensionnement et optimisation
   */
  async process(
    buffer: Buffer,
    options?: ImageProcessingOptions
  ): Promise<ImageProcessingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions');
    }

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Déterminer si un redimensionnement est nécessaire
    const needsResize =
      originalWidth > opts.maxWidth || originalHeight > opts.maxHeight;

    // Configurer le pipeline de traitement
    let pipeline = image;

    if (needsResize) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Appliquer le format de sortie
    const outputFormat = opts.format || this.getOptimalFormat(metadata.format);
    pipeline = this.applyFormat(pipeline, outputFormat, opts.quality);

    // Traiter l'image principale
    const processedBuffer = await pipeline.toBuffer();

    // Obtenir les nouvelles dimensions
    const processedMetadata = await sharp(processedBuffer).metadata();
    const width = processedMetadata.width || originalWidth;
    const height = processedMetadata.height || originalHeight;

    // Générer la miniature si demandée
    let thumbnail: Buffer | undefined;
    if (opts.generateThumbnail) {
      thumbnail = await this.generateThumbnail(buffer, opts.thumbnailSize);
    }

    return {
      buffer: processedBuffer,
      mimeType: this.formatToMimeType(outputFormat),
      width,
      height,
      originalWidth,
      originalHeight,
      wasResized: needsResize,
      thumbnail,
    };
  }

  /**
   * Génère une miniature carrée
   */
  async generateThumbnail(buffer: Buffer, size: number = 200): Promise<Buffer> {
    return sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Extrait les métadonnées d'une image sans la traiter
   */
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      space: metadata.space,
      channels: metadata.channels,
      hasAlpha: metadata.hasAlpha,
    };
  }

  /**
   * Vérifie si un buffer contient une image valide
   */
  async isValidImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height);
    } catch {
      return false;
    }
  }

  /**
   * Détermine le format optimal de sortie
   */
  private getOptimalFormat(inputFormat?: string): 'jpeg' | 'png' | 'webp' {
    // Conserver PNG pour les images avec transparence
    if (inputFormat === 'png' || inputFormat === 'gif') {
      return 'png';
    }
    // WebP pour les navigateurs modernes (meilleure compression)
    // Pour l'instant on reste sur JPEG pour compatibilité maximale
    return 'jpeg';
  }

  /**
   * Applique le format et la qualité au pipeline
   */
  private applyFormat(
    pipeline: sharp.Sharp,
    format: 'jpeg' | 'png' | 'webp' | 'avif',
    quality: number
  ): sharp.Sharp {
    switch (format) {
      case 'jpeg':
        return pipeline.jpeg({ quality, mozjpeg: true });
      case 'png':
        return pipeline.png({ compressionLevel: 9 });
      case 'webp':
        return pipeline.webp({ quality });
      case 'avif':
        return pipeline.avif({ quality });
      default:
        return pipeline.jpeg({ quality });
    }
  }

  /**
   * Convertit un format en type MIME
   */
  private formatToMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}
