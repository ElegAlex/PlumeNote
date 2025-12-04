// ===========================================
// Serveur de Collaboration Yjs/Hocuspocus
// (EP-005 - Sprint 3-4)
// ===========================================

import 'dotenv/config';
import { Hocuspocus } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Throttle } from '@hocuspocus/extension-throttle';
import { prisma } from '@collabnotes/database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = parseInt(process.env.YJS_PORT || '1234', 10);

interface JWTPayload {
  userId: string;
  username: string;
}

// Connected users per document
const documentUsers = new Map<string, Map<string, { userId: string; username: string; color: string }>>();

// Generate random color for user cursor
function generateColor(): string {
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
    '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFC107', '#FF9800', '#FF5722', '#795548',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const server = new Hocuspocus({
  port: PORT,

  extensions: [
    new Logger({
      log: (message) => {
        console.log(`[Hocuspocus] ${message}`);
      },
    }),
    new Throttle({
      throttle: 15,
      banTime: 5,
    }),
  ],

  // Authentication
  async onAuthenticate(data) {
    const { token } = data;

    if (!token) {
      throw new Error('Token manquant');
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new Error('Utilisateur invalide');
      }

      return {
        userId: user.id,
        username: user.displayName || user.username,
      };
    } catch (error) {
      throw new Error('Token invalide');
    }
  },

  // Authorization - check document access
  async onLoadDocument(data) {
    const { documentName, context } = data;
    const noteId = documentName.replace('note:', '');

    // Check if user has access to the note
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        folder: {
          include: {
            permissions: {
              where: { userId: context.userId },
            },
          },
        },
      },
    });

    if (!note) {
      throw new Error('Note non trouvée');
    }

    // Check permission (owner or has folder permission)
    const hasAccess =
      note.createdById === context.userId ||
      note.folder?.permissions.some((p) => p.userId === context.userId && p.canRead);

    if (!hasAccess) {
      throw new Error('Accès refusé');
    }

    // Load initial content from database
    if (note.content) {
      // Content will be synced from the first client
    }

    return data.document;
  },

  // Connection handling
  async onConnect(data) {
    const { documentName, context, connection } = data;

    // Initialize document users map
    if (!documentUsers.has(documentName)) {
      documentUsers.set(documentName, new Map());
    }

    const users = documentUsers.get(documentName)!;
    const color = generateColor();

    users.set(connection.id, {
      userId: context.userId,
      username: context.username,
      color,
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'note.collaborate.join',
        userId: context.userId,
        targetType: 'note',
        targetId: documentName.replace('note:', ''),
        details: { connectionId: connection.id },
      },
    });

    console.log(`[Collaboration] ${context.username} joined ${documentName}`);
  },

  // Disconnection handling
  async onDisconnect(data) {
    const { documentName, context, connection } = data;

    const users = documentUsers.get(documentName);
    if (users) {
      users.delete(connection.id);
      if (users.size === 0) {
        documentUsers.delete(documentName);
      }
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: 'note.collaborate.leave',
        userId: context.userId,
        targetType: 'note',
        targetId: documentName.replace('note:', ''),
        details: { connectionId: connection.id },
      },
    });

    console.log(`[Collaboration] ${context.username} left ${documentName}`);
  },

  // Save document to database
  async onStoreDocument(data) {
    const { documentName, document, context } = data;
    const noteId = documentName.replace('note:', '');

    try {
      // Get HTML content from Yjs document
      // The actual content extraction depends on y-prosemirror
      // For now, we'll store the Yjs update
      const update = Buffer.from(document.encodeStateAsUpdate());

      await prisma.note.update({
        where: { id: noteId },
        data: {
          yjsState: update,
          modifiedBy: context.userId,
          updatedAt: new Date(),
        },
      });

      console.log(`[Storage] Saved ${documentName}`);
    } catch (error) {
      console.error(`[Storage] Error saving ${documentName}:`, error);
    }
  },
});

// Start server
server.listen().then(() => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔄 CollabNotes Yjs Server                                ║
║                                                            ║
║   WebSocket: ws://localhost:${PORT}                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down...');
  await server.destroy();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] Shutting down...');
  await server.destroy();
  await prisma.$disconnect();
  process.exit(0);
});
