// ===========================================
// Storage Provider - Interface abstraite
// US-028: Service de stockage abstrait
// ===========================================

/**
 * Métadonnées optionnelles pour le stockage
 */
export interface StorageMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Résultat d'un upload
 */
export interface UploadResult {
  path: string;
  size: number;
  contentType: string;
}

/**
 * Interface abstraite pour les providers de stockage.
 * Permet d'abstraire le stockage local, S3, Azure Blob, etc.
 */
export interface IStorageProvider {
  /**
   * Upload un buffer vers le stockage
   * @param path Chemin relatif dans le stockage
   * @param buffer Données à stocker
   * @param metadata Métadonnées optionnelles
   * @returns Chemin final du fichier stocké
   */
  upload(path: string, buffer: Buffer, metadata?: StorageMetadata): Promise<UploadResult>;

  /**
   * Télécharge un fichier depuis le stockage
   * @param path Chemin relatif du fichier
   * @returns Buffer du fichier
   */
  download(path: string): Promise<Buffer>;

  /**
   * Supprime un fichier du stockage
   * @param path Chemin relatif du fichier
   */
  delete(path: string): Promise<void>;

  /**
   * Vérifie si un fichier existe
   * @param path Chemin relatif du fichier
   */
  exists(path: string): Promise<boolean>;

  /**
   * Obtient l'URL publique d'un fichier
   * @param path Chemin relatif du fichier
   * @returns URL accessible
   */
  getUrl(path: string): string;

  /**
   * Obtient les métadonnées d'un fichier
   * @param path Chemin relatif du fichier
   */
  getMetadata(path: string): Promise<{ size: number; lastModified: Date } | null>;
}
