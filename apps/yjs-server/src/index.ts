// ===========================================
// Serveur de Collaboration Yjs/Hocuspocus
// (EP-005 - Sprint 5)
// US-029: Connexion WebSocket avec authentification JWT
// US-033: Persistance Y.Doc en base
// SPEC-004: Endpoint /health pour Docker health checks
// ===========================================

import 'dotenv/config';
import { createServer as createHttpServer } from 'http';
import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Logger } from '@hocuspocus/extension-logger';
import { Throttle } from '@hocuspocus/extension-throttle';
import { prisma } from '@plumenote/database';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = parseInt(process.env.YJS_PORT || '1234', 10);
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '3003', 10);

interface JWTPayload {
  userId: string;
  username: string;
}

// Connected users per document (for awareness tracking)
const documentUsers = new Map<string, Map<string, { userId: string; username: string; color: string }>>();

// Palette de couleurs pour les curseurs collaboratifs
const CURSOR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548',
];

// Generate deterministic color based on user ID
function generateColor(userId: string): string {
  const defaultColor = '#2196F3';
  if (!userId || userId === 'anonymous') {
    return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)] ?? defaultColor;
  }
  // Hash simple pour couleur déterministe par utilisateur
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length] ?? defaultColor;
}

// Extract note ID from document name (format: "note:UUID")
function extractNoteId(documentName: string): string | null {
  if (!documentName || !documentName.startsWith('note:')) return null;
  const noteId = documentName.replace('note:', '');
  // Validate UUID format
  if (noteId.length < 20) return null;
  return noteId;
}

const server = new Hocuspocus({
  port: PORT,

  // Délai avant sauvegarde (debounce)
  debounce: 2000,
  // Sauvegarde forcée maximum toutes les 10s
  maxDebounce: 10000,

  extensions: [
    new Logger({
      log: (message) => {
        console.log(`[Hocuspocus] ${message}`);
      },
    }),
    new Throttle({
      throttle: 100,  // 100ms between connections from same IP
      banTime: 30,    // 30 second ban for abusive clients
    }),
    // Extension Database pour charger/sauvegarder le yjsState (US-033)
    new Database({
      // Charger le document depuis la base de données
      fetch: async ({ documentName }) => {
        const noteId = extractNoteId(documentName);
        if (!noteId) return null;

        try {
          const note = await prisma.note.findUnique({
            where: { id: noteId },
            select: { yjsState: true, content: true },
          });

          if (!note) {
            console.log(`[Database] Note ${noteId} not found`);
            return null;
          }

          // Si on a un état Yjs, le retourner
          if (note.yjsState) {
            console.log(`[Database] Loaded Y.Doc state for ${documentName}`);
            return new Uint8Array(note.yjsState);
          }

          // Sinon, initialiser le document avec le contenu HTML existant
          console.log(`[Database] Initializing Y.Doc from HTML for ${documentName}`);
          return null; // Le contenu sera initialisé côté client
        } catch (error) {
          console.error(`[Database] Error fetching ${documentName}:`, error);
          return null;
        }
      },

      // Sauvegarder le document dans la base de données
      store: async ({ documentName, state, context }) => {
        const noteId = extractNoteId(documentName);
        if (!noteId) return;

        try {
          await prisma.note.update({
            where: { id: noteId },
            data: {
              yjsState: Buffer.from(state),
              modifiedBy: context.userId !== 'anonymous' ? context.userId : undefined,
              updatedAt: new Date(),
            },
          });

          console.log(`[Database] Saved Y.Doc state for ${documentName}`);
        } catch (error) {
          console.error(`[Database] Error storing ${documentName}:`, error);
        }
      },
    }),
  ],

  // Authentication - vérification JWT (US-029)
  async onAuthenticate(data) {
    const { token, documentName } = data;
    const noteId = extractNoteId(documentName);

    // En développement, permettre l'accès anonyme si pas de token
    if (!token) {
      console.log(`[Auth] Anonymous access to ${documentName}`);
      return {
        userId: 'anonymous',
        username: 'Anonymous',
        canWrite: true, // En dev, permettre l'écriture
      };
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Vérifier que l'utilisateur existe et est actif
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true, isActive: true },
      });

      if (!user || !user.isActive) {
        console.log(`[Auth] User ${payload.userId} not found or inactive`);
        throw new Error('User not found or inactive');
      }

      // Vérifier les permissions sur la note si noteId existe
      let canWrite = true;
      let isPersonalNote = false;
      if (noteId) {
        const note = await prisma.note.findUnique({
          where: { id: noteId },
          include: {
            folder: {
              include: {
                permissions: {
                  where: {
                    OR: [
                      { principalId: user.id },
                      { principalType: 'ROLE' },
                    ]
                  },
                },
              },
            },
          },
        });

        if (note) {
          // Vérifier si c'est une note personnelle
          if (note.isPersonal) {
            isPersonalNote = true;
            // Seul le propriétaire peut accéder à une note personnelle
            if (note.ownerId !== user.id) {
              console.log(`[Auth] Access denied to personal note ${noteId} for user ${user.id}`);
              throw new Error('Access denied to personal note');
            }
            canWrite = true;
          } else if (note.authorId === user.id) {
            // Propriétaire de note collaborative a tous les droits
            canWrite = true;
          } else {
            // Vérifier permissions du dossier pour notes collaboratives
            const permission = note.folder?.permissions.find(
              p => p.principalId === user.id && p.principalType === 'USER'
            );
            canWrite = permission ? ['WRITE', 'ADMIN'].includes(permission.level) : false;
          }
        }
      }

      console.log(`[Auth] User ${user.displayName || user.username} authenticated (canWrite: ${canWrite}, personal: ${isPersonalNote})`);

      return {
        userId: user.id,
        username: user.displayName || user.username,
        canWrite,
        isPersonalNote,
      };
    } catch (error) {
      // En développement, permettre l'accès anonyme
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] Fallback to anonymous access (dev mode)`);
        return {
          userId: 'anonymous',
          username: 'Anonymous',
          canWrite: true,
        };
      }
      throw error;
    }
  },

  // Connection handling (US-031: tracking des collaborateurs)
  async onConnect(data) {
    const { documentName, context } = data;

    // Valider le format du nom de document
    const noteId = extractNoteId(documentName);
    if (!noteId) {
      console.log(`[Connect] Rejected invalid document name: "${documentName}"`);
      throw new Error('Invalid document name format');
    }

    // Pour les notes personnelles, refuser les connexions multiples
    // (la collaboration temps réel est désactivée)
    if (context.isPersonalNote) {
      const existingUsers = documentUsers.get(documentName);
      if (existingUsers && existingUsers.size > 0) {
        // Vérifier si c'est le même utilisateur (reconnexion autorisée)
        const existingUserIds = Array.from(existingUsers.values()).map(u => u.userId);
        if (!existingUserIds.includes(context.userId)) {
          console.log(`[Connect] Rejected connection to personal note: another user connected`);
          throw new Error('Personal notes do not support collaboration');
        }
      }
    }
  },

  // Called after connection is established (US-034: permissions)
  async connected(data) {
    const { documentName, context, socketId, connectionInstance } = data;

    // Initialiser la map des utilisateurs pour ce document
    if (!documentUsers.has(documentName)) {
      documentUsers.set(documentName, new Map());
    }

    const users = documentUsers.get(documentName)!;
    const color = generateColor(context.userId);

    users.set(socketId, {
      userId: context.userId || 'anonymous',
      username: context.username || 'Anonymous',
      color,
    });

    const userCount = users.size;
    console.log(`[Connect] ${context.username || 'Anonymous'} joined ${documentName} (canWrite: ${context.canWrite}, personal: ${context.isPersonalNote}, ${userCount} users)`);

    // US-034: Envoyer les permissions au client via stateless message
    connectionInstance.sendStateless(JSON.stringify({
      type: 'permissions',
      canWrite: context.canWrite ?? true,
      userId: context.userId,
      username: context.username,
      isPersonalNote: context.isPersonalNote ?? false,
    }));
  },

  // Disconnection handling (US-035: gestion déconnexion)
  async onDisconnect(data) {
    const { documentName, context, socketId } = data;

    const noteId = extractNoteId(documentName);
    if (!noteId) return;

    const users = documentUsers.get(documentName);
    if (users) {
      users.delete(socketId);
      const userCount = users.size;

      if (userCount === 0) {
        documentUsers.delete(documentName);
      }

      console.log(`[Disconnect] ${context?.username || 'Anonymous'} left ${documentName} (${userCount} users)`);
    }
  },

  // Gestion des statuts de documents
  async onStateless({ documentName, payload }) {
    // Permet de récupérer des infos sur le document sans se connecter
    const noteId = extractNoteId(documentName);
    if (!noteId) return;

    const users = documentUsers.get(documentName);
    return JSON.stringify({
      userCount: users?.size || 0,
      users: users ? Array.from(users.values()) : [],
    });
  },
});

// ===========================================
// Health Check HTTP Server (SPEC-004)
// Serveur HTTP séparé pour les health checks Docker
// ===========================================
const healthServer = createHttpServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'yjs-server',
      port: PORT,
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start servers
server.listen().then(() => {
  // Start health check server on separate port
  healthServer.listen(HEALTH_PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔄 PlumeNote Yjs Server                                  ║
║                                                            ║
║   WebSocket: ws://localhost:${PORT}                           ║
║   Health:    http://localhost:${HEALTH_PORT}/health            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down...');
  healthServer.close();
  await server.destroy();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] Shutting down...');
  healthServer.close();
  await server.destroy();
  await prisma.$disconnect();
  process.exit(0);
});
