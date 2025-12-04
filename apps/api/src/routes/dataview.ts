// ===========================================
// Routes Dataview Queries (EP-009)
// US-090: Requêtes dynamiques type Dataview
// US-091: Blocs de requête dans les notes
// US-092: Vues personnalisées
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@collabnotes/database';
import { getEffectivePermissions } from '../services/permissions.js';

// Schema pour les requêtes Dataview
const dataviewQuerySchema = z.object({
  type: z.enum(['table', 'list', 'task', 'calendar']),
  from: z.enum(['notes', 'tags', 'folders']).default('notes'),
  where: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'in']),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })).optional(),
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }).optional(),
  limit: z.number().min(1).max(500).default(100),
  fields: z.array(z.string()).optional(), // Champs à afficher pour le type table
  groupBy: z.string().optional(),
});

type DataviewQuery = z.infer<typeof dataviewQuerySchema>;

export const dataviewRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  /**
   * POST /api/v1/dataview/query
   * US-090: Exécuter une requête Dataview
   */
  app.post('/query', {
    schema: {
      tags: ['Dataview'],
      summary: 'Execute dataview query',
      description: 'Execute a Dataview-style query on notes',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const parseResult = dataviewQuerySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        details: parseResult.error.flatten(),
      });
    }

    const query = parseResult.data;
    const userId = request.user.userId;

    // Récupérer les permissions
    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    try {
      const results = await executeDataviewQuery(query, accessibleFolderIds);
      return results;
    } catch (error) {
      return reply.status(400).send({
        error: 'QUERY_ERROR',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/v1/dataview/parse
   * Analyser une requête Dataview textuelle
   */
  app.post('/parse', {
    schema: {
      tags: ['Dataview'],
      summary: 'Parse dataview query string',
      description: 'Parse a Dataview query string into structured format',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { query } = request.body as { query: string };

    if (!query) {
      return reply.status(400).send({
        error: 'MISSING_QUERY',
        message: 'Query string is required',
      });
    }

    try {
      const parsed = parseDataviewQuery(query);
      return { success: true, query: parsed };
    } catch (error) {
      return reply.status(400).send({
        error: 'PARSE_ERROR',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/v1/dataview/tasks
   * US-090: Récupérer toutes les tâches des notes
   */
  app.get('/tasks', {
    schema: {
      tags: ['Dataview'],
      summary: 'Get all tasks from notes',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['all', 'completed', 'pending'] },
          folderId: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    const { status = 'all', folderId } = request.query as {
      status?: 'all' | 'completed' | 'pending';
      folderId?: string;
    };
    const userId = request.user.userId;

    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    const where: Record<string, unknown> = {
      isDeleted: false,
      folderId: folderId ? folderId : { in: accessibleFolderIds },
    };

    const notes = await prisma.note.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        folder: { select: { path: true, name: true } },
      },
    });

    // Extraire les tâches du contenu
    const allTasks: {
      noteId: string;
      noteTitle: string;
      folderPath: string;
      text: string;
      completed: boolean;
      line: number;
    }[] = [];

    const taskRegex = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/gm;

    for (const note of notes) {
      let match;
      let lineNumber = 0;

      const lines = note.content.split('\n');
      for (const line of lines) {
        lineNumber++;
        taskRegex.lastIndex = 0;
        match = taskRegex.exec(line);
        if (match) {
          const completed = match[2].toLowerCase() === 'x';

          if (status === 'all' ||
              (status === 'completed' && completed) ||
              (status === 'pending' && !completed)) {
            allTasks.push({
              noteId: note.id,
              noteTitle: note.title,
              folderPath: `${note.folder.path}/${note.folder.name}`,
              text: match[3].trim(),
              completed,
              line: lineNumber,
            });
          }
        }
      }
    }

    return {
      tasks: allTasks,
      count: allTasks.length,
      stats: {
        total: allTasks.length,
        completed: allTasks.filter((t) => t.completed).length,
        pending: allTasks.filter((t) => !t.completed).length,
      },
    };
  });

  /**
   * GET /api/v1/dataview/calendar
   * US-092: Vue calendrier des notes par date
   */
  app.get('/calendar', {
    schema: {
      tags: ['Dataview'],
      summary: 'Get calendar view data',
      security: [{ cookieAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          year: { type: 'number' },
          month: { type: 'number' },
          dateField: { type: 'string', enum: ['createdAt', 'updatedAt'] },
        },
      },
    },
  }, async (request) => {
    const {
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      dateField = 'updatedAt',
    } = request.query as {
      year?: number;
      month?: number;
      dateField?: 'createdAt' | 'updatedAt';
    };
    const userId = request.user.userId;

    const permissions = await getEffectivePermissions(userId, 'FOLDER');
    const accessibleFolderIds = permissions
      .filter((p) => p.level !== 'NONE')
      .map((p) => p.resourceId);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const notes = await prisma.note.findMany({
      where: {
        isDeleted: false,
        folderId: { in: accessibleFolderIds },
        [dateField]: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { [dateField]: 'asc' },
    });

    // Grouper par jour
    const calendar: Record<string, { date: string; notes: typeof notes }> = {};

    for (const note of notes) {
      const date = (note[dateField] as Date).toISOString().split('T')[0];
      if (!calendar[date]) {
        calendar[date] = { date, notes: [] };
      }
      calendar[date].notes.push(note);
    }

    return {
      year,
      month,
      days: Object.values(calendar),
    };
  });
};

/**
 * Exécute une requête Dataview structurée
 */
async function executeDataviewQuery(
  query: DataviewQuery,
  accessibleFolderIds: string[]
) {
  const { type, from, where: conditions, sort, limit, fields, groupBy } = query;

  // Construire les conditions WHERE
  const prismaWhere: Record<string, unknown> = {
    isDeleted: false,
    folderId: { in: accessibleFolderIds },
  };

  if (conditions) {
    for (const condition of conditions) {
      const { field, operator, value } = condition;

      // Mapper les champs aux colonnes Prisma
      const fieldMap: Record<string, string> = {
        title: 'title',
        content: 'content',
        created: 'createdAt',
        updated: 'updatedAt',
        folder: 'folderId',
        author: 'authorId',
      };

      const dbField = fieldMap[field] || field;

      switch (operator) {
        case 'eq':
          prismaWhere[dbField] = value;
          break;
        case 'ne':
          prismaWhere[dbField] = { not: value };
          break;
        case 'gt':
          prismaWhere[dbField] = { gt: value };
          break;
        case 'gte':
          prismaWhere[dbField] = { gte: value };
          break;
        case 'lt':
          prismaWhere[dbField] = { lt: value };
          break;
        case 'lte':
          prismaWhere[dbField] = { lte: value };
          break;
        case 'contains':
          prismaWhere[dbField] = { contains: value, mode: 'insensitive' };
          break;
        case 'startsWith':
          prismaWhere[dbField] = { startsWith: value, mode: 'insensitive' };
          break;
        case 'endsWith':
          prismaWhere[dbField] = { endsWith: value, mode: 'insensitive' };
          break;
        case 'in':
          prismaWhere[dbField] = { in: value };
          break;
      }
    }
  }

  // Requête principale
  const notes = await prisma.note.findMany({
    where: prismaWhere,
    include: {
      folder: { select: { name: true, path: true } },
      author: { select: { displayName: true } },
      tags: { include: { tag: true } },
    },
    orderBy: sort ? { [sort.field === 'created' ? 'createdAt' : sort.field === 'updated' ? 'updatedAt' : sort.field]: sort.order } : { updatedAt: 'desc' },
    take: limit,
  });

  // Formater les résultats selon le type
  switch (type) {
    case 'table':
      return {
        type: 'table',
        headers: fields || ['title', 'folder', 'updated'],
        rows: notes.map((note) => ({
          id: note.id,
          title: note.title,
          slug: note.slug,
          folder: `${note.folder.path}/${note.folder.name}`,
          author: note.author.displayName,
          tags: note.tags.map((t) => t.tag.name),
          created: note.createdAt.toISOString(),
          updated: note.updatedAt.toISOString(),
        })),
        count: notes.length,
      };

    case 'list':
      return {
        type: 'list',
        items: notes.map((note) => ({
          id: note.id,
          title: note.title,
          slug: note.slug,
          folder: `${note.folder.path}/${note.folder.name}`,
        })),
        count: notes.length,
      };

    case 'task':
      // Extraire les tâches
      const tasks: { noteId: string; noteTitle: string; text: string; completed: boolean }[] = [];
      const taskRegex = /^(\s*)-\s*\[([ xX])\]\s*(.+)$/gm;

      for (const note of notes) {
        let match;
        while ((match = taskRegex.exec(note.content)) !== null) {
          tasks.push({
            noteId: note.id,
            noteTitle: note.title,
            text: match[3].trim(),
            completed: match[2].toLowerCase() === 'x',
          });
        }
      }

      return {
        type: 'task',
        tasks,
        count: tasks.length,
      };

    case 'calendar':
      // Grouper par date
      const byDate = new Map<string, typeof notes>();
      for (const note of notes) {
        const date = note.updatedAt.toISOString().split('T')[0];
        if (!byDate.has(date)) {
          byDate.set(date, []);
        }
        byDate.get(date)!.push(note);
      }

      return {
        type: 'calendar',
        days: Array.from(byDate.entries()).map(([date, dayNotes]) => ({
          date,
          count: dayNotes.length,
          notes: dayNotes.map((n) => ({ id: n.id, title: n.title })),
        })),
      };

    default:
      return { type, items: notes, count: notes.length };
  }
}

/**
 * Parse une requête Dataview textuelle
 * Exemple: "TABLE title, updated FROM notes WHERE folder = 'Projects' SORT updated DESC LIMIT 10"
 */
function parseDataviewQuery(queryStr: string): DataviewQuery {
  const query: DataviewQuery = {
    type: 'list',
    from: 'notes',
    limit: 100,
  };

  const normalized = queryStr.trim().toUpperCase();

  // Type de requête
  if (normalized.startsWith('TABLE')) {
    query.type = 'table';
    // Extraire les champs
    const fieldsMatch = queryStr.match(/^TABLE\s+([^FROM]+)/i);
    if (fieldsMatch) {
      query.fields = fieldsMatch[1].split(',').map((f) => f.trim().toLowerCase());
    }
  } else if (normalized.startsWith('LIST')) {
    query.type = 'list';
  } else if (normalized.startsWith('TASK')) {
    query.type = 'task';
  } else if (normalized.startsWith('CALENDAR')) {
    query.type = 'calendar';
  }

  // Source (FROM)
  const fromMatch = queryStr.match(/FROM\s+(\w+)/i);
  if (fromMatch) {
    const source = fromMatch[1].toLowerCase();
    if (source === 'notes' || source === 'tags' || source === 'folders') {
      query.from = source;
    }
  }

  // Conditions (WHERE)
  const whereMatch = queryStr.match(/WHERE\s+(.+?)(?=SORT|LIMIT|GROUP|$)/i);
  if (whereMatch) {
    query.where = parseWhereClause(whereMatch[1]);
  }

  // Tri (SORT)
  const sortMatch = queryStr.match(/SORT\s+(\w+)\s*(ASC|DESC)?/i);
  if (sortMatch) {
    query.sort = {
      field: sortMatch[1].toLowerCase(),
      order: (sortMatch[2]?.toLowerCase() as 'asc' | 'desc') || 'desc',
    };
  }

  // Limite
  const limitMatch = queryStr.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    query.limit = Math.min(parseInt(limitMatch[1], 10), 500);
  }

  // Groupement
  const groupMatch = queryStr.match(/GROUP\s+BY\s+(\w+)/i);
  if (groupMatch) {
    query.groupBy = groupMatch[1].toLowerCase();
  }

  return query;
}

/**
 * Parse une clause WHERE
 */
function parseWhereClause(clause: string): DataviewQuery['where'] {
  const conditions: DataviewQuery['where'] = [];

  // Séparer par AND (OR non supporté pour simplicité)
  const parts = clause.split(/\s+AND\s+/i);

  for (const part of parts) {
    // Pattern: field operator value
    const match = part.match(/(\w+)\s*(=|!=|>|>=|<|<=|contains|startsWith|endsWith)\s*['"]?([^'"]+)['"]?/i);
    if (match) {
      const [, field, op, value] = match;

      const operatorMap: Record<string, DataviewQuery['where'][0]['operator']> = {
        '=': 'eq',
        '!=': 'ne',
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
        'contains': 'contains',
        'startswith': 'startsWith',
        'endswith': 'endsWith',
      };

      conditions.push({
        field: field.toLowerCase(),
        operator: operatorMap[op.toLowerCase()] || 'eq',
        value: value.trim(),
      });
    }
  }

  return conditions;
}
