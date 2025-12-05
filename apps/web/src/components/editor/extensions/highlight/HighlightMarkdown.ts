// ===========================================
// Extension TipTap Highlight avec InputRule Markdown
// US-016: Support syntaxe ==texte== pour surlignage
// ===========================================

import Highlight from '@tiptap/extension-highlight';
import { markInputRule, markPasteRule } from '@tiptap/core';

// Regex pour capturer ==texte== en Markdown
// Utilise des lookbehind/lookahead pour ne pas capturer les délimiteurs
const HIGHLIGHT_INPUT_REGEX = /(?:^|\s)==([^=]+)==$/;
const HIGHLIGHT_PASTE_REGEX = /(?:^|\s)==([^=]+)==/g;

export interface HighlightMarkdownOptions {
  multicolor?: boolean;
  HTMLAttributes?: Record<string, unknown>;
}

/**
 * Extension Highlight avec support de la syntaxe Markdown ==texte==
 * Étend l'extension Highlight standard de TipTap
 */
export const HighlightMarkdownExtension = Highlight.extend<HighlightMarkdownOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: HIGHLIGHT_INPUT_REGEX,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: HIGHLIGHT_PASTE_REGEX,
        type: this.type,
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + Shift + H pour toggle highlight
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
    };
  },
});

export default HighlightMarkdownExtension;
