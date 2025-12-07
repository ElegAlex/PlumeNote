# MODULE P3 : Dashboard Statistiques

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|**P3-Basse**|
|Complexité|M|
|Modules impactés|Backend (analytics), Frontend (dashboard, sidebar), Database (vues matérialisées optionnelles)|
|Estimation|3 jours-homme|
|Dépendances|Module P2 (Métadonnées)|

### Description

Implémentation d'un tableau de bord analytique accessible depuis la sidebar, offrant une vue d'ensemble de l'activité et du contenu du workspace. Ce dashboard remplace le widget "Statistiques" qui était incorrectement positionné sur la homepage.

Le dashboard propose :

- **Métriques globales** : Nombre de notes, dossiers, utilisateurs actifs
- **Activité temporelle** : Notes créées/modifiées sur les 7/30 derniers jours
- **Répartition par métadonnées** : Distribution par status, priority, tags
- **Top notes** : Notes les plus consultées
- **Activité par utilisateur** : Contributions par membre de l'équipe

### Critères d'acceptation

**Navigation :**

- [ ] Le dashboard est accessible via un lien "Statistiques" dans la sidebar
- [ ] Le lien comporte une icône appropriée (BarChart ou PieChart)
- [ ] La page est responsive (desktop, tablet, mobile)

**Métriques globales :**

- [ ] Affichage du nombre total de notes
- [ ] Affichage du nombre total de dossiers
- [ ] Affichage du nombre d'utilisateurs actifs (ayant contribué dans les 30 derniers jours)
- [ ] Affichage du nombre de notes créées cette semaine
- [ ] Affichage du nombre de modifications cette semaine

**Graphiques d'activité :**

- [ ] Graphique linéaire des notes créées sur les 30 derniers jours
- [ ] Graphique linéaire des modifications sur les 30 derniers jours
- [ ] Possibilité de basculer entre vue 7 jours / 30 jours

**Répartition par métadonnées :**

- [ ] Graphique en donut pour la répartition par `status`
- [ ] Graphique en barres horizontales pour les top 10 tags
- [ ] Graphique en donut pour la répartition par `priority`
- [ ] Les graphiques sont cliquables et filtrent vers la recherche

**Top notes :**

- [ ] Liste des 10 notes les plus consultées (par viewCount)
- [ ] Affichage du titre, nombre de vues, dernière modification
- [ ] Clic sur une note ouvre l'éditeur

**Activité par utilisateur :**

- [ ] Tableau des contributions par utilisateur
- [ ] Colonnes : Nom, Notes créées, Modifications, Dernière activité
- [ ] Tri par nombre de contributions

**Performance :**

- [ ] Temps de chargement < 2 secondes
- [ ] Mise en cache des données agrégées (TTL 5 minutes)

---

## 2. Analyse technique

### 2.1 Contexte

Le dashboard exploite les données existantes :

- Table `notes` : comptages, dates, viewCount
- Table `folders` : comptages
- Table `users` : liste des utilisateurs
- Colonne `metadata` JSONB : répartition par status/priority/tags

### 2.2 Architecture de la solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD PAGE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         STATS CARDS ROW                                 ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ││
│  │  │  Notes   │  │ Dossiers │  │  Users   │  │ Créées   │  │  Modifs  │  ││
│  │  │   247    │  │    32    │  │   12     │  │ +18 7j   │  │  +45 7j  │  ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │      ACTIVITY CHART (Line)         │  │     STATUS DISTRIBUTION      │  │
│  │                                    │  │         (Donut)              │  │
│  │      📈 Créations / Modifications  │  │    ┌─────────────────┐       │  │
│  │                                    │  │    │   todo: 45%     │       │  │
│  │  [7 jours] [30 jours]              │  │    │   done: 35%     │       │  │
│  │                                    │  │    │   in-progress   │       │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │       TOP TAGS (Bar Chart)         │  │    PRIORITY DISTRIBUTION     │  │
│  │                                    │  │         (Donut)              │  │
│  │  meeting      ████████████  42     │  │                              │  │
│  │  projet       █████████     35     │  │    high: 20%                 │  │
│  │  important    ███████       28     │  │    medium: 50%               │  │
│  │  ...                               │  │    low: 30%                  │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │        TOP NOTES (Table)           │  │   USER CONTRIBUTIONS         │  │
│  │                                    │  │        (Table)               │  │
│  │  1. Documentation API    │ 142 👁  │  │                              │  │
│  │  2. Guide déploiement    │  98 👁  │  │  Alice    │ 45 │ 120 │ 2h   │  │
│  │  3. Notes réunion        │  76 👁  │  │  Bob      │ 32 │  85 │ 1j   │  │
│  │  ...                               │  │  Charlie  │ 28 │  62 │ 3j   │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Stratégie de performance

Pour éviter des requêtes coûteuses à chaque chargement :

1. **Agrégation côté SQL** : Requêtes optimisées avec GROUP BY
2. **Cache Redis** : TTL de 5 minutes pour les données agrégées
3. **Requêtes parallèles** : `Promise.all` pour charger toutes les sections
4. **Lazy loading** : Graphiques chargés après les métriques principales

---

## 3. Spécifications détaillées

### 3.1 Modifications Base de données

Pas de modification de schéma nécessaire. On exploite les tables existantes.

Optionnel pour de très gros volumes : vues matérialisées (à implémenter si performance insuffisante).

```sql
-- Vue matérialisée optionnelle pour les stats quotidiennes
-- À créer uniquement si les performances le nécessitent

CREATE MATERIALIZED VIEW daily_stats AS
SELECT 
  DATE(created_at) as day,
  COUNT(*) as notes_created,
  COUNT(DISTINCT owner_id) as active_users
FROM notes
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
WITH DATA;

-- Rafraîchir via cron job quotidien
-- REFRESH MATERIALIZED VIEW daily_stats;
```

### 3.2 Backend (API Fastify)

#### Endpoints

|Méthode|Route|Description|Auth|
|---|---|---|---|
|GET|`/api/v1/analytics/overview`|Métriques globales|Oui|
|GET|`/api/v1/analytics/activity`|Activité temporelle|Oui|
|GET|`/api/v1/analytics/distribution`|Répartition par métadonnées|Oui|
|GET|`/api/v1/analytics/top-notes`|Notes les plus consultées|Oui|
|GET|`/api/v1/analytics/user-contributions`|Contributions par utilisateur|Oui|

#### analytics.controller.ts

```typescript
// apps/api/src/modules/analytics/analytics.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from './analytics.service';
import {
  GetActivityQuery,
  GetActivityQuerySchema,
  GetTopNotesQuery,
  GetTopNotesQuerySchema,
  GetDistributionQuery,
  GetDistributionQuerySchema
} from './analytics.schema';

export async function analyticsController(fastify: FastifyInstance): Promise<void> {
  const analyticsService = new AnalyticsService(fastify.prisma, fastify.redis);

  // GET /api/v1/analytics/overview - Métriques globales
  fastify.get('/overview', {
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const workspaceId = request.user.workspaceId;
      
      const overview = await analyticsService.getOverview(workspaceId, userId);
      return reply.send(overview);
    }
  });

  // GET /api/v1/analytics/activity - Activité temporelle
  fastify.get<{ Querystring: GetActivityQuery }>(
    '/activity',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetActivityQuerySchema },
      handler: async (request, reply) => {
        const { days = 30 } = request.query;
        const workspaceId = request.user.workspaceId;
        
        const activity = await analyticsService.getActivityTimeline(workspaceId, days);
        return reply.send(activity);
      }
    }
  );

  // GET /api/v1/analytics/distribution - Répartition par métadonnées
  fastify.get<{ Querystring: GetDistributionQuery }>(
    '/distribution',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetDistributionQuerySchema },
      handler: async (request, reply) => {
        const { field } = request.query;
        const workspaceId = request.user.workspaceId;
        
        const distribution = await analyticsService.getMetadataDistribution(workspaceId, field);
        return reply.send(distribution);
      }
    }
  );

  // GET /api/v1/analytics/top-notes - Notes les plus consultées
  fastify.get<{ Querystring: GetTopNotesQuery }>(
    '/top-notes',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetTopNotesQuerySchema },
      handler: async (request, reply) => {
        const { limit = 10 } = request.query;
        const userId = request.user.id;
        
        const topNotes = await analyticsService.getTopNotes(userId, limit);
        return reply.send(topNotes);
      }
    }
  );

  // GET /api/v1/analytics/user-contributions - Contributions par utilisateur
  fastify.get('/user-contributions', {
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const workspaceId = request.user.workspaceId;
      
      const contributions = await analyticsService.getUserContributions(workspaceId);
      return reply.send(contributions);
    }
  });
}
```

#### analytics.service.ts

```typescript
// apps/api/src/modules/analytics/analytics.service.ts

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import {
  OverviewStats,
  ActivityDataPoint,
  DistributionItem,
  TopNote,
  UserContribution
} from '@plumenote/shared-types';

const CACHE_TTL = 300; // 5 minutes

export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis?: Redis
  ) {}

  /**
   * Métriques globales du workspace
   */
  async getOverview(workspaceId: string | null, userId: string): Promise<OverviewStats> {
    const cacheKey = `analytics:overview:${workspaceId ?? 'global'}`;
    
    // Vérifier le cache
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Exécuter toutes les requêtes en parallèle
    const [
      totalNotes,
      totalFolders,
      activeUsers,
      notesCreatedThisWeek,
      notesModifiedThisWeek,
      totalViews
    ] = await Promise.all([
      // Total notes
      this.prisma.note.count({
        where: this.getWorkspaceFilter(workspaceId)
      }),

      // Total dossiers
      this.prisma.folder.count({
        where: this.getWorkspaceFilter(workspaceId)
      }),

      // Utilisateurs actifs (30 derniers jours)
      this.prisma.note.groupBy({
        by: ['ownerId'],
        where: {
          ...this.getWorkspaceFilter(workspaceId),
          updatedAt: { gte: thirtyDaysAgo }
        }
      }).then(results => results.length),

      // Notes créées cette semaine
      this.prisma.note.count({
        where: {
          ...this.getWorkspaceFilter(workspaceId),
          createdAt: { gte: sevenDaysAgo }
        }
      }),

      // Notes modifiées cette semaine
      this.prisma.note.count({
        where: {
          ...this.getWorkspaceFilter(workspaceId),
          updatedAt: { gte: sevenDaysAgo }
        }
      }),

      // Total des vues
      this.prisma.note.aggregate({
        where: this.getWorkspaceFilter(workspaceId),
        _sum: { viewCount: true }
      }).then(result => result._sum.viewCount ?? 0)
    ]);

    const overview: OverviewStats = {
      totalNotes,
      totalFolders,
      activeUsers,
      notesCreatedThisWeek,
      notesModifiedThisWeek,
      totalViews
    };

    // Mettre en cache
    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(overview));
    }

    return overview;
  }

  /**
   * Activité sur une période (créations et modifications par jour)
   */
  async getActivityTimeline(
    workspaceId: string | null,
    days: number = 30
  ): Promise<{ creations: ActivityDataPoint[]; modifications: ActivityDataPoint[] }> {
    const cacheKey = `analytics:activity:${workspaceId ?? 'global'}:${days}`;
    
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Requête SQL brute pour grouper par jour
    const creationsRaw = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM notes
      WHERE created_at >= ${startDate}
      ${workspaceId ? this.prisma.$queryRaw`AND folder_id IN (SELECT id FROM folders WHERE workspace_id = ${workspaceId})` : this.prisma.$queryRaw``}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    const modificationsRaw = await this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(updated_at) as day, COUNT(*) as count
      FROM notes
      WHERE updated_at >= ${startDate}
      AND updated_at != created_at
      ${workspaceId ? this.prisma.$queryRaw`AND folder_id IN (SELECT id FROM folders WHERE workspace_id = ${workspaceId})` : this.prisma.$queryRaw``}
      GROUP BY DATE(updated_at)
      ORDER BY day ASC
    `;

    // Remplir les jours manquants avec 0
    const creations = this.fillMissingDays(creationsRaw, days);
    const modifications = this.fillMissingDays(modificationsRaw, days);

    const result = { creations, modifications };

    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Distribution par champ de métadonnée (status, priority, tags)
   */
  async getMetadataDistribution(
    workspaceId: string | null,
    field: string
  ): Promise<DistributionItem[]> {
    const cacheKey = `analytics:distribution:${workspaceId ?? 'global'}:${field}`;
    
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    let distribution: DistributionItem[];

    if (field === 'tags') {
      // Cas spécial pour les tags (array)
      distribution = await this.getTagsDistribution(workspaceId);
    } else {
      // Champs scalaires (status, priority)
      distribution = await this.getScalarDistribution(workspaceId, field);
    }

    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(distribution));
    }

    return distribution;
  }

  /**
   * Distribution des tags
   */
  private async getTagsDistribution(workspaceId: string | null): Promise<DistributionItem[]> {
    const notes = await this.prisma.note.findMany({
      where: this.getWorkspaceFilter(workspaceId),
      select: { metadata: true }
    });

    const tagCounts = new Map<string, number>();

    for (const note of notes) {
      const metadata = note.metadata as Record<string, unknown>;
      const tags = metadata.tags;
      
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

  /**
   * Distribution d'un champ scalaire
   */
  private async getScalarDistribution(
    workspaceId: string | null,
    field: string
  ): Promise<DistributionItem[]> {
    const notes = await this.prisma.note.findMany({
      where: this.getWorkspaceFilter(workspaceId),
      select: { metadata: true }
    });

    const counts = new Map<string, number>();
    let withoutValue = 0;

    for (const note of notes) {
      const metadata = note.metadata as Record<string, unknown>;
      const value = metadata[field];
      
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

  /**
   * Notes les plus consultées
   */
  async getTopNotes(userId: string, limit: number = 10): Promise<TopNote[]> {
    const notes = await this.prisma.note.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } } }
        ],
        viewCount: { gt: 0 }
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
            parent: { select: { name: true } }
          }
        }
      }
    });

    return notes.map(note => ({
      id: note.id,
      title: note.title,
      viewCount: note.viewCount,
      updatedAt: note.updatedAt.toISOString(),
      folderPath: note.folder.parent 
        ? `${note.folder.parent.name}/${note.folder.name}`
        : note.folder.name
    }));
  }

  /**
   * Contributions par utilisateur
   */
  async getUserContributions(workspaceId: string | null): Promise<UserContribution[]> {
    const cacheKey = `analytics:contributions:${workspaceId ?? 'global'}`;
    
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // Récupérer les stats par utilisateur
    const contributions = await this.prisma.$queryRaw<Array<{
      user_id: string;
      user_name: string;
      user_email: string;
      notes_created: bigint;
      notes_modified: bigint;
      last_activity: Date;
    }>>`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        COUNT(DISTINCT CASE WHEN n.owner_id = u.id THEN n.id END) as notes_created,
        COUNT(DISTINCT n.id) as notes_modified,
        MAX(n.updated_at) as last_activity
      FROM users u
      LEFT JOIN notes n ON n.owner_id = u.id OR EXISTS (
        SELECT 1 FROM folder_permissions fp 
        WHERE fp.folder_id = n.folder_id 
        AND fp.user_id = u.id 
        AND fp.level IN ('write', 'admin')
      )
      ${workspaceId ? this.prisma.$queryRaw`WHERE n.folder_id IN (SELECT id FROM folders WHERE workspace_id = ${workspaceId})` : this.prisma.$queryRaw``}
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(n.id) > 0
      ORDER BY notes_modified DESC
    `;

    const result: UserContribution[] = contributions.map(c => ({
      userId: c.user_id,
      userName: c.user_name,
      userEmail: c.user_email,
      notesCreated: Number(c.notes_created),
      notesModified: Number(c.notes_modified),
      lastActivity: c.last_activity.toISOString()
    }));

    if (this.redis) {
      await this.redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Helper : Filtre par workspace
   */
  private getWorkspaceFilter(workspaceId: string | null): object {
    if (!workspaceId) return {};
    return {
      folder: {
        workspaceId
      }
    };
  }

  /**
   * Helper : Remplir les jours manquants avec des zéros
   */
  private fillMissingDays(
    data: Array<{ day: Date; count: bigint }>,
    days: number
  ): ActivityDataPoint[] {
    const result: ActivityDataPoint[] = [];
    const dataMap = new Map(
      data.map(d => [d.day.toISOString().split('T')[0], Number(d.count)])
    );

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      result.push({
        date: dateStr,
        count: dataMap.get(dateStr) ?? 0
      });
    }

    return result;
  }
}
```

#### analytics.schema.ts

```typescript
// apps/api/src/modules/analytics/analytics.schema.ts

import { z } from 'zod';

export const GetActivityQuerySchema = z.object({
  days: z.coerce.number().min(7).max(90).optional().default(30)
});

export type GetActivityQuery = z.infer<typeof GetActivityQuerySchema>;

export const GetDistributionQuerySchema = z.object({
  field: z.enum(['status', 'priority', 'tags'])
});

export type GetDistributionQuery = z.infer<typeof GetDistributionQuerySchema>;

export const GetTopNotesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10)
});

export type GetTopNotesQuery = z.infer<typeof GetTopNotesQuerySchema>;
```

### 3.3 Frontend (React)

#### Types/Interfaces

```typescript
// packages/shared-types/src/analytics.ts

export interface OverviewStats {
  totalNotes: number;
  totalFolders: number;
  activeUsers: number;
  notesCreatedThisWeek: number;
  notesModifiedThisWeek: number;
  totalViews: number;
}

export interface ActivityDataPoint {
  date: string;
  count: number;
}

export interface ActivityTimeline {
  creations: ActivityDataPoint[];
  modifications: ActivityDataPoint[];
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface TopNote {
  id: string;
  title: string;
  viewCount: number;
  updatedAt: string;
  folderPath: string;
}

export interface UserContribution {
  userId: string;
  userName: string;
  userEmail: string;
  notesCreated: number;
  notesModified: number;
  lastActivity: string;
}
```

#### Store Zustand - Analytics

```typescript
// apps/web/src/stores/analyticsStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  OverviewStats,
  ActivityTimeline,
  DistributionItem,
  TopNote,
  UserContribution
} from '@plumenote/shared-types';
import { analyticsApi } from '@/services/analyticsApi';

interface AnalyticsState {
  // État
  overview: OverviewStats | null;
  activity: ActivityTimeline | null;
  statusDistribution: DistributionItem[];
  priorityDistribution: DistributionItem[];
  tagsDistribution: DistributionItem[];
  topNotes: TopNote[];
  userContributions: UserContribution[];
  
  // Loading states
  isLoadingOverview: boolean;
  isLoadingActivity: boolean;
  isLoadingDistributions: boolean;
  isLoadingTopNotes: boolean;
  isLoadingContributions: boolean;
  
  error: string | null;
  activityDays: 7 | 30;

  // Actions
  loadOverview: () => Promise<void>;
  loadActivity: (days?: number) => Promise<void>;
  loadDistributions: () => Promise<void>;
  loadTopNotes: () => Promise<void>;
  loadContributions: () => Promise<void>;
  loadAll: () => Promise<void>;
  setActivityDays: (days: 7 | 30) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      overview: null,
      activity: null,
      statusDistribution: [],
      priorityDistribution: [],
      tagsDistribution: [],
      topNotes: [],
      userContributions: [],
      isLoadingOverview: false,
      isLoadingActivity: false,
      isLoadingDistributions: false,
      isLoadingTopNotes: false,
      isLoadingContributions: false,
      error: null,
      activityDays: 30,

      loadOverview: async () => {
        set({ isLoadingOverview: true, error: null });
        try {
          const overview = await analyticsApi.getOverview();
          set({ overview, isLoadingOverview: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load overview',
            isLoadingOverview: false
          });
        }
      },

      loadActivity: async (days?: number) => {
        const daysToLoad = days ?? get().activityDays;
        set({ isLoadingActivity: true, error: null });
        try {
          const activity = await analyticsApi.getActivity(daysToLoad);
          set({ activity, isLoadingActivity: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load activity',
            isLoadingActivity: false
          });
        }
      },

      loadDistributions: async () => {
        set({ isLoadingDistributions: true, error: null });
        try {
          const [status, priority, tags] = await Promise.all([
            analyticsApi.getDistribution('status'),
            analyticsApi.getDistribution('priority'),
            analyticsApi.getDistribution('tags')
          ]);
          set({
            statusDistribution: status,
            priorityDistribution: priority,
            tagsDistribution: tags,
            isLoadingDistributions: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load distributions',
            isLoadingDistributions: false
          });
        }
      },

      loadTopNotes: async () => {
        set({ isLoadingTopNotes: true, error: null });
        try {
          const topNotes = await analyticsApi.getTopNotes(10);
          set({ topNotes, isLoadingTopNotes: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load top notes',
            isLoadingTopNotes: false
          });
        }
      },

      loadContributions: async () => {
        set({ isLoadingContributions: true, error: null });
        try {
          const userContributions = await analyticsApi.getUserContributions();
          set({ userContributions, isLoadingContributions: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load contributions',
            isLoadingContributions: false
          });
        }
      },

      loadAll: async () => {
        const { loadOverview, loadActivity, loadDistributions, loadTopNotes, loadContributions } = get();
        await Promise.all([
          loadOverview(),
          loadActivity(),
          loadDistributions(),
          loadTopNotes(),
          loadContributions()
        ]);
      },

      setActivityDays: (days: 7 | 30) => {
        set({ activityDays: days });
        get().loadActivity(days);
      }
    }),
    { name: 'analytics-store' }
  )
);
```

#### API Client

```typescript
// apps/web/src/services/analyticsApi.ts

import { api } from './api';
import {
  OverviewStats,
  ActivityTimeline,
  DistributionItem,
  TopNote,
  UserContribution
} from '@plumenote/shared-types';

export const analyticsApi = {
  async getOverview(): Promise<OverviewStats> {
    const response = await api.get<OverviewStats>('/analytics/overview');
    return response.data;
  },

  async getActivity(days: number = 30): Promise<ActivityTimeline> {
    const response = await api.get<ActivityTimeline>('/analytics/activity', {
      params: { days }
    });
    return response.data;
  },

  async getDistribution(field: 'status' | 'priority' | 'tags'): Promise<DistributionItem[]> {
    const response = await api.get<DistributionItem[]>('/analytics/distribution', {
      params: { field }
    });
    return response.data;
  },

  async getTopNotes(limit: number = 10): Promise<TopNote[]> {
    const response = await api.get<TopNote[]>('/analytics/top-notes', {
      params: { limit }
    });
    return response.data;
  },

  async getUserContributions(): Promise<UserContribution[]> {
    const response = await api.get<UserContribution[]>('/analytics/user-contributions');
    return response.data;
  }
};
```

#### Composants

##### DashboardPage.tsx

```typescript
// apps/web/src/components/dashboard/DashboardPage.tsx

import { useEffect } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { StatsCards } from './StatsCards';
import { ActivityChart } from './ActivityChart';
import { DistributionCharts } from './DistributionCharts';
import { TopNotesTable } from './TopNotesTable';
import { UserContributionsTable } from './UserContributionsTable';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPage() {
  const { loadAll, error, isLoadingOverview } = useAnalyticsStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={loadAll} className="text-primary hover:underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page h-full overflow-auto">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-background/95">
        <h1 className="text-2xl font-semibold">Statistiques</h1>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble de l'activité et du contenu
        </p>
      </header>

      {/* Contenu */}
      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Cartes de stats */}
        {isLoadingOverview ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <StatsCards />
        )}

        {/* Graphique d'activité + Distribution status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityChart />
          </div>
          <div>
            <DistributionCharts field="status" title="Par statut" />
          </div>
        </div>

        {/* Tags + Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionCharts field="tags" title="Top tags" chartType="bar" />
          <DistributionCharts field="priority" title="Par priorité" />
        </div>

        {/* Top notes + Contributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopNotesTable />
          <UserContributionsTable />
        </div>
      </main>
    </div>
  );
}
```

##### StatsCards.tsx

```typescript
// apps/web/src/components/dashboard/StatsCards.tsx

import { 
  FileText, 
  Folder, 
  Users, 
  PlusCircle, 
  Edit, 
  Eye 
} from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function StatCard({ title, value, icon, description, trend, trendValue }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            {icon}
          </div>
          {trendValue && (
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' && "text-green-600",
              trend === 'down' && "text-red-600",
              trend === 'neutral' && "text-muted-foreground"
            )}>
              {trendValue}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value.toLocaleString('fr-FR')}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { overview } = useAnalyticsStore();

  if (!overview) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        title="Notes"
        value={overview.totalNotes}
        icon={<FileText className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Dossiers"
        value={overview.totalFolders}
        icon={<Folder className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Utilisateurs actifs"
        value={overview.activeUsers}
        icon={<Users className="h-5 w-5 text-primary" />}
        description="30 derniers jours"
      />
      <StatCard
        title="Créées"
        value={overview.notesCreatedThisWeek}
        icon={<PlusCircle className="h-5 w-5 text-primary" />}
        trendValue="+7 jours"
        trend="neutral"
      />
      <StatCard
        title="Modifiées"
        value={overview.notesModifiedThisWeek}
        icon={<Edit className="h-5 w-5 text-primary" />}
        trendValue="+7 jours"
        trend="neutral"
      />
      <StatCard
        title="Vues totales"
        value={overview.totalViews}
        icon={<Eye className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}
```

##### ActivityChart.tsx

```typescript
// apps/web/src/components/dashboard/ActivityChart.tsx

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ActivityChart() {
  const { 
    activity, 
    isLoadingActivity, 
    activityDays, 
    setActivityDays 
  } = useAnalyticsStore();

  // Fusionner les données pour le graphique
  const chartData = useMemo(() => {
    if (!activity) return [];

    return activity.creations.map((creation, index) => ({
      date: formatDate(creation.date),
      creations: creation.count,
      modifications: activity.modifications[index]?.count ?? 0
    }));
  }, [activity]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base font-medium">Activité</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={activityDays === 7 ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivityDays(7)}
          >
            7 jours
          </Button>
          <Button
            variant={activityDays === 30 ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivityDays(30)}
          >
            30 jours
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingActivity ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="creations"
                name="Créations"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="modifications"
                name="Modifications"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
```

##### DistributionCharts.tsx

```typescript
// apps/web/src/components/dashboard/DistributionCharts.tsx

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))'
];

interface DistributionChartsProps {
  field: 'status' | 'priority' | 'tags';
  title: string;
  chartType?: 'donut' | 'bar';
}

export function DistributionCharts({ 
  field, 
  title, 
  chartType = 'donut' 
}: DistributionChartsProps) {
  const navigate = useNavigate();
  const { 
    statusDistribution, 
    priorityDistribution, 
    tagsDistribution,
    isLoadingDistributions 
  } = useAnalyticsStore();

  const data = useMemo(() => {
    switch (field) {
      case 'status': return statusDistribution;
      case 'priority': return priorityDistribution;
      case 'tags': return tagsDistribution;
    }
  }, [field, statusDistribution, priorityDistribution, tagsDistribution]);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  const handleClick = (label: string) => {
    // Naviguer vers la recherche avec filtre
    navigate(`/search?${field}=${encodeURIComponent(label)}`);
  };

  if (isLoadingDistributions) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [`${value} notes`, 'Nombre']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data) => handleClick(data.label)}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(_, index) => handleClick(data[index].label)}
                >
                  {data.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} (${Math.round(value / total * 100)}%)`,
                    'Notes'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Légende */}
            <div className="flex-1 space-y-1">
              {data.slice(0, 5).map((item, index) => (
                <div 
                  key={item.label}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                  onClick={() => handleClick(item.label)}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

##### TopNotesTable.tsx

```typescript
// apps/web/src/components/dashboard/TopNotesTable.tsx

import { useNavigate } from 'react-router-dom';
import { Eye, Trophy } from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeDate } from '@/lib/dateUtils';

export function TopNotesTable() {
  const navigate = useNavigate();
  const { topNotes, isLoadingTopNotes } = useAnalyticsStore();

  if (isLoadingTopNotes) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Notes les plus consultées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Notes les plus consultées
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topNotes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucune note consultée
          </div>
        ) : (
          <div className="space-y-1">
            {topNotes.map((note, index) => (
              <div
                key={note.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                {/* Rang */}
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>

                {/* Titre et chemin */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{note.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {note.folderPath}
                  </p>
                </div>

                {/* Vues */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>{note.viewCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

##### UserContributionsTable.tsx

```typescript
// apps/web/src/components/dashboard/UserContributionsTable.tsx

import { Users, FileText, Edit, Clock } from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeDate } from '@/lib/dateUtils';

export function UserContributionsTable() {
  const { userContributions, isLoadingContributions } = useAnalyticsStore();

  if (isLoadingContributions) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contributions par utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Contributions par utilisateur
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userContributions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Aucune contribution
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Utilisateur</th>
                  <th className="pb-2 font-medium text-center">
                    <FileText className="h-3 w-3 inline mr-1" />
                    Créées
                  </th>
                  <th className="pb-2 font-medium text-center">
                    <Edit className="h-3 w-3 inline mr-1" />
                    Modifs
                  </th>
                  <th className="pb-2 font-medium text-right">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Activité
                  </th>
                </tr>
              </thead>
              <tbody>
                {userContributions.map((user) => (
                  <tr key={user.userId} className="border-b last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.userName}</p>
                          <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-center text-sm">
                      {user.notesCreated}
                    </td>
                    <td className="py-2 text-center text-sm">
                      {user.notesModified}
                    </td>
                    <td className="py-2 text-right text-xs text-muted-foreground">
                      {formatRelativeDate(user.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
```

#### Modification Sidebar

```typescript
// apps/web/src/components/sidebar/Sidebar.tsx (ajout)

import { BarChart3 } from 'lucide-react';

// Dans la liste des liens de navigation, ajouter :
const navItems = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/search', label: 'Recherche', icon: Search },
  { path: '/dashboard', label: 'Statistiques', icon: BarChart3 }, // NOUVEAU
  { path: '/calendar', label: 'Calendrier', icon: Calendar },
  // ... autres items
];
```

#### Routing

```typescript
// apps/web/src/App.tsx ou routes.tsx (ajout)

import { DashboardPage } from '@/components/dashboard/DashboardPage';

// Ajouter la route :
<Route path="/dashboard" element={<DashboardPage />} />
```

---

## 4. Tests

### 4.1 Tests unitaires Backend

```typescript
// apps/api/src/modules/analytics/__tests__/analytics.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics.service';
import { prismaMock } from '@/test/prisma-mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService(prismaMock, undefined); // Sans Redis pour les tests
    vi.clearAllMocks();
  });

  describe('getOverview', () => {
    it('should return all overview stats', async () => {
      prismaMock.note.count
        .mockResolvedValueOnce(100)  // totalNotes
        .mockResolvedValueOnce(15)   // notesCreatedThisWeek
        .mockResolvedValueOnce(25);  // notesModifiedThisWeek
      
      prismaMock.folder.count.mockResolvedValue(20);
      
      prismaMock.note.groupBy.mockResolvedValue([
        { ownerId: 'user-1' },
        { ownerId: 'user-2' },
        { ownerId: 'user-3' }
      ]);
      
      prismaMock.note.aggregate.mockResolvedValue({
        _sum: { viewCount: 5000 }
      });

      const result = await service.getOverview(null, 'user-1');

      expect(result.totalNotes).toBe(100);
      expect(result.totalFolders).toBe(20);
      expect(result.activeUsers).toBe(3);
      expect(result.notesCreatedThisWeek).toBe(15);
      expect(result.notesModifiedThisWeek).toBe(25);
      expect(result.totalViews).toBe(5000);
    });
  });

  describe('getTopNotes', () => {
    it('should return notes ordered by view count', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Popular Note',
          viewCount: 100,
          updatedAt: new Date(),
          folder: { name: 'Folder', parent: null }
        },
        {
          id: 'note-2',
          title: 'Less Popular',
          viewCount: 50,
          updatedAt: new Date(),
          folder: { name: 'SubFolder', parent: { name: 'Parent' } }
        }
      ]);

      const result = await service.getTopNotes('user-1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Popular Note');
      expect(result[0].viewCount).toBe(100);
      expect(result[1].folderPath).toBe('Parent/SubFolder');
    });
  });

  describe('getMetadataDistribution', () => {
    it('should count by status', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        { metadata: { status: 'todo' } },
        { metadata: { status: 'todo' } },
        { metadata: { status: 'done' } },
        { metadata: {} }
      ]);

      const result = await service.getMetadataDistribution(null, 'status');

      expect(result).toContainEqual({ label: 'todo', count: 2 });
      expect(result).toContainEqual({ label: 'done', count: 1 });
      expect(result).toContainEqual({ label: 'Non défini', count: 1 });
    });

    it('should count tags correctly', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        { metadata: { tags: ['work', 'urgent'] } },
        { metadata: { tags: ['work'] } },
        { metadata: { tags: ['personal'] } }
      ]);

      const result = await service.getMetadataDistribution(null, 'tags');

      expect(result).toContainEqual({ label: 'work', count: 2 });
      expect(result).toContainEqual({ label: 'urgent', count: 1 });
      expect(result).toContainEqual({ label: 'personal', count: 1 });
    });
  });
});
```

### 4.2 Tests unitaires Frontend

```typescript
// apps/web/src/components/dashboard/__tests__/StatsCards.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCards } from '../StatsCards';
import { useAnalyticsStore } from '@/stores/analyticsStore';

vi.mock('@/stores/analyticsStore');

describe('StatsCards', () => {
  it('should render all stat cards', () => {
    (useAnalyticsStore as unknown as vi.Mock).mockReturnValue({
      overview: {
        totalNotes: 247,
        totalFolders: 32,
        activeUsers: 12,
        notesCreatedThisWeek: 18,
        notesModifiedThisWeek: 45,
        totalViews: 1500
      }
    });

    render(<StatsCards />);

    expect(screen.getByText('247')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('1 500')).toBeInTheDocument(); // Formaté
  });

  it('should return null when no overview', () => {
    (useAnalyticsStore as unknown as vi.Mock).mockReturnValue({
      overview: null
    });

    const { container } = render(<StatsCards />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/dashboard.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should be accessible from sidebar', async ({ page }) => {
    await page.click('text=Statistiques');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Notes')).toBeVisible();
    await expect(page.getByText('Dossiers')).toBeVisible();
    await expect(page.getByText('Utilisateurs actifs')).toBeVisible();
  });

  test('should toggle activity chart period', async ({ page }) => {
    await page.goto('/dashboard');

    // Par défaut sur 30 jours
    const btn30 = page.getByRole('button', { name: '30 jours' });
    const btn7 = page.getByRole('button', { name: '7 jours' });

    await expect(btn30).toHaveClass(/default/);
    
    // Basculer sur 7 jours
    await btn7.click();
    await expect(btn7).toHaveClass(/default/);
  });

  test('should display distribution charts', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Par statut')).toBeVisible();
    await expect(page.getByText('Top tags')).toBeVisible();
    await expect(page.getByText('Par priorité')).toBeVisible();
  });

  test('should navigate to note from top notes table', async ({ page }) => {
    await page.goto('/dashboard');

    // Attendre que les données soient chargées
    await page.waitForSelector('text=Notes les plus consultées');

    // Cliquer sur la première note si elle existe
    const firstNote = page.locator('.top-notes-table >> tr').first();
    if (await firstNote.isVisible()) {
      await firstNote.click();
      await expect(page).toHaveURL(/\/notes\/[a-z0-9]+$/);
    }
  });

  test('should filter by clicking on distribution chart', async ({ page }) => {
    await page.goto('/dashboard');

    // Attendre le chargement des graphiques
    await page.waitForSelector('text=Par statut');

    // Cliquer sur un élément de la légende
    const todoLegend = page.locator('text=todo').first();
    if (await todoLegend.isVisible()) {
      await todoLegend.click();
      await expect(page).toHaveURL(/\/search\?status=todo/);
    }
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Backend : Créer le module analytics**
    
    - `analytics.controller.ts`
    - `analytics.service.ts`
    - `analytics.schema.ts`
2. [ ] **Backend : Implémenter getOverview**
    
    - Requêtes parallèles avec Promise.all
    - Cache Redis (TTL 5min)
3. [ ] **Backend : Implémenter getActivityTimeline**
    
    - Requêtes SQL brutes pour GROUP BY date
    - Remplissage des jours manquants
4. [ ] **Backend : Implémenter getMetadataDistribution**
    
    - Support status, priority, tags
    - Agrégation JSONB
5. [ ] **Backend : Implémenter getTopNotes et getUserContributions**
    
    - Requêtes optimisées
6. [ ] **Shared-types : Interfaces analytics**
    
    - OverviewStats, ActivityDataPoint, etc.
7. [ ] **Frontend : Store analyticsStore**
    
    - Actions de chargement
    - Gestion du state
8. [ ] **Frontend : DashboardPage**
    
    - Layout responsive
    - Chargement parallèle
9. [ ] **Frontend : StatsCards**
    
    - 6 cartes avec icônes
10. [ ] **Frontend : ActivityChart**
    
    - Recharts LineChart
    - Toggle 7/30 jours
11. [ ] **Frontend : DistributionCharts**
    
    - Donut pour status/priority
    - Bar pour tags
    - Navigation vers recherche
12. [ ] **Frontend : TopNotesTable et UserContributionsTable**
    
    - Tables interactives
13. [ ] **Frontend : Modifier la Sidebar**
    
    - Ajouter le lien "Statistiques"
14. [ ] **Frontend : Ajouter la route /dashboard**
    
15. [ ] **Tests : Suite complète**
    

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Performance sur gros volumes|Moyenne|Moyen|Cache Redis + requêtes optimisées|
|Graphiques lents au rendu|Faible|Faible|Lazy loading + memoization|
|Données obsolètes (cache)|Faible|Faible|TTL court (5min) + refresh manuel|
|Pas de données pour nouveaux workspaces|Moyenne|Faible|Messages explicatifs|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Installer Recharts si pas déjà fait
cd /path/to/plumenote/apps/web
npm install recharts

# 2. Types partagés
cd ../../packages/shared-types
# Créer src/analytics.ts
npm run build

# 3. Backend
cd ../../apps/api
# Créer src/modules/analytics/
npm run test -- analytics

# 4. Frontend
cd ../web
# Créer src/components/dashboard/
# Créer src/stores/analyticsStore.ts
npm run test -- dashboard

# 5. Modifier la sidebar et les routes

# 6. Tests E2E
cd ../..
npm run test:e2e -- dashboard
```

### Points d'attention

- **Cache Redis** : Utiliser un TTL de 5 minutes pour ne pas surcharger la BDD
- **Requêtes parallèles** : Utiliser `Promise.all` pour charger toutes les sections
- **Recharts** : S'assurer que ResponsiveContainer a une hauteur définie
- **Formatage** : Utiliser `toLocaleString('fr-FR')` pour les nombres
- **Accessibilité** : Les graphiques doivent avoir des alternatives textuelles

### Dépendances npm à installer

```bash
# Frontend
npm install recharts  # Bibliothèque de graphiques
```

---

## 7. Annexes

### A. Arborescence des fichiers

```
plumenote/
├── packages/
│   └── shared-types/
│       └── src/
│           └── analytics.ts                    # [CRÉER] Types analytics
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── modules/
│   │           └── analytics/                  # [CRÉER] Nouveau module
│   │               ├── analytics.controller.ts
│   │               ├── analytics.service.ts
│   │               ├── analytics.schema.ts
│   │               └── __tests__/
│   │                   └── analytics.service.test.ts
│   │
│   └── web/
│       └── src/
│           ├── stores/
│           │   └── analyticsStore.ts           # [CRÉER]
│           ├── services/
│           │   └── analyticsApi.ts             # [CRÉER]
│           ├── components/
│           │   ├── dashboard/                  # [CRÉER] Nouveau dossier
│           │   │   ├── DashboardPage.tsx
│           │   │   ├── StatsCards.tsx
│           │   │   ├── ActivityChart.tsx
│           │   │   ├── DistributionCharts.tsx
│           │   │   ├── TopNotesTable.tsx
│           │   │   ├── UserContributionsTable.tsx
│           │   │   └── __tests__/
│           │   │       └── StatsCards.test.tsx
│           │   └── sidebar/
│           │       └── Sidebar.tsx             # [MODIFIER] Ajouter lien
│           └── App.tsx                         # [MODIFIER] Ajouter route
│
└── e2e/
    └── dashboard.spec.ts                       # [CRÉER]
```

### B. Couleurs des graphiques (Tailwind)

```css
/* Définir dans tailwind.config.js ou globals.css */
:root {
  --chart-1: 221.2 83.2% 53.3%;  /* Primary blue */
  --chart-2: 142.1 76.2% 36.3%;  /* Green */
  --chart-3: 47.9 95.8% 53.1%;   /* Yellow */
  --chart-4: 24.6 95% 53.1%;     /* Orange */
  --chart-5: 262.1 83.3% 57.8%;  /* Purple */
}
```

### C. Checklist de validation

- [ ] Le lien "Statistiques" apparaît dans la sidebar avec icône BarChart
- [ ] La page /dashboard charge sans erreur
- [ ] Les 6 cartes de stats affichent des valeurs
- [ ] Le graphique d'activité s'affiche avec les deux courbes
- [ ] Le toggle 7/30 jours fonctionne
- [ ] Les distributions status/priority s'affichent en donut
- [ ] Les tags s'affichent en bar chart horizontal
- [ ] Le clic sur une distribution redirige vers la recherche filtrée
- [ ] Le tableau des top notes est cliquable
- [ ] Le tableau des contributions affiche les avatars
- [ ] Les données sont mises en cache (vérifier avec Redis CLI)
- [ ] Les tests passent à 100%