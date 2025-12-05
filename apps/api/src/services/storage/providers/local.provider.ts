// ===========================================
// Local Storage Provider - Filesystem
// US-028: Implémentation stockage local
// ===========================================

import { mkdir, writeFile, readFile, unlink, access, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  IStorageProvider,
  StorageMetadata,
  UploadResult,
} from './storage.provider.js';

/**
 * Provider de stockage sur le système de fichiers local.
 * Utilisé pour le développement et les déploiements simples.
 */
export class LocalStorageProvider implements IStorageProvider {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(basePath: string, baseUrl: string = '/api/v1/attachments') {
    this.basePath = resolve(basePath);
    this.baseUrl = baseUrl;
  }

  async upload(
    path: string,
    buffer: Buffer,
    metadata?: StorageMetadata
  ): Promise<UploadResult> {
    const fullPath = this.getFullPath(path);
    const dir = dirname(fullPath);

    // Créer le répertoire parent si nécessaire
    await mkdir(dir, { recursive: true });

    // Écrire le fichier
    await writeFile(fullPath, buffer);

    return {
      path,
      size: buffer.length,
      contentType: metadata?.contentType || 'application/octet-stream',
    };
  }

  async download(path: string): Promise<Buffer> {
    const fullPath = this.getFullPath(path);
    return readFile(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);
    try {
      await unlink(fullPath);
    } catch (error) {
      // Ignorer si le fichier n'existe pas
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    try {
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(path: string): string {
    // Extraire l'ID du chemin (format: attachments/{noteId}/{id}.{ext})
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const id = filename.split('.')[0];
    return `${this.baseUrl}/${id}`;
  }

  async getMetadata(path: string): Promise<{ size: number; lastModified: Date } | null> {
    const fullPath = this.getFullPath(path);
    try {
      const stats = await stat(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Convertit un chemin relatif en chemin absolu
   */
  private getFullPath(path: string): string {
    // Sécurité: empêcher la traversée de répertoire
    const normalizedPath = path.replace(/\.\./g, '');
    return join(this.basePath, normalizedPath);
  }
}
