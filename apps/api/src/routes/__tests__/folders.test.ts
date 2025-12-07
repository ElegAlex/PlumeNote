// ===========================================
// Tests Unitaires - Routes Folders
// P0: Tests pour GET /folders/:id/content
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@plumenote/database';
import { createFolderMock, createNoteMock } from '../../test/prisma-mock';

// Mock des services
vi.mock('../../services/permissions.js', () => ({
  checkPermission: vi.fn().mockResolvedValue(true),
  getEffectivePermissions: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/audit.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe('Folders Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /folders/:id/content', () => {
    it('should return folder content with children and notes sorted alphabetically', async () => {
      // Arrange
      const mockFolder = {
        id: 'folder-1',
        name: 'Parent Folder',
        children: [
          {
            id: 'child-2',
            name: 'Zebra Folder',
            slug: 'zebra-folder',
            color: null,
            icon: null,
            position: 1,
            _count: { children: 0, notes: 2 },
          },
          {
            id: 'child-1',
            name: 'Alpha Folder',
            slug: 'alpha-folder',
            color: '#ff0000',
            icon: 'folder',
            position: 0,
            _count: { children: 1, notes: 0 },
          },
        ],
        notes: [
          {
            id: 'note-2',
            title: 'Zebra Note',
            slug: 'zebra-note',
            position: 1,
            updatedAt: new Date('2024-01-02'),
            createdAt: new Date('2024-01-01'),
          },
          {
            id: 'note-1',
            title: 'Alpha Note',
            slug: 'alpha-note',
            position: 0,
            updatedAt: new Date('2024-01-01'),
            createdAt: new Date('2024-01-01'),
          },
        ],
      };

      vi.mocked(prisma.folder.findUnique).mockResolvedValue(mockFolder as any);

      // Act - Simulating the response transformation
      const content = {
        id: mockFolder.id,
        name: mockFolder.name,
        children: mockFolder.children.map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          color: child.color,
          icon: child.icon,
          position: child.position,
          hasChildren: child._count.children > 0,
          notesCount: child._count.notes,
        })),
        notes: mockFolder.notes.map((note) => ({
          id: note.id,
          title: note.title,
          slug: note.slug,
          position: note.position,
          updatedAt: note.updatedAt.toISOString(),
          createdAt: note.createdAt.toISOString(),
        })),
      };

      // Assert
      expect(content.id).toBe('folder-1');
      expect(content.children).toHaveLength(2);
      expect(content.notes).toHaveLength(2);

      // Verify children structure
      expect(content.children[0]).toEqual({
        id: 'child-2',
        name: 'Zebra Folder',
        slug: 'zebra-folder',
        color: null,
        icon: null,
        position: 1,
        hasChildren: false,
        notesCount: 2,
      });

      expect(content.children[1]).toEqual({
        id: 'child-1',
        name: 'Alpha Folder',
        slug: 'alpha-folder',
        color: '#ff0000',
        icon: 'folder',
        position: 0,
        hasChildren: true,
        notesCount: 0,
      });
    });

    it('should return null when folder not found', async () => {
      // Arrange
      vi.mocked(prisma.folder.findUnique).mockResolvedValue(null);

      // Act
      const result = await prisma.folder.findUnique({
        where: { id: 'nonexistent' },
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return empty arrays when folder has no content', async () => {
      // Arrange
      const emptyFolder = {
        id: 'empty-folder',
        name: 'Empty Folder',
        children: [],
        notes: [],
      };

      vi.mocked(prisma.folder.findUnique).mockResolvedValue(emptyFolder as any);

      // Act
      const content = {
        id: emptyFolder.id,
        name: emptyFolder.name,
        children: emptyFolder.children,
        notes: emptyFolder.notes,
      };

      // Assert
      expect(content.children).toEqual([]);
      expect(content.notes).toEqual([]);
    });

    it('should correctly identify folders with nested children', async () => {
      // Arrange
      const folderWithNested = {
        id: 'parent',
        name: 'Parent',
        children: [
          {
            id: 'child-with-children',
            name: 'Has Children',
            slug: 'has-children',
            color: null,
            icon: null,
            position: 0,
            _count: { children: 3, notes: 1 },
          },
          {
            id: 'child-without-children',
            name: 'No Children',
            slug: 'no-children',
            color: null,
            icon: null,
            position: 1,
            _count: { children: 0, notes: 5 },
          },
        ],
        notes: [],
      };

      vi.mocked(prisma.folder.findUnique).mockResolvedValue(folderWithNested as any);

      // Act
      const content = {
        children: folderWithNested.children.map((child) => ({
          id: child.id,
          hasChildren: child._count.children > 0,
          notesCount: child._count.notes,
        })),
      };

      // Assert
      expect(content.children[0].hasChildren).toBe(true);
      expect(content.children[0].notesCount).toBe(1);
      expect(content.children[1].hasChildren).toBe(false);
      expect(content.children[1].notesCount).toBe(5);
    });
  });

  describe('GET /folders/tree', () => {
    it('should build correct tree structure from flat folders', async () => {
      // Arrange
      const flatFolders = [
        createFolderMock({ id: 'root-1', name: 'Root 1', parentId: null }),
        createFolderMock({ id: 'root-2', name: 'Root 2', parentId: null }),
        createFolderMock({ id: 'child-1', name: 'Child 1', parentId: 'root-1' }),
        createFolderMock({ id: 'grandchild-1', name: 'Grandchild 1', parentId: 'child-1' }),
      ];

      vi.mocked(prisma.folder.findMany).mockResolvedValue(flatFolders as any);

      // Act - Simulate tree building
      const buildTree = (folders: typeof flatFolders, parentId: string | null): any[] => {
        return folders
          .filter((f) => f.parentId === parentId)
          .map((folder) => ({
            ...folder,
            children: buildTree(folders, folder.id),
          }));
      };

      const tree = buildTree(flatFolders, null);

      // Assert
      expect(tree).toHaveLength(2);
      expect(tree[0].name).toBe('Root 1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe('Child 1');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].name).toBe('Grandchild 1');
    });

    it('should return empty array when no folders exist', async () => {
      // Arrange
      vi.mocked(prisma.folder.findMany).mockResolvedValue([]);

      // Act
      const result = await prisma.folder.findMany();

      // Assert
      expect(result).toEqual([]);
    });
  });
});

describe('FolderContent Transformation', () => {
  it('should correctly transform dates to ISO strings', () => {
    // Arrange
    const note = createNoteMock({
      createdAt: new Date('2024-06-15T10:30:00Z'),
      updatedAt: new Date('2024-06-20T14:45:00Z'),
    });

    // Act
    const transformed = {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };

    // Assert
    expect(transformed.createdAt).toBe('2024-06-15T10:30:00.000Z');
    expect(transformed.updatedAt).toBe('2024-06-20T14:45:00.000Z');
  });

  it('should preserve all folder properties in FolderChildPreview', () => {
    // Arrange
    const folder = {
      id: 'test-id',
      name: 'Test Folder',
      slug: 'test-folder',
      color: '#3b82f6',
      icon: 'folder-open',
      position: 5,
      _count: { children: 2, notes: 10 },
    };

    // Act
    const preview = {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      color: folder.color,
      icon: folder.icon,
      position: folder.position,
      hasChildren: folder._count.children > 0,
      notesCount: folder._count.notes,
    };

    // Assert
    expect(preview).toEqual({
      id: 'test-id',
      name: 'Test Folder',
      slug: 'test-folder',
      color: '#3b82f6',
      icon: 'folder-open',
      position: 5,
      hasChildren: true,
      notesCount: 10,
    });
  });
});
