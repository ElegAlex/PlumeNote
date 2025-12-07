// ===========================================
// Service Analytics (P3 Dashboard)
// Agrégation et calcul des statistiques
// ===========================================

import { prisma } from '@plumenote/database';
import type {
  OverviewStats,
  ActivityTimeline,
  ActivityDataPoint,
  DistributionItem,
  TopNote,
  UserContribution,
} from '@plumenote/types';
import { cacheGet, cacheSet } from './cache';
import { logger } from '../lib/logger';

const CACHE_TTL = 300; // 5 minutes

// ===========================================
// Métriques globales
// ===========================================

export async function getOverview(userId: string): Promise<OverviewStats> {
  const cacheKey = `analytics:overview`;

  // Vérifier le cache
  const cached = await cacheGet<OverviewStats>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Exécuter toutes les requêtes en parallèle
    const [
      totalNotes,
      totalFolders,
      activeUsersResult,
      notesCreatedThisWeek,
      notesModifiedThisWeek,
      totalViewsResult,
    ] = await Promise.all([
      // Total notes (non supprimées)
      prisma.note.count({
        where: { isDeleted: false },
      }),

      // Total dossiers
      prisma.folder.count(),

      // Utilisateurs actifs (ayant modifié une note dans les 30 derniers jours)
      prisma.note.groupBy({
        by: ['authorId'],
        where: {
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Notes créées cette semaine
      prisma.note.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          isDeleted: false,
        },
      }),

      // Notes modifiées cette semaine (exclure les créées)
      prisma.note.count({
        where: {
          updatedAt: { gte: sevenDaysAgo },
          createdAt: { lt: sevenDaysAgo },
          isDeleted: false,
        },
      }),

      // Total des vues
      prisma.note.aggregate({
        where: { isDeleted: false },
        _sum: { viewCount: true },
      }),
    ]);

    const overview: OverviewStats = {
      totalNotes,
      totalFolders,
      activeUsers: activeUsersResult.length,
      notesCreatedThisWeek,
      notesModifiedThisWeek,
      totalViews: totalViewsResult._sum.viewCount ?? 0,
    };

    // Mettre en cache
    await cacheSet(cacheKey, overview, CACHE_TTL);

    return overview;
  } catch (error) {
    logger.error({ error }, '[Analytics] Failed to get overview');
    throw error;
  }
}

// ===========================================
// Activité temporelle
// ===========================================

export async function getActivityTimeline(days: number = 30): Promise<ActivityTimeline> {
  const cacheKey = `analytics:activity:${days}`;

  const cached = await cacheGet<ActivityTimeline>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  try {
    // Requêtes SQL brutes pour GROUP BY date
    const creationsRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM notes
      WHERE created_at >= ${startDate}
      AND is_deleted = false
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const modificationsRaw = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(updated_at) as day, COUNT(*) as count
      FROM notes
      WHERE updated_at >= ${startDate}
      AND updated_at != created_at
      AND is_deleted = false
      GROUP BY DATE(updated_at)
      ORDER BY day ASC
    `;

    // Remplir les jours manquants avec 0
    const creations = fillMissingDays(creationsRaw, days);
    const modifications = fillMissingDays(modificationsRaw, days);

    const result: ActivityTimeline = { creations, modifications };

    await cacheSet(cacheKey, result, CACHE_TTL);

    return result;
  } catch (error) {
    logger.error({ error }, '[Analytics] Failed to get activity timeline');
    throw error;
  }
}

// ===========================================
// Distribution par métadonnées
// ===========================================

export async function getMetadataDistribution(
  field: 'status' | 'priority' | 'tags'
): Promise<DistributionItem[]> {
  const cacheKey = `analytics:distribution:${field}`;

  const cached = await cacheGet<DistributionItem[]>(cacheKey);
  if (cached) return cached;

  try {
    let distribution: DistributionItem[];

    if (field === 'tags') {
      distribution = await getTagsDistribution();
    } else {
      distribution = await getScalarDistribution(field);
    }

    await cacheSet(cacheKey, distribution, CACHE_TTL);

    return distribution;
  } catch (error) {
    logger.error({ error, field }, '[Analytics] Failed to get distribution');
    throw error;
  }
}

async function getTagsDistribution(): Promise<DistributionItem[]> {
  const notes = await prisma.note.findMany({
    where: { isDeleted: false },
    select: { frontmatter: true },
  });

  const tagCounts = new Map<string, number>();

  for (const note of notes) {
    const frontmatter = note.frontmatter as Record<string, unknown> | null;
    if (!frontmatter) continue;

    const tags = frontmatter.tags;

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === 'string') {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(tagCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function getScalarDistribution(field: string): Promise<DistributionItem[]> {
  const notes = await prisma.note.findMany({
    where: { isDeleted: false },
    select: { frontmatter: true },
  });

  const counts = new Map<string, number>();
  let withoutValue = 0;

  for (const note of notes) {
    const frontmatter = note.frontmatter as Record<string, unknown> | null;

    if (!frontmatter) {
      withoutValue++;
      continue;
    }

    const value = frontmatter[field];

    if (value !== undefined && value !== null && typeof value === 'string') {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    } else {
      withoutValue++;
    }
  }

  const distribution = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Ajouter "Non défini" si des notes n'ont pas la propriété
  if (withoutValue > 0) {
    distribution.push({ label: 'Non défini', count: withoutValue });
  }

  return distribution;
}

// ===========================================
// Notes les plus consultées
// ===========================================

export async function getTopNotes(userId: string, limit: number = 10): Promise<TopNote[]> {
  try {
    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        viewCount: { gt: 0 },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        viewCount: true,
        updatedAt: true,
        folder: {
          select: {
            name: true,
            path: true,
          },
        },
      },
    });

    return notes.map((note) => ({
      id: note.id,
      title: note.title,
      viewCount: note.viewCount,
      updatedAt: note.updatedAt.toISOString(),
      folderPath: note.folder?.path || note.folder?.name || '',
    }));
  } catch (error) {
    logger.error({ error }, '[Analytics] Failed to get top notes');
    throw error;
  }
}

// ===========================================
// Contributions par utilisateur
// ===========================================

export async function getUserContributions(): Promise<UserContribution[]> {
  const cacheKey = 'analytics:contributions';

  const cached = await cacheGet<UserContribution[]>(cacheKey);
  if (cached) return cached;

  try {
    // Récupérer les stats par utilisateur via requête SQL brute
    const contributions = await prisma.$queryRaw<Array<{
      user_id: string;
      user_name: string;
      user_email: string;
      notes_created: bigint;
      notes_modified: bigint;
      last_activity: Date;
    }>>`
      SELECT
        u.id as user_id,
        u.display_name as user_name,
        u.email as user_email,
        COUNT(DISTINCT CASE WHEN n.author_id = u.id THEN n.id END) as notes_created,
        COUNT(DISTINCT n.id) as notes_modified,
        MAX(n.updated_at) as last_activity
      FROM users u
      INNER JOIN notes n ON n.author_id = u.id OR n.modified_by = u.id
      WHERE n.is_deleted = false
      GROUP BY u.id, u.display_name, u.email
      HAVING COUNT(n.id) > 0
      ORDER BY notes_modified DESC
      LIMIT 20
    `;

    const result: UserContribution[] = contributions.map((c) => ({
      userId: c.user_id,
      userName: c.user_name,
      userEmail: c.user_email,
      notesCreated: Number(c.notes_created),
      notesModified: Number(c.notes_modified),
      lastActivity: c.last_activity.toISOString(),
    }));

    await cacheSet(cacheKey, result, CACHE_TTL);

    return result;
  } catch (error) {
    logger.error({ error }, '[Analytics] Failed to get user contributions');
    throw error;
  }
}

// ===========================================
// Helpers
// ===========================================

function fillMissingDays(
  data: Array<{ day: Date; count: bigint }>,
  days: number
): ActivityDataPoint[] {
  const result: ActivityDataPoint[] = [];
  const dataMap = new Map(
    data.map((d) => [d.day.toISOString().split('T')[0], Number(d.count)])
  );

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    result.push({
      date: dateStr,
      count: dataMap.get(dateStr) ?? 0,
    });
  }

  return result;
}
