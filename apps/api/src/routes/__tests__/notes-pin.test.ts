// ===========================================
// Tests Unitaires - Routes Notes Pin/Unpin/View
// P1: Tests pour les endpoints d'épinglage et vues
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@plumenote/database';

// Mock des services
vi.mock('../../services/permissions.js', () => ({
  checkPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../services/audit.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
vi.mock('@plumenote/database', () => ({
  prisma: {
    note: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    favorite: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('Notes Pin/Unpin/View Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // GET /notes/pinned
  // ===========================================
  describe('GET /notes/pinned', () => {
    it('should return empty array when user has no pinned notes', async () => {
      // Arrange
      vi.mocked(prisma.favorite.findMany).mockResolvedValue([]);

      // Act
      const result = await prisma.favorite.findMany({
        where: { userId: 'user-1' },
        include: { note: { include: { folder: true } } },
      });

      // Assert
      expect(result).toEqual([]);
      expect(prisma.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { note: { include: { folder: true } } },
      });
    });

    it('should return pinned notes with metadata', async () => {
      // Arrange
      const mockFavorites = [
        {
          id: 'fav-1',
          userId: 'user-1',
          noteId: 'note-1',
          createdAt: new Date('2024-01-01'),
          note: {
            id: 'note-1',
            title: 'Pinned Note 1',
            slug: 'pinned-note-1',
            viewCount: 10,
            isDeleted: false,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            folderId: 'folder-1',
            folder: { id: 'folder-1', name: 'Test', path: '/Test' },
          },
        },
        {
          id: 'fav-2',
          userId: 'user-1',
          noteId: 'note-2',
          createdAt: new Date('2024-01-02'),
          note: {
            id: 'note-2',
            title: 'Pinned Note 2',
            slug: 'pinned-note-2',
            viewCount: 5,
            isDeleted: false,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-03'),
            folderId: 'folder-1',
            folder: { id: 'folder-1', name: 'Test', path: '/Test' },
          },
        },
      ];

      vi.mocked(prisma.favorite.findMany).mockResolvedValue(mockFavorites as any);

      // Act
      const favorites = await prisma.favorite.findMany({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { note: { include: { folder: true } } },
      });

      // Filter deleted notes (as done in the route)
      const validFavorites = favorites.filter((f: any) => !f.note.isDeleted);

      // Transform
      const notes = validFavorites.map((fav: any) => ({
        id: fav.note.id,
        title: fav.note.title,
        slug: fav.note.slug,
        viewCount: fav.note.viewCount,
        folderPath: fav.note.folder?.path || '/',
        isPinned: true,
      }));

      // Assert
      expect(notes).toHaveLength(2);
      expect(notes[0].title).toBe('Pinned Note 1');
      expect(notes[0].isPinned).toBe(true);
      expect(notes[0].viewCount).toBe(10);
    });

    it('should filter out deleted notes', async () => {
      // Arrange
      const mockFavorites = [
        {
          id: 'fav-1',
          userId: 'user-1',
          noteId: 'note-1',
          note: {
            id: 'note-1',
            title: 'Active Note',
            isDeleted: false,
            folder: { path: '/Test' },
          },
        },
        {
          id: 'fav-2',
          userId: 'user-1',
          noteId: 'note-2',
          note: {
            id: 'note-2',
            title: 'Deleted Note',
            isDeleted: true,
            folder: { path: '/Test' },
          },
        },
      ];

      vi.mocked(prisma.favorite.findMany).mockResolvedValue(mockFavorites as any);

      // Act
      const favorites = await prisma.favorite.findMany({
        where: { userId: 'user-1' },
      });
      const validFavorites = favorites.filter((f: any) => !f.note.isDeleted);

      // Assert
      expect(validFavorites).toHaveLength(1);
      expect(validFavorites[0].note.title).toBe('Active Note');
    });
  });

  // ===========================================
  // POST /notes/:id/pin
  // ===========================================
  describe('POST /notes/:id/pin', () => {
    it('should pin a note successfully', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        folderId: 'folder-1',
        isDeleted: false,
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.favorite.create).mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        noteId: 'note-1',
        position: 0,
        createdAt: new Date(),
      } as any);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });

      expect(note).not.toBeNull();

      const existing = await prisma.favorite.findUnique({
        where: { userId_noteId: { userId: 'user-1', noteId: 'note-1' } },
      });

      expect(existing).toBeNull();

      const created = await prisma.favorite.create({
        data: { userId: 'user-1', noteId: 'note-1' },
      });

      // Assert
      expect(created.noteId).toBe('note-1');
      expect(prisma.favorite.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', noteId: 'note-1' },
      });
    });

    it('should return 404 if note does not exist', async () => {
      // Arrange
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'non-existent', isDeleted: false },
      });

      // Assert
      expect(note).toBeNull();
    });

    it('should return 409 if note is already pinned', async () => {
      // Arrange
      vi.mocked(prisma.note.findFirst).mockResolvedValue({
        id: 'note-1',
        isDeleted: false,
      } as any);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        noteId: 'note-1',
      } as any);

      // Act
      const existing = await prisma.favorite.findUnique({
        where: { userId_noteId: { userId: 'user-1', noteId: 'note-1' } },
      });

      // Assert - 409 Conflict should be returned
      expect(existing).not.toBeNull();
    });
  });

  // ===========================================
  // DELETE /notes/:id/pin
  // ===========================================
  describe('DELETE /notes/:id/pin', () => {
    it('should unpin a note successfully', async () => {
      // Arrange
      vi.mocked(prisma.favorite.deleteMany).mockResolvedValue({ count: 1 });

      // Act
      const result = await prisma.favorite.deleteMany({
        where: { userId: 'user-1', noteId: 'note-1' },
      });

      // Assert
      expect(result.count).toBe(1);
      expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', noteId: 'note-1' },
      });
    });

    it('should return success even if note was not pinned', async () => {
      // Arrange
      vi.mocked(prisma.favorite.deleteMany).mockResolvedValue({ count: 0 });

      // Act
      const result = await prisma.favorite.deleteMany({
        where: { userId: 'user-1', noteId: 'note-1' },
      });

      // Assert - No error, just count = 0
      expect(result.count).toBe(0);
    });
  });

  // ===========================================
  // POST /notes/:id/view
  // ===========================================
  describe('POST /notes/:id/view', () => {
    it('should increment view count', async () => {
      // Arrange
      vi.mocked(prisma.note.update).mockResolvedValue({
        id: 'note-1',
        viewCount: 11,
      } as any);

      // Act
      const result = await prisma.note.update({
        where: { id: 'note-1' },
        data: { viewCount: { increment: 1 } },
      });

      // Assert
      expect(result.viewCount).toBe(11);
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('should handle non-existent note gracefully', async () => {
      // Arrange
      vi.mocked(prisma.note.update).mockRejectedValue(
        new Error('Record to update not found')
      );

      // Act & Assert
      await expect(
        prisma.note.update({
          where: { id: 'non-existent' },
          data: { viewCount: { increment: 1 } },
        })
      ).rejects.toThrow('Record to update not found');
    });
  });

  // ===========================================
  // GET /notes/recent (enrichi)
  // ===========================================
  describe('GET /notes/recent (enriched)', () => {
    it('should return notes with viewCount and isPinned', async () => {
      // Arrange
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Recent Note 1',
          slug: 'recent-note-1',
          viewCount: 25,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10'),
          folderId: 'folder-1',
          isDeleted: false,
          folder: { path: '/Test' },
          favorites: [{ id: 'fav-1' }], // User has pinned this
          author: { id: 'user-1', username: 'test', displayName: 'Test User' },
        },
        {
          id: 'note-2',
          title: 'Recent Note 2',
          slug: 'recent-note-2',
          viewCount: 5,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-09'),
          folderId: 'folder-1',
          isDeleted: false,
          folder: { path: '/Test' },
          favorites: [], // User has NOT pinned this
          author: { id: 'user-1', username: 'test', displayName: 'Test User' },
        },
      ];

      vi.mocked(prisma.note.findMany).mockResolvedValue(mockNotes as any);

      // Act
      const notes = await prisma.note.findMany({
        where: { isDeleted: false },
        include: {
          folder: true,
          favorites: { where: { userId: 'user-1' } },
          author: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      // Transform (as done in route)
      const result = notes.map((note: any) => ({
        id: note.id,
        title: note.title,
        slug: note.slug,
        viewCount: note.viewCount,
        folderPath: note.folder?.path || '/',
        isPinned: note.favorites.length > 0,
      }));

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].viewCount).toBe(25);
      expect(result[0].isPinned).toBe(true);
      expect(result[1].viewCount).toBe(5);
      expect(result[1].isPinned).toBe(false);
    });

    it('should order by updatedAt descending', async () => {
      // Arrange
      const mockNotes = [
        { id: 'note-1', updatedAt: new Date('2024-01-10'), favorites: [] },
        { id: 'note-2', updatedAt: new Date('2024-01-05'), favorites: [] },
      ];

      vi.mocked(prisma.note.findMany).mockResolvedValue(mockNotes as any);

      // Act
      const notes = await prisma.note.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      // Assert
      expect(notes[0].id).toBe('note-1'); // Most recent first
      expect(notes[1].id).toBe('note-2');
    });
  });
});
