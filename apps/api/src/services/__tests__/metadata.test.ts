// ===========================================
// Tests MetadataService (P2)
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@plumenote/database';
import {
  getPropertyDefinitions,
  getPropertyDefinitionById,
  getPropertyDefinitionByName,
  createPropertyDefinition,
  updatePropertyDefinition,
  deletePropertyDefinition,
  validateMetadata,
  updateNoteMetadata,
} from '../metadata';

// Mock data
const mockTextProperty = {
  id: 'prop-1',
  name: 'title',
  displayName: 'Title',
  type: 'TEXT' as const,
  description: 'Note title',
  options: [],
  isDefault: true,
  defaultValue: null,
  icon: 'type',
  color: null,
  position: 0,
  isSystem: false,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockNumberProperty = {
  id: 'prop-2',
  name: 'priority_level',
  displayName: 'Priority Level',
  type: 'NUMBER' as const,
  description: null,
  options: [],
  isDefault: false,
  defaultValue: null,
  icon: null,
  color: null,
  position: 1,
  isSystem: false,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockDateProperty = {
  id: 'prop-3',
  name: 'due_date',
  displayName: 'Due Date',
  type: 'DATE' as const,
  description: 'Date limite',
  options: [],
  isDefault: true,
  defaultValue: null,
  icon: 'calendar',
  color: null,
  position: 2,
  isSystem: true,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockSelectProperty = {
  id: 'prop-4',
  name: 'status',
  displayName: 'Status',
  type: 'SELECT' as const,
  description: 'Note status',
  options: ['todo', 'in-progress', 'done'],
  isDefault: true,
  defaultValue: 'todo',
  icon: 'circle-dot',
  color: null,
  position: 3,
  isSystem: true,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTagsProperty = {
  id: 'prop-5',
  name: 'tags',
  displayName: 'Tags',
  type: 'TAGS' as const,
  description: null,
  options: [],
  isDefault: true,
  defaultValue: null,
  icon: 'tag',
  color: null,
  position: 4,
  isSystem: false,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCheckboxProperty = {
  id: 'prop-6',
  name: 'completed',
  displayName: 'Completed',
  type: 'CHECKBOX' as const,
  description: null,
  options: [],
  isDefault: false,
  defaultValue: 'false',
  icon: null,
  color: null,
  position: 5,
  isSystem: false,
  createdById: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const allMockProperties = [
  mockTextProperty,
  mockNumberProperty,
  mockDateProperty,
  mockSelectProperty,
  mockTagsProperty,
  mockCheckboxProperty,
];

describe('MetadataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----- getPropertyDefinitions -----
  describe('getPropertyDefinitions', () => {
    it('should return all property definitions sorted', async () => {
      vi.mocked(prisma.propertyDefinition.findMany).mockResolvedValue(allMockProperties);

      const result = await getPropertyDefinitions();

      expect(prisma.propertyDefinition.findMany).toHaveBeenCalledWith({
        orderBy: [
          { isDefault: 'desc' },
          { position: 'asc' },
          { name: 'asc' },
        ],
      });
      expect(result).toHaveLength(6);
      expect(result[0].type).toBe('text'); // Converted to lowercase
    });

    it('should return empty array when no definitions exist', async () => {
      vi.mocked(prisma.propertyDefinition.findMany).mockResolvedValue([]);

      const result = await getPropertyDefinitions();

      expect(result).toEqual([]);
    });
  });

  // ----- getPropertyDefinitionById -----
  describe('getPropertyDefinitionById', () => {
    it('should return property by ID', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockTextProperty);

      const result = await getPropertyDefinitionById('prop-1');

      expect(prisma.propertyDefinition.findUnique).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
      });
      expect(result?.name).toBe('title');
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(null);

      const result = await getPropertyDefinitionById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ----- getPropertyDefinitionByName -----
  describe('getPropertyDefinitionByName', () => {
    it('should return property by name', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockSelectProperty);

      const result = await getPropertyDefinitionByName('status');

      expect(prisma.propertyDefinition.findUnique).toHaveBeenCalledWith({
        where: { name: 'status' },
      });
      expect(result?.displayName).toBe('Status');
    });
  });

  // ----- createPropertyDefinition -----
  describe('createPropertyDefinition', () => {
    it('should create a new property definition', async () => {
      vi.mocked(prisma.propertyDefinition.aggregate).mockResolvedValue({
        _max: { position: 5 },
        _min: { position: 0 },
        _avg: { position: 2 },
        _sum: { position: 10 },
        _count: { position: 5 },
      });
      vi.mocked(prisma.propertyDefinition.create).mockResolvedValue({
        ...mockTextProperty,
        id: 'new-prop',
        name: 'custom_field',
        displayName: 'Custom Field',
        position: 6,
      });

      const result = await createPropertyDefinition(
        {
          name: 'Custom Field',
          displayName: 'Custom Field',
          type: 'text',
        },
        'user-1'
      );

      expect(prisma.propertyDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'custom_field', // Normalized
          displayName: 'Custom Field',
          type: 'TEXT',
          createdById: 'user-1',
          position: 6,
        }),
      });
      expect(result.name).toBe('custom_field');
    });

    it('should normalize property name', async () => {
      vi.mocked(prisma.propertyDefinition.aggregate).mockResolvedValue({
        _max: { position: null },
        _min: { position: null },
        _avg: { position: null },
        _sum: { position: null },
        _count: { position: 0 },
      });
      vi.mocked(prisma.propertyDefinition.create).mockResolvedValue({
        ...mockTextProperty,
        name: 'my_special_field',
      });

      await createPropertyDefinition(
        {
          name: 'My Special Field!@#',
          displayName: 'My Special Field',
          type: 'text',
        },
        'user-1'
      );

      expect(prisma.propertyDefinition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'my_special_field___', // Special chars replaced with _
        }),
      });
    });
  });

  // ----- updatePropertyDefinition -----
  describe('updatePropertyDefinition', () => {
    it('should update existing property', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockTextProperty);
      vi.mocked(prisma.propertyDefinition.update).mockResolvedValue({
        ...mockTextProperty,
        displayName: 'Updated Title',
      });

      const result = await updatePropertyDefinition('prop-1', {
        displayName: 'Updated Title',
      });

      expect(result?.displayName).toBe('Updated Title');
    });

    it('should return null when property not found', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(null);

      const result = await updatePropertyDefinition('non-existent', {
        displayName: 'New Name',
      });

      expect(result).toBeNull();
    });

    it('should throw error when modifying system property name/type', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockDateProperty); // isSystem: true

      await expect(
        updatePropertyDefinition('prop-3', { name: 'new_name' })
      ).rejects.toThrow('Cannot modify name or type of system properties');
    });
  });

  // ----- deletePropertyDefinition -----
  describe('deletePropertyDefinition', () => {
    it('should delete non-system property', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockTextProperty);
      vi.mocked(prisma.propertyDefinition.delete).mockResolvedValue(mockTextProperty);

      const result = await deletePropertyDefinition('prop-1');

      expect(result).toBe(true);
      expect(prisma.propertyDefinition.delete).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
      });
    });

    it('should return false when not found', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(null);

      const result = await deletePropertyDefinition('non-existent');

      expect(result).toBe(false);
    });

    it('should throw error when deleting system property', async () => {
      vi.mocked(prisma.propertyDefinition.findUnique).mockResolvedValue(mockDateProperty); // isSystem: true

      await expect(deletePropertyDefinition('prop-3')).rejects.toThrow(
        'Cannot delete system properties'
      );
    });
  });

  // ----- validateMetadata -----
  describe('validateMetadata', () => {
    beforeEach(() => {
      vi.mocked(prisma.propertyDefinition.findMany).mockResolvedValue(allMockProperties);
    });

    it('should validate valid text field', async () => {
      const result = await validateMetadata({ title: 'My Note' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedMetadata.title).toBe('My Note');
    });

    it('should validate and normalize number field', async () => {
      const result = await validateMetadata({ priority_level: '5' });

      expect(result.valid).toBe(true);
      expect(result.normalizedMetadata.priority_level).toBe(5); // Normalized to number
    });

    it('should reject invalid number', async () => {
      const result = await validateMetadata({ priority_level: 'not-a-number' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Expected number');
    });

    it('should validate date field with correct format', async () => {
      const result = await validateMetadata({ due_date: '2024-12-31' });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const result = await validateMetadata({ due_date: '31-12-2024' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Expected date');
    });

    it('should validate select field with valid option', async () => {
      const result = await validateMetadata({ status: 'in-progress' });

      expect(result.valid).toBe(true);
    });

    it('should reject select field with invalid option', async () => {
      const result = await validateMetadata({ status: 'invalid-status' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Value must be one of');
    });

    it('should validate tags array', async () => {
      const result = await validateMetadata({ tags: ['tag1', 'tag2', 'tag3'] });

      expect(result.valid).toBe(true);
    });

    it('should normalize single tag string to array', async () => {
      const result = await validateMetadata({ tags: 'single-tag' });

      expect(result.valid).toBe(true);
      expect(result.normalizedMetadata.tags).toEqual(['single-tag']);
    });

    it('should reject tags with non-string elements', async () => {
      const result = await validateMetadata({ tags: [1, 2, 3] });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('All tags must be strings');
    });

    it('should validate checkbox boolean', async () => {
      const result = await validateMetadata({ completed: true });

      expect(result.valid).toBe(true);
    });

    it('should normalize checkbox string to boolean', async () => {
      const result = await validateMetadata({ completed: 'true' });

      expect(result.valid).toBe(true);
      expect(result.normalizedMetadata.completed).toBe(true);
    });

    it('should warn about undefined properties but keep them', async () => {
      const result = await validateMetadata({ custom_unknown: 'value' });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('not defined in schema');
      expect(result.normalizedMetadata.custom_unknown).toBe('value');
    });

    it('should skip null/undefined values', async () => {
      const result = await validateMetadata({
        title: null,
        status: undefined,
      });

      expect(result.valid).toBe(true);
      expect(Object.keys(result.normalizedMetadata)).toHaveLength(0);
    });

    it('should validate multiple fields at once', async () => {
      const result = await validateMetadata({
        title: 'My Note',
        status: 'done',
        due_date: '2024-12-31',
        tags: ['important', 'urgent'],
        completed: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(Object.keys(result.normalizedMetadata)).toHaveLength(5);
    });

    it('should collect multiple errors', async () => {
      const result = await validateMetadata({
        priority_level: 'not-a-number',
        status: 'invalid',
        due_date: 'bad-date',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ----- updateNoteMetadata -----
  describe('updateNoteMetadata', () => {
    beforeEach(() => {
      vi.mocked(prisma.propertyDefinition.findMany).mockResolvedValue(allMockProperties);
    });

    it('should update note with valid metadata', async () => {
      vi.mocked(prisma.note.update).mockResolvedValue({
        id: 'note-1',
        title: 'Test Note',
        slug: 'test-note',
        content: '',
        yjsState: null,
        frontmatter: { status: 'done' },
        folderId: 'folder-1',
        createdById: 'user-1',
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
        pinnedAt: null,
        pinnedPosition: null,
      });

      const result = await updateNoteMetadata('note-1', { status: 'done' });

      expect(result.success).toBe(true);
      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { frontmatter: { status: 'done' } },
      });
    });

    it('should return errors for invalid metadata', async () => {
      const result = await updateNoteMetadata('note-1', { status: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(prisma.note.update).not.toHaveBeenCalled();
    });
  });
});
