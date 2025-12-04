// ===========================================
// Extension TipTap pour les Wikilinks [[note]]
// (US-030 à US-032)
// ===========================================

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface WikilinkOptions {
  HTMLAttributes: Record<string, any>;
  onWikilinkClick?: (title: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikilink: (title: string) => ReturnType;
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
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
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
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'wikilink',
        class: `wikilink ${!node.attrs.exists ? 'broken' : ''}`,
      }),
      `[[${node.attrs.title}]]`,
    ];
  },

  addCommands() {
    return {
      insertWikilink:
        (title: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { title },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;

    return [
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

              while ((match = wikilinkRegex.exec(text)) !== null) {
                const start = pos + match.index;
                const end = start + match[0].length;

                decorations.push(
                  Decoration.inline(start, end, {
                    class: 'wikilink',
                    'data-title': match[1],
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + K to insert wikilink
      'Mod-k': () => {
        const title = window.prompt('Titre de la note liée:');
        if (title) {
          return this.editor.commands.insertWikilink(title);
        }
        return false;
      },
    };
  },
});
