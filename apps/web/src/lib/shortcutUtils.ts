// ===========================================
// Utilitaires d'affichage des raccourcis - P3
// ===========================================

import type { ShortcutKeys, ModifierKey } from '@plumenote/types';

/**
 * Détection du système d'exploitation
 */
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Symboles des touches pour macOS
 */
const MAC_SYMBOLS: Record<string, string> = {
  cmd: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: '⎋',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: '␣',
};

/**
 * Labels des touches pour Windows/Linux
 */
const WINDOWS_LABELS: Record<string, string> = {
  cmd: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  escape: 'Esc',
  tab: 'Tab',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
};

/**
 * Formate un raccourci pour l'affichage
 * Retourne un tableau de parties (chaque touche séparément)
 */
export function formatShortcut(keys: ShortcutKeys): string[] {
  const symbols = isMac ? MAC_SYMBOLS : WINDOWS_LABELS;
  const parts: string[] = [];

  // Ordre des modifiers : Cmd/Ctrl, Alt, Shift
  const orderedModifiers: ModifierKey[] = ['cmd', 'ctrl', 'alt', 'shift'];

  for (const mod of orderedModifiers) {
    if (keys.modifiers.includes(mod)) {
      // Sur Mac, ignorer 'ctrl' si 'cmd' est déjà là
      if (isMac && mod === 'ctrl' && keys.modifiers.includes('cmd')) continue;
      // Sur Windows, 'cmd' devient 'Ctrl' donc pas de doublon
      if (!isMac && mod === 'cmd' && keys.modifiers.includes('ctrl')) continue;

      parts.push(symbols[mod] ?? mod);
    }
  }

  // Touche principale
  const keyLower = keys.key.toLowerCase();
  const keySymbol = symbols[keyLower] ?? keys.key.toUpperCase();
  parts.push(keySymbol);

  return parts;
}

/**
 * Formate un raccourci en chaîne lisible
 * Sur Mac: symboles collés (⌘⇧N)
 * Sur Windows: séparés par + (Ctrl + Shift + N)
 */
export function formatShortcutString(keys: ShortcutKeys): string {
  const parts = formatShortcut(keys);
  return isMac ? parts.join('') : parts.join(' + ');
}

/**
 * Retourne le symbole de la touche Cmd/Ctrl selon l'OS
 */
export function getCmdSymbol(): string {
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Retourne le symbole de la touche Alt/Option selon l'OS
 */
export function getAltSymbol(): string {
  return isMac ? '⌥' : 'Alt';
}

/**
 * Retourne le symbole de la touche Shift selon l'OS
 */
export function getShiftSymbol(): string {
  return isMac ? '⇧' : 'Shift';
}

/**
 * Retourne vrai si on est sur Mac
 */
export function isMacOS(): boolean {
  return isMac;
}

/**
 * Convertit une touche spéciale en son symbole
 */
export function getKeySymbol(key: string): string {
  const symbols = isMac ? MAC_SYMBOLS : WINDOWS_LABELS;
  return symbols[key.toLowerCase()] ?? key.toUpperCase();
}
