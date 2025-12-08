// ===========================================
// Extension TipTap pour les Wikilinks [[note]]
// US-036: Syntaxe [[note]], [[note|alias]], [[note#section]]
// US-037: Autocomplétion
// US-038: Création depuis lien cassé
// ===========================================

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface WikilinkOptions {
  HTMLAttributes: Record<string, unknown>;
  /** Callback lors du clic sur un wikilink */
  onWikilinkClick?: (target: string, section?: string) => void;
}

/** Structure d'un wikilink parsé */
export interface ParsedWikilink {
  /** Titre de la note cible */
  target: string;
  /** Alias affiché (optionnel) */
  alias?: string;
  /** Section/ancre (optionnel) */
  section?: string;
  /** Texte d'affichage final */
  displayText: string;
  /** Texte brut complet [[...]] */
  rawText: string;
}

/**
 * Parse le contenu d'un wikilink
 * Supporte: [[note]], [[note|alias]], [[note#section]], [[note#section|alias]]
 */
export function parseWikilink(content: string): ParsedWikilink {
  const rawText = `[[${content}]]`;

  // Séparer l'alias (après |)
  const pipeIndex = content.indexOf('|');
  let mainPart = content;
  let alias: string | undefined;

  if (pipeIndex !== -1) {
    mainPart = content.substring(0, pipeIndex);
    alias = content.substring(pipeIndex + 1).trim();
  }

  // Séparer la section (après #)
  const hashIndex = mainPart.indexOf('#');
  let target = mainPart;
  let section: string | undefined;

  if (hashIndex !== -1) {
    target = mainPart.substring(0, hashIndex);
    section = mainPart.substring(hashIndex + 1).trim();
  }

  target = target.trim();

  // Déterminer le texte d'affichage
  let displayText: string;
  if (alias) {
    displayText = alias;
  } else if (section && !target) {
    // Lien vers section dans la même note: [[#section]]
    displayText = section;
  } else if (section) {
    displayText = `${target} > ${section}`;
  } else {
    displayText = target;
  }

  return { target, alias, section, displayText, rawText };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      /** Insère un wikilink simple */
      insertWikilink: (title: string) => ReturnType;
      /** Insère un wikilink avec alias */
      insertWikilinkWithAlias: (title: string, alias: string) => ReturnType;
      /** Insère un wikilink avec section */
      insertWikilinkWithSection: (title: string, section: string) => ReturnType;
    };
  }
}

export const WikilinkExtension = Node.create<WikilinkOptions>({
  name: 'wikilink',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onWikilinkClick: undefined,
    };
  },

  addAttributes() {
    return {
      // Titre de la note cible
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-target'),
        renderHTML: (attributes) => ({
          'data-target': attributes.target,
        }),
      },
      // Alias d'affichage (optionnel)
      alias: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alias'),
        renderHTML: (attributes) => attributes.alias ? ({
          'data-alias': attributes.alias,
        }) : {},
      },
      // Section/ancre (optionnel)
      section: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-section'),
        renderHTML: (attributes) => attributes.section ? ({
          'data-section': attributes.section,
        }) : {},
      },
      // Note existe-t-elle ?
      exists: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-exists') !== 'false',
        renderHTML: (attributes) => ({
          'data-exists': attributes.exists ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wikilink"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { target, alias, section, exists } = node.attrs;

    // Construire le texte d'affichage
    let displayText: string;
    if (alias) {
      displayText = alias;
    } else if (section && target) {
      displayText = `${target} > ${section}`;
    } else if (section) {
      displayText = section;
    } else {
      displayText = target || '';
    }

    // Construire le texte brut [[...]]
    let rawContent = target || '';
    if (section) rawContent += `#${section}`;
    if (alias) rawContent += `|${alias}`;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'wikilink',
        class: `wikilink ${!exists ? 'broken' : ''}`,
        title: `${target}${section ? '#' + section : ''}`,
      }),
      `[[${rawContent}]]`,
    ];
  },

  addCommands() {
    return {
      insertWikilink:
        (title: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { target: title },
          });
        },
      insertWikilinkWithAlias:
        (title: string, alias: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { target: title, alias },
          });
        },
      insertWikilinkWithSection:
        (title: string, section: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { target: title, section },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    // Regex améliorée pour capturer [[target#section|alias]]
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    const onWikilinkClick = this.options.onWikilinkClick;

    return [
      // Decoration plugin to style [[wikilinks]] in text
      new Plugin({
        key: new PluginKey('wikilink-decorator'),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            const doc = state.doc;

            doc.descendants((node, pos) => {
              if (!node.isText) return;

              const text = node.text || '';
              let match;

              // Reset regex lastIndex for each node
              wikilinkRegex.lastIndex = 0;

              while ((match = wikilinkRegex.exec(text)) !== null) {
                const start = pos + match.index;
                const end = start + match[0].length;
                const parsed = parseWikilink(match[1]!);

                decorations.push(
                  Decoration.inline(start, end, {
                    class: 'wikilink',
                    'data-target': parsed.target,
                    'data-section': parsed.section || '',
                    'data-alias': parsed.alias || '',
                    'data-display': parsed.displayText,
                    title: `${parsed.target}${parsed.section ? '#' + parsed.section : ''}`,
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
          // Handle click on wikilinks
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;

            // Check if clicked on a wikilink decoration or node
            if (target.classList.contains('wikilink') ||
                target.getAttribute('data-type') === 'wikilink') {
              const targetNote = target.getAttribute('data-target');
              const section = target.getAttribute('data-section') || undefined;

              if (targetNote && onWikilinkClick) {
                event.preventDefault();
                onWikilinkClick(targetNote, section);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + K to insert wikilink
      'Mod-k': () => {
        const input = window.prompt('Lien vers note (format: note, note|alias, ou note#section):');
        if (input) {
          const parsed = parseWikilink(input);
          return this.editor.commands.insertContent({
            type: this.name,
            attrs: {
              target: parsed.target,
              alias: parsed.alias,
              section: parsed.section,
            },
          });
        }
        return false;
      },
    };
  },
});

// Helper to create extension with navigation callback
export function createWikilinkExtension(onNavigate: (target: string, section?: string) => void) {
  return WikilinkExtension.configure({
    onWikilinkClick: onNavigate,
  });
}
