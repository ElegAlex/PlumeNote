// ===========================================
// Hook pour la gestion des raccourcis clavier - P3
// ===========================================

import { useEffect, useCallback } from 'react';
import type { ShortcutKeys } from '@plumenote/types';

/**
 * Détection du système d'exploitation
 */
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Configuration d'un raccourci
 */
interface ShortcutHandler {
  keys: ShortcutKeys;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Normalise le nom de touche pour la comparaison
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright',
    enter: 'enter',
    escape: 'escape',
    tab: 'tab',
    space: ' ',
    backspace: 'backspace',
    delete: 'delete',
  };

  return keyMap[key.toLowerCase()] ?? key.toLowerCase();
}

/**
 * Vérifie si l'événement correspond au raccourci
 */
function matchesShortcut(event: KeyboardEvent, keys: ShortcutKeys): boolean {
  // Vérifier les modifiers
  const cmdPressed = isMac ? event.metaKey : event.ctrlKey;
  const altPressed = event.altKey;
  const shiftPressed = event.shiftKey;

  const needsCmd = keys.modifiers.includes('cmd');
  const needsCtrl = keys.modifiers.includes('ctrl');
  const needsAlt = keys.modifiers.includes('alt');
  const needsShift = keys.modifiers.includes('shift');

  // Sur Mac, 'cmd' = metaKey, sur Windows/Linux, 'cmd' = ctrlKey
  if (needsCmd && !cmdPressed) return false;
  if (needsCtrl && !event.ctrlKey) return false;
  if (needsAlt && !altPressed) return false;
  if (needsShift && !shiftPressed) return false;

  // Vérifier qu'il n'y a pas de modifiers en trop
  if (!needsCmd && !needsCtrl && cmdPressed) return false;
  if (!needsAlt && altPressed) return false;
  if (!needsShift && shiftPressed) return false;

  // Vérifier la touche principale
  const pressedKey = event.key.toLowerCase();
  const expectedKey = normalizeKey(keys.key);

  // Gestion spéciale pour ? qui nécessite Shift sur la plupart des claviers
  if (expectedKey === '?' && pressedKey === '?') return true;
  if (expectedKey === '/' && pressedKey === '/') return true;

  return pressedKey === expectedKey;
}

/**
 * Vérifie si le raccourci est autorisé dans un champ de formulaire
 */
function isAllowedInFormField(keys: ShortcutKeys): boolean {
  // Les raccourcis avec Cmd/Ctrl sont généralement OK
  if (keys.modifiers.includes('cmd') || keys.modifiers.includes('ctrl')) {
    return true;
  }
  return false;
}

/**
 * Hook pour gérer plusieurs raccourcis clavier
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignorer si focus dans un champ de formulaire (sauf pour les raccourcis globaux)
      const target = event.target as HTMLElement;
      const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;
        if (!matchesShortcut(event, shortcut.keys)) continue;

        // Pour les champs de formulaire, autoriser seulement certains raccourcis
        if ((isFormField || isContentEditable) && !isAllowedInFormField(shortcut.keys)) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        shortcut.handler(event);
        break;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);
}

/**
 * Hook pour un raccourci unique
 */
export function useKeyboardShortcut(
  keys: ShortcutKeys,
  handler: () => void,
  enabled: boolean = true
) {
  useKeyboardShortcuts([
    {
      keys,
      handler,
      enabled,
    },
  ]);
}

/**
 * Hook pour écouter Escape
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true) {
  useKeyboardShortcut({ modifiers: [], key: 'escape' }, handler, enabled);
}
