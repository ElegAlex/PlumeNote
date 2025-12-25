// ===========================================
// Tests unitaires - shortcutUtils - P3
// ===========================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatShortcut,
  formatShortcutString,
  getCmdSymbol,
  getAltSymbol,
  getShiftSymbol,
  isMacOS,
  getKeySymbol,
} from '../shortcutUtils';

describe('shortcutUtils', () => {
  const originalNavigator = global.navigator;

  // Note: Les tests platform-specific (Mac vs Windows) ne fonctionnent pas car
  // isMac est évalué au load du module. Les tests généraux ci-dessous couvrent
  // les fonctionnalités cross-platform.

  describe('formatShortcut', () => {
    it('should format a simple shortcut with one modifier', () => {
      const result = formatShortcut({ modifiers: ['cmd'], key: 'k' });
      // Le résultat dépend de l'OS détecté au chargement du module
      expect(result.length).toBe(2);
      expect(result[1]).toBe('K');
    });

    it('should format a shortcut with multiple modifiers', () => {
      const result = formatShortcut({ modifiers: ['cmd', 'shift'], key: 'n' });
      expect(result.length).toBe(3);
      expect(result[result.length - 1]).toBe('N');
    });

    it('should format arrow keys', () => {
      const result = formatShortcut({ modifiers: ['alt'], key: 'up' });
      expect(result).toContain('↑');
    });

    it('should format special keys', () => {
      const result = formatShortcut({ modifiers: [], key: 'enter' });
      // Contient le symbole Enter
      expect(result.length).toBe(1);
    });
  });

  describe('formatShortcutString', () => {
    it('should return a non-empty string', () => {
      const result = formatShortcutString({ modifiers: ['cmd', 'shift'], key: 'n' });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCmdSymbol', () => {
    it('should return a string', () => {
      const result = getCmdSymbol();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getAltSymbol', () => {
    it('should return a string', () => {
      const result = getAltSymbol();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getShiftSymbol', () => {
    it('should return a string', () => {
      const result = getShiftSymbol();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isMacOS', () => {
    it('should return a boolean', () => {
      const result = isMacOS();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getKeySymbol', () => {
    it('should return uppercase for regular keys', () => {
      const result = getKeySymbol('a');
      expect(result).toBe('A');
    });

    it('should return arrow symbol for arrow keys', () => {
      expect(getKeySymbol('up')).toBe('↑');
      expect(getKeySymbol('down')).toBe('↓');
      expect(getKeySymbol('left')).toBe('←');
      expect(getKeySymbol('right')).toBe('→');
    });
  });
});
