// ===========================================
// Import Service
// EP-008: Orchestration de l'import Markdown/ZIP
// ===========================================

import { prisma } from '@plumenote/database';
import type { ImportStatus, ConflictStrategy } from '@prisma/client';
import { tempStorageService } from '../../services/storage/temp-storage.service.js';
import { zipExtractor, type ExtractedFile, type ZipAnalysis } from './extractors/index.js';
import { markdownParser, type ParsedMarkdown } from './parsers/index.js';
import { wikilinkResolver } from './resolvers/index.js';
import { extractLinksFromContent } from '../../services/links.js';
import { createAuditLog } from '../../services/audit.js';

/**
 * Résultat d'import pour un fichier
 */
export interface ImportFileResult {
  file: string;
  status: 'success' | 'error' | 'skipped' | 'renamed';
  noteId?: string;
  noteTitle?: string;
  error?: string;
  renamedTo?: string;
}

/**
 * Options pour démarrer un import
 */
export interface StartImportOptions {
  targetFolderId?: string;
  conflictStrategy: ConflictStrategy;
}

/**
 * Prévisualisation d'un import
 */
export interface ImportPreview {
  id: string;
  fileName: string;
  totalFiles: number;
  markdownFiles: string[];
  directories: string[];
  assetFiles: string[];
}

/**
 * Résumé d'un job d'import
 */
export interface ImportJobSummary {
  id: string;
  fileName: string;
  status: ImportStatus;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Détail complet d'un job d'import
 */
export interface ImportJobDetail extends ImportJobSummary {
  results: ImportFileResult[] | null;
  errors: string[] | null;
  targetFolderId: string | null;
  preview: ZipAnalysis | null;
}

/**
 * Service d'import de notes Markdown
 */
export class ImportService {
  private readonly maxFileSizeMb: number;

  constructor(maxFileSizeMb: number = 100) {
    this.maxFileSizeMb = maxFileSizeMb;
  }

  /**
   * Crée un nouveau job d'import après upload du ZIP
   */
  async createImportJob(
    userId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<ImportPreview> {
    // Valider la taille
    const maxSize = this.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new Error(`Le fichier dépasse la limite de ${this.maxFileSizeMb}MB`);
    }

    // Sauvegarder le fichier temporaire
    const tempPath = await tempStorageService.saveTempFile(buffer, fileName);

    // Analyser le contenu
    const analysis = await zipExtractor.analyze(buffer);

    // Créer le job en base
    const job = await prisma.importJob.create({
      data: {
        userId,
        fileName,
        tempFilePath: tempPath,
        totalFiles: analysis.markdownFiles.length,
        preview: analysis as any,
      },
    });

    return {
      id: job.id,
      fileName: job.fileName,
      totalFiles: analysis.markdownFiles.length,
      markdownFiles: analysis.markdownFiles.slice(0, 50), // Limiter l'aperçu
      directories: analysis.directories,
      assetFiles: analysis.assetFiles.slice(0, 20),
    };
  }

  /**
   * Récupère les jobs d'import d'un utilisateur
   */
  async getJobsByUser(userId: string): Promise<ImportJobSummary[]> {
    const jobs = await prisma.importJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fileName: true,
        status: true,
        totalFiles: true,
        processedFiles: true,
        successCount: true,
        errorCount: true,
        warningCount: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return jobs;
  }

  /**
   * Récupère le détail d'un job d'import
   */
  async getJobById(userId: string, jobId: string): Promise<ImportJobDetail | null> {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) return null;

    return {
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      totalFiles: job.totalFiles,
      processedFiles: job.processedFiles,
      successCount: job.successCount,
      errorCount: job.errorCount,
      warningCount: job.warningCount,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      results: job.results as ImportFileResult[] | null,
      errors: job.errors as string[] | null,
      targetFolderId: job.targetFolderId,
      preview: job.preview as ZipAnalysis | null,
    };
  }

  /**
   * Démarre le traitement d'un import
   */
  async startImport(
    userId: string,
    jobId: string,
    options: StartImportOptions
  ): Promise<ImportJobDetail> {
    const job = await this.getJobById(userId, jobId);

    if (!job) {
      throw new Error('Import non trouvé');
    }

    if (job.status !== 'PENDING') {
      throw new Error('Cet import a déjà été traité');
    }

    // Vérifier le dossier cible si spécifié
    if (options.targetFolderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: options.targetFolderId, isPersonal: false },
      });
      if (!folder) {
        throw new Error('Dossier cible non trouvé');
      }
    }

    // Mettre à jour le job
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'EXTRACTING',
        startedAt: new Date(),
        targetFolderId: options.targetFolderId || null,
        conflictStrategy: options.conflictStrategy,
      },
    });

    // Lancer le traitement en arrière-plan
    this.processImport(jobId, userId, options).catch(error => {
      console.error(`Import job ${jobId} failed:`, error);
    });

    return (await this.getJobById(userId, jobId))!;
  }

  /**
   * Traite l'import en arrière-plan
   */
  private async processImport(
    jobId: string,
    userId: string,
    options: StartImportOptions
  ): Promise<void> {
    const results: ImportFileResult[] = [];
    const errors: string[] = [];
    const createdNoteIds: string[] = [];

    try {
      const job = await prisma.importJob.findUnique({ where: { id: jobId } });
      if (!job || !job.tempFilePath) {
        throw new Error('Job ou fichier temporaire non trouvé');
      }

      // 1. Extraction
      await this.updateJobStatus(jobId, 'EXTRACTING');
      const buffer = await tempStorageService.readTempFile(job.tempFilePath);
      const extractedFiles = await zipExtractor.extractMarkdownFiles(buffer);

      // 2. Création de l'arborescence des dossiers
      await this.updateJobStatus(jobId, 'PARSING');
      const folderMap = await this.createFolderStructure(
        extractedFiles,
        userId,
        options.targetFolderId
      );

      // 3. Traitement des fichiers Markdown
      await this.updateJobStatus(jobId, 'CREATING');

      for (const file of extractedFiles) {
        try {
          const result = await this.processMarkdownFile(
            file,
            userId,
            folderMap,
            options.conflictStrategy
          );

          results.push(result);

          if (result.status === 'success' && result.noteId) {
            createdNoteIds.push(result.noteId);
          }

          // Mettre à jour les compteurs
          await prisma.importJob.update({
            where: { id: jobId },
            data: {
              processedFiles: { increment: 1 },
              successCount: result.status === 'success' || result.status === 'renamed'
                ? { increment: 1 }
                : undefined,
              errorCount: result.status === 'error' ? { increment: 1 } : undefined,
              warningCount: result.status === 'skipped' ? { increment: 1 } : undefined,
            },
          });
        } catch (error) {
          const errorMessage = (error as Error).message;
          results.push({
            file: file.path,
            status: 'error',
            error: errorMessage,
          });
          errors.push(`${file.path}: ${errorMessage}`);
        }
      }

      // 4. Résolution des wikilinks
      await this.updateJobStatus(jobId, 'RESOLVING');
      const resolutionStats = await wikilinkResolver.resolveForImportedNotes(createdNoteIds);

      // 5. Nettoyage et finalisation
      await tempStorageService.deleteTempFile(job.tempFilePath);

      // Log d'audit
      await createAuditLog(userId, 'IMPORT_COMPLETED', 'IMPORT', jobId, {
        fileName: job.fileName,
        totalFiles: job.totalFiles,
        successCount: results.filter(r => r.status === 'success' || r.status === 'renamed').length,
        errorCount: results.filter(r => r.status === 'error').length,
        skippedCount: results.filter(r => r.status === 'skipped').length,
        linksResolved: resolutionStats.resolved,
        linksUnresolved: resolutionStats.unresolved,
      });

      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          results: results as any,
          errors: errors.length > 0 ? errors : null,
        },
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      errors.push(errorMessage);

      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          results: results as any,
          errors: errors,
        },
      });
    }
  }

  /**
   * Crée l'arborescence des dossiers
   */
  private async createFolderStructure(
    files: ExtractedFile[],
    userId: string,
    targetFolderId?: string
  ): Promise<Map<string, string>> {
    const folderMap = new Map<string, string>(); // path -> folderId
    const directories = new Set<string>();

    // Extraire tous les répertoires uniques
    for (const file of files) {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join('/'));
      }
    }

    // Créer les dossiers dans l'ordre hiérarchique
    const sortedDirs = Array.from(directories).sort();

    for (const dir of sortedDirs) {
      const parts = dir.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');

      // Déterminer le parent
      let parentId: string | null = null;
      if (parentPath) {
        parentId = folderMap.get(parentPath) || null;
      } else if (targetFolderId) {
        parentId = targetFolderId;
      }

      // Vérifier si le dossier existe déjà
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name,
          parentId,
          isPersonal: false,
        },
        select: { id: true },
      });

      if (existingFolder) {
        folderMap.set(dir, existingFolder.id);
      } else {
        // Créer le dossier
        const slug = this.generateSlug(name);
        const folder = await prisma.folder.create({
          data: {
            name,
            slug,
            path: parentPath ? `/${parentPath}` : '',
            parentId,
            createdBy: userId,
          },
        });
        folderMap.set(dir, folder.id);
      }
    }

    return folderMap;
  }

  /**
   * Traite un fichier Markdown individuel
   */
  private async processMarkdownFile(
    file: ExtractedFile,
    userId: string,
    folderMap: Map<string, string>,
    conflictStrategy: ConflictStrategy
  ): Promise<ImportFileResult> {
    const content = file.content.toString('utf-8');
    const parsed = markdownParser.parse(content, file.path);

    // Déterminer le dossier parent
    const parts = file.path.split('/');
    const folderPath = parts.slice(0, -1).join('/');
    const folderId = folderPath ? folderMap.get(folderPath) : null;

    // Générer le slug
    const baseSlug = markdownParser.generateSlug(parsed.title);

    // Vérifier les conflits
    const existing = await prisma.note.findFirst({
      where: {
        slug: baseSlug,
        folderId: folderId || null,
        isDeleted: false,
        isPersonal: false,
      },
    });

    if (existing) {
      switch (conflictStrategy) {
        case 'SKIP':
          return {
            file: file.path,
            status: 'skipped',
            noteTitle: parsed.title,
          };

        case 'OVERWRITE':
          await prisma.note.delete({ where: { id: existing.id } });
          break;

        case 'RENAME':
        default:
          // Le slug sera modifié pour éviter le conflit
          break;
      }
    }

    // Déterminer le slug final
    let finalSlug = baseSlug;
    let finalTitle = parsed.title;
    if (existing && conflictStrategy === 'RENAME') {
      const suffix = ` (import ${Date.now()})`;
      finalTitle = parsed.title + suffix;
      finalSlug = markdownParser.generateSlug(finalTitle);
    }

    // Créer ou récupérer les tags
    const tagIds: string[] = [];
    for (const tagName of parsed.allTags) {
      let tag = await prisma.tag.findUnique({
        where: { name: tagName },
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: tagName },
        });
      }
      tagIds.push(tag.id);
    }

    // Créer la note
    const note = await prisma.note.create({
      data: {
        title: finalTitle,
        slug: finalSlug,
        content: parsed.content,
        folderId: folderId || null,
        authorId: userId,
        frontmatter: parsed.frontmatter as any,
        tags: {
          create: tagIds.map(tagId => ({ tagId })),
        },
      },
    });

    // Créer les liens
    const links = extractLinksFromContent(parsed.content);
    for (const link of links) {
      await prisma.link.create({
        data: {
          sourceNoteId: note.id,
          targetSlug: link.target,
          alias: link.alias,
          context: link.context,
          position: link.position,
          isBroken: true, // Sera résolu plus tard
        },
      });
    }

    return {
      file: file.path,
      status: existing && conflictStrategy === 'RENAME' ? 'renamed' : 'success',
      noteId: note.id,
      noteTitle: finalTitle,
      renamedTo: existing && conflictStrategy === 'RENAME' ? finalTitle : undefined,
    };
  }

  /**
   * Met à jour le statut d'un job
   */
  private async updateJobStatus(jobId: string, status: ImportStatus): Promise<void> {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status },
    });
  }

  /**
   * Supprime un job d'import
   */
  async deleteJob(userId: string, jobId: string): Promise<void> {
    const job = await this.getJobById(userId, jobId);

    if (!job) {
      throw new Error('Import non trouvé');
    }

    // Nettoyer le fichier temporaire si présent
    const fullJob = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (fullJob?.tempFilePath) {
      await tempStorageService.deleteTempFile(fullJob.tempFilePath);
    }

    await prisma.importJob.delete({ where: { id: jobId } });
  }

  /**
   * Génère un slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }
}

// Instance singleton
export const importService = new ImportService();
