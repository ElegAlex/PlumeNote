// ===========================================
// Temporary Storage Service - Import files
// EP-008: Gestion des fichiers temporaires d'import
// ===========================================

import { mkdir, writeFile, readFile, unlink, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from '../../config/index.js';

/**
 * Service de stockage temporaire pour les fichiers d'import.
 * Les fichiers sont stockés dans un répertoire dédié et nettoyés après traitement.
 */
export class TempStorageService {
  private readonly tempDir: string;
  private readonly maxAge: number; // Durée de vie max en ms

  constructor(basePath?: string, maxAgeHours: number = 24) {
    this.tempDir = resolve(basePath || config.uploadDir, 'temp');
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
  }

  /**
   * Initialise le répertoire temporaire
   */
  async initialize(): Promise<void> {
    await mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Sauvegarde un fichier temporaire et retourne son chemin
   */
  async saveTempFile(buffer: Buffer, originalFilename: string): Promise<string> {
    await this.initialize();

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempFilename = `${timestamp}_${random}_${safeFilename}`;
    const tempPath = join(this.tempDir, tempFilename);

    await writeFile(tempPath, buffer);

    return tempPath;
  }

  /**
   * Lit un fichier temporaire
   */
  async readTempFile(tempPath: string): Promise<Buffer> {
    // Vérifier que le chemin est bien dans le répertoire temp
    const normalizedPath = resolve(tempPath);
    if (!normalizedPath.startsWith(this.tempDir)) {
      throw new Error('Invalid temp file path');
    }

    return readFile(normalizedPath);
  }

  /**
   * Supprime un fichier temporaire
   */
  async deleteTempFile(tempPath: string): Promise<void> {
    // Vérifier que le chemin est bien dans le répertoire temp
    const normalizedPath = resolve(tempPath);
    if (!normalizedPath.startsWith(this.tempDir)) {
      throw new Error('Invalid temp file path');
    }

    try {
      await unlink(normalizedPath);
    } catch (error) {
      // Ignorer si le fichier n'existe pas
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Vérifie si un fichier temporaire existe
   */
  async exists(tempPath: string): Promise<boolean> {
    const normalizedPath = resolve(tempPath);
    if (!normalizedPath.startsWith(this.tempDir)) {
      return false;
    }

    try {
      await readFile(normalizedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Nettoie les fichiers temporaires expirés
   */
  async cleanup(): Promise<number> {
    await this.initialize();

    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = await readdir(this.tempDir);

      for (const file of files) {
        const filePath = join(this.tempDir, file);

        // Extraire le timestamp du nom de fichier
        const match = file.match(/^(\d+)_/);
        if (match) {
          const fileTimestamp = parseInt(match[1], 10);
          if (now - fileTimestamp > this.maxAge) {
            try {
              await unlink(filePath);
              deletedCount++;
            } catch {
              // Ignorer les erreurs de suppression
            }
          }
        }
      }
    } catch (error) {
      // Ignorer si le répertoire n'existe pas
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    return deletedCount;
  }

  /**
   * Supprime tous les fichiers temporaires
   */
  async clearAll(): Promise<void> {
    try {
      await rm(this.tempDir, { recursive: true, force: true });
      await this.initialize();
    } catch {
      // Ignorer les erreurs
    }
  }

  /**
   * Retourne le chemin du répertoire temporaire
   */
  getTempDir(): string {
    return this.tempDir;
  }
}

// Instance singleton pour l'application
export const tempStorageService = new TempStorageService();
