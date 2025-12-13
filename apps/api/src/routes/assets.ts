// ===========================================
// Routes Assets - Gestion des fichiers utilisateur
// Découplé des notes pour réutilisation
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@plumenote/database';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// Types de fichiers autorisés pour les images
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Taille maximale de miniature
const THUMBNAIL_SIZE = 200;

// Répertoire des assets
function getAssetsDir(): string {
  return path.join(config.uploadDir, 'assets');
}

// Répertoire des miniatures
function getThumbnailsDir(): string {
  return path.join(config.uploadDir, 'assets', 'thumbnails');
}

// Assurer que les répertoires existent
async function ensureDirectories(): Promise<void> {
  await fs.mkdir(getAssetsDir(), { recursive: true });
  await fs.mkdir(getThumbnailsDir(), { recursive: true });
}

// Générer un nom de fichier unique
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = randomUUID();
  return `${uuid}${ext}`;
}

// Générer une miniature pour les images
async function generateThumbnail(
  sourcePath: string,
  mimeType: string
): Promise<{ thumbnailPath: string; width: number; height: number } | null> {
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType) || mimeType === 'image/svg+xml') {
    return null;
  }

  try {
    const thumbnailFilename = `thumb_${path.basename(sourcePath)}`;
    const thumbnailPath = path.join(getThumbnailsDir(), thumbnailFilename);

    const metadata = await sharp(sourcePath).metadata();

    await sharp(sourcePath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFile(thumbnailPath);

    return {
      thumbnailPath: `assets/thumbnails/${thumbnailFilename}`,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    logger.warn({ error }, '[Assets] Failed to generate thumbnail');
    return null;
  }
}

export const assetsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/assets/upload
   * Upload d'un fichier asset
   */
  app.post('/upload', {
    schema: {
      tags: ['Assets'],
      summary: 'Upload a file asset',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.user.userId;

    await ensureDirectories();

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({
        error: 'NO_FILE',
        message: 'Aucun fichier fourni',
      });
    }

    const { filename: originalName, mimetype: mimeType } = data;

    // Vérifier le type de fichier (images uniquement pour l'instant)
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return reply.status(400).send({
        error: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non supporté. Images uniquement.',
        allowedTypes: ALLOWED_IMAGE_TYPES,
      });
    }

    // Générer le nom de fichier et le chemin
    const filename = generateFilename(originalName);
    const storagePath = `assets/${filename}`;
    const fullPath = path.join(getAssetsDir(), filename);

    // Sauvegarder le fichier
    const buffer = await data.toBuffer();
    await fs.writeFile(fullPath, buffer);

    // Calculer la taille
    const stats = await fs.stat(fullPath);
    const sizeBytes = stats.size;

    // Générer la miniature si c'est une image
    const thumbnailData = await generateThumbnail(fullPath, mimeType);

    // Créer l'entrée en base de données
    const asset = await prisma.asset.create({
      data: {
        userId,
        filename,
        originalName,
        mimeType,
        sizeBytes,
        storagePath,
        thumbnailPath: thumbnailData?.thumbnailPath,
        width: thumbnailData?.width,
        height: thumbnailData?.height,
      },
    });

    logger.info({ assetId: asset.id, originalName, mimeType }, '[Assets] File uploaded');

    return reply.status(201).send({
      id: asset.id,
      filename: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.sizeBytes,
      url: `/uploads/${asset.storagePath}`,
      thumbnailUrl: asset.thumbnailPath ? `/uploads/${asset.thumbnailPath}` : null,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
    });
  });

  /**
   * GET /api/v1/assets
   * Liste les assets de l'utilisateur
   */
  app.get('/', {
    schema: {
      tags: ['Assets'],
      summary: 'List user assets',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.user.userId;
    const { limit = '50', offset = '0', type } = request.query as {
      limit?: string;
      offset?: string;
      type?: string;
    };

    const maxLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const skip = parseInt(offset, 10) || 0;

    // Filtrer par type MIME si spécifié
    const where: { userId: string; mimeType?: { startsWith: string } } = { userId };
    if (type === 'image') {
      where.mimeType = { startsWith: 'image/' };
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: maxLimit,
        skip,
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      assets: assets.map((asset) => ({
        id: asset.id,
        filename: asset.originalName,
        mimeType: asset.mimeType,
        size: asset.sizeBytes,
        url: `/uploads/${asset.storagePath}`,
        thumbnailUrl: asset.thumbnailPath ? `/uploads/${asset.thumbnailPath}` : null,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt.toISOString(),
      })),
      total,
      limit: maxLimit,
      offset: skip,
    };
  });

  /**
   * GET /api/v1/assets/:id
   * Récupère un asset par son ID
   */
  app.get('/:id', {
    schema: {
      tags: ['Assets'],
      summary: 'Get asset by ID',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const asset = await prisma.asset.findFirst({
      where: { id, userId },
    });

    if (!asset) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Asset non trouvé',
      });
    }

    return {
      id: asset.id,
      filename: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.sizeBytes,
      url: `/uploads/${asset.storagePath}`,
      thumbnailUrl: asset.thumbnailPath ? `/uploads/${asset.thumbnailPath}` : null,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
    };
  });

  /**
   * DELETE /api/v1/assets/:id
   * Supprime un asset
   */
  app.delete('/:id', {
    schema: {
      tags: ['Assets'],
      summary: 'Delete an asset',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const asset = await prisma.asset.findFirst({
      where: { id, userId },
    });

    if (!asset) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Asset non trouvé',
      });
    }

    // Supprimer les fichiers du disque
    try {
      const fullPath = path.join(config.uploadDir, asset.storagePath);
      await fs.unlink(fullPath);

      if (asset.thumbnailPath) {
        const thumbnailFullPath = path.join(config.uploadDir, asset.thumbnailPath);
        await fs.unlink(thumbnailFullPath).catch(() => {
          // Ignorer si la miniature n'existe pas
        });
      }
    } catch (error) {
      logger.warn({ error, assetId: id }, '[Assets] Failed to delete file from disk');
    }

    // Supprimer de la base de données
    await prisma.asset.delete({
      where: { id },
    });

    logger.info({ assetId: id }, '[Assets] Asset deleted');

    return reply.status(204).send();
  });
};
