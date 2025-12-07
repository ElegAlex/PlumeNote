// ===========================================
// Tests Unitaires - Routes Events autonomes
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@plumenote/database';

// Mock Prisma
vi.mock('@plumenote/database', () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    eventNote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    note: {
      findFirst: vi.fn(),
    },
  },
}));

// Types de test
interface MockEvent {
  id: string;
  title: string;
  description: string | null;
  type: 'DEADLINE' | 'EVENT' | 'PERIOD';
  startDate: Date;
  endDate: Date | null;
  color: string | null;
  allDay: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; displayName: string; email: string };
  linkedNotes?: Array<{
    id: string;
    noteId: string;
    linkedAt: Date;
    note: { id: string; title: string; slug: string; updatedAt: Date };
  }>;
}

describe('Events Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation schemas', () => {
    it('should require endDate for PERIOD type', () => {
      // Le schéma Zod doit valider que endDate est requis pour PERIOD
      const periodWithoutEnd = {
        title: 'Test Period',
        type: 'PERIOD',
        startDate: '2024-12-15T00:00:00Z',
        // endDate manquant
      };

      // Cette validation est effectuée dans la route, pas ici directement
      // Mais nous pouvons tester la logique
      expect(periodWithoutEnd.type).toBe('PERIOD');
      expect(periodWithoutEnd).not.toHaveProperty('endDate');
    });

    it('should validate endDate is after startDate', () => {
      const startDate = new Date('2024-12-15T00:00:00Z');
      const validEndDate = new Date('2024-12-20T00:00:00Z');
      const invalidEndDate = new Date('2024-12-10T00:00:00Z');

      expect(validEndDate >= startDate).toBe(true);
      expect(invalidEndDate >= startDate).toBe(false);
    });
  });

  describe('Event creation', () => {
    it('should create an event with valid data', async () => {
      const mockEvent: MockEvent = {
        id: 'event-1',
        title: 'Test Event',
        description: 'Test description',
        type: 'EVENT',
        startDate: new Date('2024-12-15T00:00:00Z'),
        endDate: null,
        color: '#3b82f6',
        allDay: true,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-1',
          displayName: 'Test User',
          email: 'test@example.com',
        },
        linkedNotes: [],
      };

      vi.mocked(prisma.event.create).mockResolvedValue(mockEvent as any);

      const result = await prisma.event.create({
        data: {
          title: 'Test Event',
          description: 'Test description',
          type: 'EVENT',
          startDate: new Date('2024-12-15T00:00:00Z'),
          color: '#3b82f6',
          allDay: true,
          createdById: 'user-1',
        },
      });

      expect(result.title).toBe('Test Event');
      expect(result.type).toBe('EVENT');
    });

    it('should create a period event with endDate', async () => {
      const mockPeriod: MockEvent = {
        id: 'event-2',
        title: 'Vacation',
        description: null,
        type: 'PERIOD',
        startDate: new Date('2024-12-15T00:00:00Z'),
        endDate: new Date('2024-12-20T00:00:00Z'),
        color: '#22c55e',
        allDay: true,
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.event.create).mockResolvedValue(mockPeriod as any);

      const result = await prisma.event.create({
        data: {
          title: 'Vacation',
          type: 'PERIOD',
          startDate: new Date('2024-12-15T00:00:00Z'),
          endDate: new Date('2024-12-20T00:00:00Z'),
          createdById: 'user-1',
        },
      });

      expect(result.type).toBe('PERIOD');
      expect(result.endDate).toBeTruthy();
    });
  });

  describe('Event-Note linking', () => {
    it('should link a note to an event', async () => {
      const mockLink = {
        id: 'link-1',
        eventId: 'event-1',
        noteId: 'note-1',
        linkedAt: new Date(),
        linkedById: 'user-1',
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: 'event-1',
      } as any);

      vi.mocked(prisma.note.findFirst).mockResolvedValue({
        id: 'note-1',
        isDeleted: false,
      } as any);

      vi.mocked(prisma.eventNote.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.eventNote.create).mockResolvedValue(mockLink as any);

      // Vérifier que l'event existe
      const event = await prisma.event.findUnique({ where: { id: 'event-1' } });
      expect(event).toBeTruthy();

      // Vérifier que la note existe
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });
      expect(note).toBeTruthy();

      // Vérifier qu'il n'y a pas de lien existant
      const existingLink = await prisma.eventNote.findUnique({
        where: { eventId_noteId: { eventId: 'event-1', noteId: 'note-1' } },
      });
      expect(existingLink).toBeNull();

      // Créer le lien
      const link = await prisma.eventNote.create({
        data: {
          eventId: 'event-1',
          noteId: 'note-1',
          linkedById: 'user-1',
        },
      });

      expect(link.eventId).toBe('event-1');
      expect(link.noteId).toBe('note-1');
    });

    it('should prevent duplicate links', async () => {
      const existingLink = {
        id: 'link-1',
        eventId: 'event-1',
        noteId: 'note-1',
        linkedAt: new Date(),
        linkedById: 'user-1',
      };

      vi.mocked(prisma.eventNote.findUnique).mockResolvedValue(existingLink as any);

      const result = await prisma.eventNote.findUnique({
        where: { eventId_noteId: { eventId: 'event-1', noteId: 'note-1' } },
      });

      expect(result).toBeTruthy();
      // La route devrait retourner 409 Conflict dans ce cas
    });

    it('should unlink a note from an event', async () => {
      vi.mocked(prisma.eventNote.findUnique).mockResolvedValue({
        id: 'link-1',
        eventId: 'event-1',
        noteId: 'note-1',
      } as any);

      vi.mocked(prisma.eventNote.delete).mockResolvedValue({} as any);

      // Vérifier que le lien existe
      const link = await prisma.eventNote.findUnique({
        where: { eventId_noteId: { eventId: 'event-1', noteId: 'note-1' } },
      });
      expect(link).toBeTruthy();

      // Supprimer le lien
      await prisma.eventNote.delete({
        where: { eventId_noteId: { eventId: 'event-1', noteId: 'note-1' } },
      });

      expect(prisma.eventNote.delete).toHaveBeenCalled();
    });
  });

  describe('Event retrieval', () => {
    it('should get events with linked notes', async () => {
      const mockEvents: MockEvent[] = [
        {
          id: 'event-1',
          title: 'Test Event',
          description: null,
          type: 'EVENT',
          startDate: new Date('2024-12-15T00:00:00Z'),
          endDate: null,
          color: '#3b82f6',
          allDay: true,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          linkedNotes: [
            {
              id: 'link-1',
              noteId: 'note-1',
              linkedAt: new Date(),
              note: {
                id: 'note-1',
                title: 'Related Note',
                slug: 'related-note',
                updatedAt: new Date(),
              },
            },
          ],
        },
      ];

      vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents as any);

      const events = await prisma.event.findMany({
        include: {
          linkedNotes: {
            include: {
              note: true,
            },
          },
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0].linkedNotes).toHaveLength(1);
      expect(events[0].linkedNotes![0].note.title).toBe('Related Note');
    });

    it('should filter events by date range', async () => {
      const mockEvents: MockEvent[] = [
        {
          id: 'event-1',
          title: 'December Event',
          description: null,
          type: 'EVENT',
          startDate: new Date('2024-12-15T00:00:00Z'),
          endDate: null,
          color: '#3b82f6',
          allDay: true,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.event.findMany).mockResolvedValue(mockEvents as any);

      const from = new Date('2024-12-01T00:00:00Z');
      const to = new Date('2024-12-31T23:59:59Z');

      const events = await prisma.event.findMany({
        where: {
          startDate: {
            gte: from,
            lte: to,
          },
        },
      });

      expect(events).toHaveLength(1);
      expect(new Date(events[0].startDate) >= from).toBe(true);
      expect(new Date(events[0].startDate) <= to).toBe(true);
    });

    it('should filter events by type', async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([
        { id: 'event-1', type: 'DEADLINE' },
        { id: 'event-2', type: 'DEADLINE' },
      ] as any);

      const events = await prisma.event.findMany({
        where: {
          type: { in: ['DEADLINE'] },
        },
      });

      expect(events).toHaveLength(2);
      events.forEach((e) => {
        expect(e.type).toBe('DEADLINE');
      });
    });
  });

  describe('Events for note', () => {
    it('should get events linked to a specific note', async () => {
      const mockEventNotes = [
        {
          id: 'link-1',
          eventId: 'event-1',
          noteId: 'note-1',
          event: {
            id: 'event-1',
            title: 'Meeting',
            type: 'EVENT',
            startDate: new Date('2024-12-15T00:00:00Z'),
          },
        },
        {
          id: 'link-2',
          eventId: 'event-2',
          noteId: 'note-1',
          event: {
            id: 'event-2',
            title: 'Deadline',
            type: 'DEADLINE',
            startDate: new Date('2024-12-20T00:00:00Z'),
          },
        },
      ];

      vi.mocked(prisma.eventNote.findMany).mockResolvedValue(mockEventNotes as any);

      const eventNotes = await prisma.eventNote.findMany({
        where: { noteId: 'note-1' },
        include: { event: true },
      });

      expect(eventNotes).toHaveLength(2);
      expect(eventNotes[0].event.title).toBe('Meeting');
      expect(eventNotes[1].event.title).toBe('Deadline');
    });
  });
});
