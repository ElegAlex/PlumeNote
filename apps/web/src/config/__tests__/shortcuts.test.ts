// ===========================================
// Tests unitaires - shortcuts config - P3
// ===========================================

import { describe, it, expect } from 'vitest';
import {
  SHORTCUTS,
  getShortcutsByCategory,
  searchShortcuts,
  getShortcutById,
} from '../shortcuts';

describe('shortcuts config', () => {
  describe('SHORTCUTS', () => {
    it('should have unique IDs', () => {
      const ids = SHORTCUTS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = [
        'navigation',
        'editor-actions',
        'editor-formatting',
        'editor-headings',
        'editor-lists',
        'editor-blocks',
        'selection',
        'panels',
      ];

      for (const shortcut of SHORTCUTS) {
        expect(validCategories).toContain(shortcut.category);
      }
    });

    it('should have valid contexts', () => {
      const validContexts = ['global', 'editor', 'sidebar', 'modal'];

      for (const shortcut of SHORTCUTS) {
        expect(validContexts).toContain(shortcut.context);
      }
    });

    it('should have non-empty action and description', () => {
      for (const shortcut of SHORTCUTS) {
        expect(shortcut.action.length).toBeGreaterThan(0);
        expect(shortcut.description.length).toBeGreaterThan(0);
      }
    });

    it('should have at least one modifier for most shortcuts except slash', () => {
      const withoutModifiers = SHORTCUTS.filter(
        (s) => s.keys.modifiers.length === 0 && s.keys.key !== '/'
      );
      // Seul '/' (slash commands) n'a pas de modifier
      expect(withoutModifiers.length).toBe(0);
    });

    it('should have at least 30 shortcuts', () => {
      expect(SHORTCUTS.length).toBeGreaterThanOrEqual(30);
    });
  });

  describe('getShortcutsByCategory', () => {
    it('should return a Map', () => {
      const result = getShortcutsByCategory();
      expect(result).toBeInstanceOf(Map);
    });

    it('should have all expected categories', () => {
      const result = getShortcutsByCategory();
      expect(result.has('navigation')).toBe(true);
      expect(result.has('editor-formatting')).toBe(true);
      expect(result.has('editor-actions')).toBe(true);
      expect(result.has('editor-headings')).toBe(true);
      expect(result.has('editor-blocks')).toBe(true);
    });

    it('should include all shortcuts', () => {
      const result = getShortcutsByCategory();
      let totalCount = 0;
      result.forEach((shortcuts) => {
        totalCount += shortcuts.length;
      });
      expect(totalCount).toBe(SHORTCUTS.length);
    });

    it('should group shortcuts correctly', () => {
      const result = getShortcutsByCategory();
      const navigationShortcuts = result.get('navigation');

      expect(navigationShortcuts).toBeDefined();
      expect(navigationShortcuts!.length).toBeGreaterThan(0);

      for (const shortcut of navigationShortcuts!) {
        expect(shortcut.category).toBe('navigation');
      }
    });
  });

  describe('searchShortcuts', () => {
    it('should return all shortcuts for empty query', () => {
      const result = searchShortcuts('');
      expect(result.length).toBe(SHORTCUTS.length);
    });

    it('should return all shortcuts for whitespace query', () => {
      const result = searchShortcuts('   ');
      expect(result.length).toBe(SHORTCUTS.length);
    });

    it('should filter by action name', () => {
      const result = searchShortcuts('gras');
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.action === 'Gras')).toBe(true);
    });

    it('should filter by description', () => {
      const result = searchShortcuts('insérer');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const result1 = searchShortcuts('GRAS');
      const result2 = searchShortcuts('gras');
      expect(result1.length).toBe(result2.length);
    });

    it('should return empty array for no match', () => {
      const result = searchShortcuts('xyznonexistent');
      expect(result.length).toBe(0);
    });

    it('should find shortcuts by partial match', () => {
      const result = searchShortcuts('nouveau');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getShortcutById', () => {
    it('should return the correct shortcut', () => {
      const result = getShortcutById('bold');
      expect(result).toBeDefined();
      expect(result!.id).toBe('bold');
      expect(result!.action).toBe('Gras');
    });

    it('should return undefined for unknown id', () => {
      const result = getShortcutById('unknown-shortcut-id');
      expect(result).toBeUndefined();
    });
  });
});
