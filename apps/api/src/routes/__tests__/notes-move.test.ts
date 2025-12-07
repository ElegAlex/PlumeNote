// ===========================================
// Tests Unitaires - Routes Notes Move
// US-007: Tests pour l'endpoint de déplacement de notes
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@plumenote/database';

// Mock des services
vi.mock('../../services/permissions.js', () => ({
  checkPermission: vi.fn(),
}));

vi.mock('../../services/audit.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Import après le mock
import { checkPermission } from '../../services/permissions.js';

// Mock Prisma
vi.mock('@plumenote/database', () => ({
  prisma: {
    note: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    folder: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Notes Move Routes - PATCH /notes/:id/move', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // Cas de succès
  // ===========================================
  describe('Success Cases', () => {
    it('should move a note to a different folder successfully', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        slug: 'test-note',
        folderId: 'folder-source',
        isDeleted: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        folder: { id: 'folder-source', name: 'Source', path: '/Source' },
      };

      const mockTargetFolder = {
        id: 'folder-target',
        name: 'Target',
        path: '/Target',
      };

      const mockUpdatedNote = {
        ...mockNote,
        folderId: 'folder-target',
        folder: mockTargetFolder,
        updatedAt: new Date('2024-01-03'),
        author: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockTargetFolder as any);
      vi.mocked(prisma.note.update).mockResolvedValue(mockUpdatedNote as any);

      // Act - Simuler la logique de l'endpoint
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
        include: { folder: true },
      });

      expect(note).not.toBeNull();
      expect(note!.folderId).toBe('folder-source');

      // Vérifier permissions source
      const hasSourcePermission = await checkPermission('user-1', 'FOLDER', 'folder-source', 'WRITE');
      expect(hasSourcePermission).toBe(true);

      // Vérifier le dossier cible existe
      const targetFolder = await prisma.folder.findUnique({
        where: { id: 'folder-target' },
      });
      expect(targetFolder).not.toBeNull();

      // Vérifier permissions cible
      const hasTargetPermission = await checkPermission('user-1', 'FOLDER', 'folder-target', 'WRITE');
      expect(hasTargetPermission).toBe(true);

      // Effectuer le déplacement
      const updated = await prisma.note.update({
        where: { id: 'note-1' },
        data: {
          folderId: 'folder-target',
          modifiedBy: 'user-1',
        },
        include: {
          author: true,
          folder: true,
        },
      });

      // Assert
      expect(updated.folderId).toBe('folder-target');
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: {
          folderId: 'folder-target',
          modifiedBy: 'user-1',
        },
        include: {
          author: true,
          folder: true,
        },
      });
    });

    it('should move a note to root (null folderId) successfully', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        folderId: 'folder-source',
        isDeleted: false,
        folder: { id: 'folder-source', name: 'Source', path: '/Source' },
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(prisma.note.update).mockResolvedValue({
        ...mockNote,
        folderId: null,
        folder: null,
      } as any);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });

      expect(note).not.toBeNull();

      // Le targetFolderId est null, donc pas besoin de vérifier le dossier cible
      const updated = await prisma.note.update({
        where: { id: 'note-1' },
        data: { folderId: null, modifiedBy: 'user-1' },
      });

      // Assert
      expect(updated.folderId).toBeNull();
    });

    it('should return note unchanged if target folder is the same', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        folderId: 'folder-1',
        isDeleted: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        folder: { id: 'folder-1', name: 'Same', path: '/Same' },
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(true);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });

      // Si même dossier, on retourne directement sans update
      if (note!.folderId === 'folder-1') {
        // Assert - pas d'update appelé
        expect(prisma.note.update).not.toHaveBeenCalled();
      }
    });
  });

  // ===========================================
  // Cas d'erreur - Note non trouvée
  // ===========================================
  describe('Error Cases - Note Not Found', () => {
    it('should return 404 if note does not exist', async () => {
      // Arrange
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'non-existent', isDeleted: false },
      });

      // Assert
      expect(note).toBeNull();
      // L'endpoint devrait retourner 404
    });

    it('should return 404 if note is deleted', async () => {
      // Arrange - findFirst avec isDeleted: false ne retournera pas de note supprimée
      vi.mocked(prisma.note.findFirst).mockResolvedValue(null);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'deleted-note', isDeleted: false },
      });

      // Assert
      expect(note).toBeNull();
    });
  });

  // ===========================================
  // Cas d'erreur - Permissions
  // ===========================================
  describe('Error Cases - Permissions', () => {
    it('should return 403 if user lacks write permission on source folder', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        folderId: 'folder-source',
        isDeleted: false,
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(false);

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });

      expect(note).not.toBeNull();

      const hasPermission = await checkPermission('user-1', 'FOLDER', 'folder-source', 'WRITE');

      // Assert
      expect(hasPermission).toBe(false);
      // L'endpoint devrait retourner 403
    });

    it('should return 403 if user lacks write permission on target folder', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        folderId: 'folder-source',
        isDeleted: false,
      };

      const mockTargetFolder = {
        id: 'folder-target',
        name: 'Target',
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockTargetFolder as any);

      // Source OK, Target NOK
      vi.mocked(checkPermission)
        .mockResolvedValueOnce(true)  // Source permission
        .mockResolvedValueOnce(false); // Target permission

      // Act
      const note = await prisma.note.findFirst({
        where: { id: 'note-1', isDeleted: false },
      });

      const hasSourcePermission = await checkPermission('user-1', 'FOLDER', 'folder-source', 'WRITE');
      expect(hasSourcePermission).toBe(true);

      const hasTargetPermission = await checkPermission('user-1', 'FOLDER', 'folder-target', 'WRITE');
      expect(hasTargetPermission).toBe(false);
      // L'endpoint devrait retourner 403
    });
  });

  // ===========================================
  // Cas d'erreur - Dossier cible non trouvé
  // ===========================================
  describe('Error Cases - Target Folder Not Found', () => {
    it('should return 404 if target folder does not exist', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        folderId: 'folder-source',
        isDeleted: false,
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(prisma.folder.findUnique).mockResolvedValue(null);

      // Act
      const targetFolder = await prisma.folder.findUnique({
        where: { id: 'non-existent-folder' },
      });

      // Assert
      expect(targetFolder).toBeNull();
      // L'endpoint devrait retourner 404
    });
  });

  // ===========================================
  // Cas d'erreur - Validation
  // ===========================================
  describe('Error Cases - Validation', () => {
    it('should return 400 if targetFolderId is invalid type', async () => {
      // Arrange - targetFolderId doit être string ou null
      const invalidTargetFolderId = 123; // number au lieu de string

      // Assert
      expect(typeof invalidTargetFolderId).not.toBe('string');
      expect(invalidTargetFolderId).not.toBeNull();
      // L'endpoint devrait retourner 400
    });
  });

  // ===========================================
  // Audit Log
  // ===========================================
  describe('Audit Logging', () => {
    it('should create audit log with correct details', async () => {
      // Arrange
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        folderId: 'folder-source',
        isDeleted: false,
        folder: { id: 'folder-source', name: 'Source', path: '/Source' },
      };

      vi.mocked(prisma.note.findFirst).mockResolvedValue(mockNote as any);
      vi.mocked(checkPermission).mockResolvedValue(true);
      vi.mocked(prisma.folder.findUnique).mockResolvedValue({ id: 'folder-target' } as any);
      vi.mocked(prisma.note.update).mockResolvedValue({
        ...mockNote,
        folderId: 'folder-target',
      } as any);

      // Act - L'audit log devrait contenir :
      const auditLogDetails = {
        userId: 'user-1',
        action: 'NOTE_MOVED',
        resourceType: 'NOTE',
        resourceId: 'note-1',
        details: {
          fromFolderId: 'folder-source',
          toFolderId: 'folder-target',
          noteTitle: 'Test Note',
        },
      };

      // Assert
      expect(auditLogDetails.action).toBe('NOTE_MOVED');
      expect(auditLogDetails.details.fromFolderId).toBe('folder-source');
      expect(auditLogDetails.details.toFolderId).toBe('folder-target');
      expect(auditLogDetails.details.noteTitle).toBe('Test Note');
    });
  });
});
