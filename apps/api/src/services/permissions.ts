// ===========================================
// Service Permissions (EP-008)
// US-070: Permissions dossier
// US-071: Permissions note
// US-072: Visualisation accès
// US-052: Cache Redis pour les permissions
// ===========================================

import { prisma } from '@plumenote/database';
import type { PermissionLevel, ResourceType, EffectivePermission } from '@plumenote/types';
import {
  getCachedPermission,
  setCachedPermission,
  getCachedEffectivePermissions,
  setCachedEffectivePermissions,
  invalidateUserPermissionCache,
  invalidateResourcePermissionCache,
} from './cache';
import { logger } from '../lib/logger';

/**
 * Vérifie si un utilisateur a le niveau de permission requis sur une ressource
 * Utilise le cache Redis pour optimiser les performances (US-052)
 */
export async function checkPermission(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN'
): Promise<boolean> {
  // Clé de cache combinant user + resource + level
  const cacheKey = `${resourceType}:${resourceId}:${requiredLevel}`;

  // Vérifier le cache d'abord
  const cached = await getCachedPermission(userId, cacheKey, '');
  if (cached !== null) {
    logger.debug({ userId, resourceType, resourceId, cached }, '[Permissions] Cache hit');
    return cached;
  }

  // Calculer la permission si pas en cache
  const result = await computePermission(userId, resourceType, resourceId, requiredLevel);

  // Stocker en cache
  await setCachedPermission(userId, cacheKey, '', result);
  logger.debug({ userId, resourceType, resourceId, result }, '[Permissions] Cache miss, computed');

  return result;
}

/**
 * Calcule la permission sans utiliser le cache
 * (Logique originale extraite pour réutilisation)
 */
async function computePermission(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN'
): Promise<boolean> {
  // Récupérer l'utilisateur avec son rôle
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || !user.isActive) return false;

  // Les admins ont tous les droits
  if (user.role.name === 'admin') return true;

  // Vérifier les permissions directes sur la ressource
  const directPermission = await prisma.permission.findFirst({
    where: {
      resourceType,
      resourceId,
      OR: [
        { principalType: 'USER', principalId: userId },
        { principalType: 'ROLE', principalId: user.roleId },
      ],
    },
  });

  if (directPermission) {
    return meetsLevel(directPermission.level, requiredLevel);
  }

  // Pour les notes, vérifier les permissions du dossier parent
  if (resourceType === 'NOTE') {
    const note = await prisma.note.findUnique({
      where: { id: resourceId },
      select: { folderId: true },
    });

    if (note) {
      return checkFolderPermission(userId, user.roleId, note.folderId, requiredLevel);
    }
  }

  // Pour les dossiers, remonter la hiérarchie
  if (resourceType === 'FOLDER') {
    return checkFolderPermission(userId, user.roleId, resourceId, requiredLevel);
  }

  // Par défaut, vérifier les permissions globales du rôle
  return checkRolePermission(user.role.name, requiredLevel);
}

/**
 * Vérifie les permissions sur un dossier en remontant la hiérarchie
 * Prend en compte à la fois les permissions explicites et le modèle accessType (OPEN/RESTRICTED)
 */
async function checkFolderPermission(
  userId: string,
  roleId: string,
  folderId: string,
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN'
): Promise<boolean> {
  let currentFolderId: string | null = folderId;
  const visitedFolders = new Set<string>();

  while (currentFolderId && !visitedFolders.has(currentFolderId)) {
    visitedFolders.add(currentFolderId);

    // D'abord vérifier les permissions explicites (table Permission)
    const permission = await prisma.permission.findFirst({
      where: {
        resourceType: 'FOLDER',
        resourceId: currentFolderId,
        OR: [
          { principalType: 'USER', principalId: userId },
          { principalType: 'ROLE', principalId: roleId },
        ],
      },
    });

    if (permission) {
      return meetsLevel(permission.level, requiredLevel);
    }

    // Vérifier le modèle accessType (OPEN/RESTRICTED)
    const folder = await prisma.folder.findUnique({
      where: { id: currentFolderId },
      select: {
        parentId: true,
        accessType: true,
        accessList: {
          where: { userId },
          select: { canRead: true, canWrite: true },
        },
      },
    });

    if (folder) {
      // Dossier OPEN : tous les utilisateurs authentifiés ont accès en lecture
      // Les éditeurs peuvent aussi écrire (selon leur rôle global)
      if (folder.accessType === 'OPEN') {
        if (requiredLevel === 'READ') {
          return true;
        }
        // Pour WRITE sur un dossier OPEN, vérifier le rôle global (editor peut écrire)
        if (requiredLevel === 'WRITE') {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
          });
          return user?.role.name === 'editor' || user?.role.name === 'admin';
        }
      }

      // Dossier RESTRICTED : vérifier la liste d'accès
      if (folder.accessType === 'RESTRICTED' && folder.accessList.length > 0) {
        const access = folder.accessList[0];
        if (requiredLevel === 'READ' && access.canRead) {
          return true;
        }
        if (requiredLevel === 'WRITE' && access.canWrite) {
          return true;
        }
      }
    }

    // Remonter au parent
    currentFolderId = folder?.parentId || null;
  }

  // Aucune permission spécifique trouvée
  return false;
}

/**
 * Vérifie si le rôle global permet l'action
 */
function checkRolePermission(
  roleName: string,
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN'
): boolean {
  switch (roleName) {
    case 'admin':
      return true;
    case 'editor':
      return requiredLevel !== 'ADMIN';
    case 'reader':
      return requiredLevel === 'READ';
    default:
      return false;
  }
}

/**
 * Compare les niveaux de permission
 */
function meetsLevel(
  hasLevel: PermissionLevel,
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN'
): boolean {
  const levelOrder: Record<PermissionLevel, number> = {
    NONE: 0,
    READ: 1,
    WRITE: 2,
    ADMIN: 3,
  };

  return levelOrder[hasLevel] >= levelOrder[requiredLevel];
}

/**
 * Récupère toutes les permissions effectives d'un utilisateur
 */
export async function getEffectivePermissions(
  userId: string,
  resourceType?: ResourceType
): Promise<EffectivePermission[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return [];

  // Si admin, retourner ADMIN sur tout
  if (user.role.name === 'admin') {
    const resources = resourceType
      ? await getResourcesByType(resourceType)
      : [...(await getResourcesByType('FOLDER')), ...(await getResourcesByType('NOTE'))];

    return resources.map((r) => ({
      resourceType: r.type,
      resourceId: r.id,
      level: 'ADMIN' as PermissionLevel,
      source: 'role' as const,
    }));
  }

  // Récupérer les permissions explicites
  const whereClause: Record<string, unknown> = {
    OR: [
      { principalType: 'USER', principalId: userId },
      { principalType: 'ROLE', principalId: user.roleId },
    ],
  };

  if (resourceType) {
    whereClause.resourceType = resourceType;
  }

  const permissions = await prisma.permission.findMany({
    where: whereClause,
  });

  return permissions.map((p) => ({
    resourceType: p.resourceType as ResourceType,
    resourceId: p.resourceId,
    level: p.level as PermissionLevel,
    source: p.inherited ? 'inherited' : 'direct',
    sourceId: p.inherited ? undefined : p.id,
  }));
}

async function getResourcesByType(
  type: ResourceType
): Promise<Array<{ type: ResourceType; id: string }>> {
  if (type === 'FOLDER') {
    const folders = await prisma.folder.findMany({ select: { id: true } });
    return folders.map((f) => ({ type: 'FOLDER', id: f.id }));
  } else {
    const notes = await prisma.note.findMany({
      where: { isDeleted: false },
      select: { id: true },
    });
    return notes.map((n) => ({ type: 'NOTE', id: n.id }));
  }
}

/**
 * Attribue une permission
 * Invalide le cache après modification (US-052)
 */
export async function grantPermission(params: {
  resourceType: ResourceType;
  resourceId: string;
  principalType: 'USER' | 'ROLE';
  principalId: string;
  level: PermissionLevel;
  grantedBy: string;
}): Promise<void> {
  const { resourceType, resourceId, principalType, principalId, level, grantedBy } = params;

  // Supprimer l'ancienne permission si elle existe
  await prisma.permission.deleteMany({
    where: {
      resourceType,
      resourceId,
      principalType,
      principalId,
    },
  });

  // Créer la nouvelle permission (sauf si NONE)
  if (level !== 'NONE') {
    await prisma.permission.create({
      data: {
        resourceType,
        resourceId,
        principalType,
        principalId,
        level,
        inherited: false,
        grantedBy,
      },
    });
  }

  // Invalider le cache (US-052)
  await invalidateResourcePermissionCache(resourceType, resourceId);
  if (principalType === 'USER') {
    await invalidateUserPermissionCache(principalId);
  }
  logger.info({ resourceType, resourceId, principalId, level }, '[Permissions] Permission granted, cache invalidated');
}

/**
 * Révoque une permission
 * Invalide le cache après modification (US-052)
 */
export async function revokePermission(params: {
  resourceType: ResourceType;
  resourceId: string;
  principalType: 'USER' | 'ROLE';
  principalId: string;
}): Promise<void> {
  const { resourceType, resourceId, principalType, principalId } = params;

  await prisma.permission.deleteMany({
    where: params,
  });

  // Invalider le cache (US-052)
  await invalidateResourcePermissionCache(resourceType, resourceId);
  if (principalType === 'USER') {
    await invalidateUserPermissionCache(principalId);
  }
  logger.info({ resourceType, resourceId, principalId }, '[Permissions] Permission revoked, cache invalidated');
}
