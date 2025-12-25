// ===========================================
// FEAT-07: Extension Rechercher/Remplacer pour TipTap
// Ctrl+F: Rechercher, Ctrl+H: Rechercher et Remplacer
// ===========================================

import { Extension } from '@tiptap/core';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface SearchReplaceOptions {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface SearchResult {
  from: number;
  to: number;
}

export interface SearchReplaceStorage {
  results: SearchResult[];
  currentIndex: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      setCaseSensitive: (value: boolean) => ReturnType;
      setWholeWord: (value: boolean) => ReturnType;
      setUseRegex: (value: boolean) => ReturnType;
      goToNextResult: () => ReturnType;
      goToPrevResult: () => ReturnType;
      replace: () => ReturnType;
      replaceAll: () => ReturnType;
      clearSearch: () => ReturnType;
    };
  }

  interface ExtensionStorage {
    searchReplace: SearchReplaceStorage;
  }
}

export const searchReplacePluginKey = new PluginKey('searchReplace');

/**
 * Trouve toutes les occurrences du terme de recherche dans le document
 */
function findResults(
  doc: ProseMirrorNode,
  searchTerm: string,
  options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
): SearchResult[] {
  if (!searchTerm) return [];

  const results: SearchResult[] = [];
  let regex: RegExp;

  try {
    if (options.useRegex) {
      regex = new RegExp(searchTerm, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
      regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    }
  } catch {
    return []; // Regex invalide
  }

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let match;
      while ((match = regex.exec(node.text)) !== null) {
        results.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length,
        });
      }
    }
  });

  return results;
}

/**
 * Crée les décorations pour surligner les résultats
 */
function createDecorations(
  doc: ProseMirrorNode,
  results: SearchResult[],
  currentIndex: number
): DecorationSet {
  const decorations: Decoration[] = [];

  results.forEach((result, index) => {
    const className =
      index === currentIndex
        ? 'search-result search-result-current'
        : 'search-result';

    decorations.push(
      Decoration.inline(result.from, result.to, { class: className })
    );
  });

  return DecorationSet.create(doc, decorations);
}

export const SearchReplaceExtension = Extension.create<
  SearchReplaceOptions,
  SearchReplaceStorage
>({
  name: 'searchReplace',

  addOptions() {
    return {
      searchTerm: '',
      replaceTerm: '',
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
    };
  },

  addStorage() {
    return {
      results: [],
      currentIndex: -1,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor }) => {
          this.options.searchTerm = term;
          this.storage.results = findResults(editor.state.doc, term, {
            caseSensitive: this.options.caseSensitive,
            wholeWord: this.options.wholeWord,
            useRegex: this.options.useRegex,
          });
          this.storage.currentIndex =
            this.storage.results.length > 0 ? 0 : -1;
          // Force redraw des décorations
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      setReplaceTerm:
        (term: string) =>
        () => {
          this.options.replaceTerm = term;
          return true;
        },

      setCaseSensitive:
        (value: boolean) =>
        ({ editor }) => {
          this.options.caseSensitive = value;
          if (this.options.searchTerm) {
            this.storage.results = findResults(
              editor.state.doc,
              this.options.searchTerm,
              {
                caseSensitive: value,
                wholeWord: this.options.wholeWord,
                useRegex: this.options.useRegex,
              }
            );
            this.storage.currentIndex =
              this.storage.results.length > 0 ? 0 : -1;
            editor.view.dispatch(editor.state.tr);
          }
          return true;
        },

      setWholeWord:
        (value: boolean) =>
        ({ editor }) => {
          this.options.wholeWord = value;
          if (this.options.searchTerm) {
            this.storage.results = findResults(
              editor.state.doc,
              this.options.searchTerm,
              {
                caseSensitive: this.options.caseSensitive,
                wholeWord: value,
                useRegex: this.options.useRegex,
              }
            );
            this.storage.currentIndex =
              this.storage.results.length > 0 ? 0 : -1;
            editor.view.dispatch(editor.state.tr);
          }
          return true;
        },

      setUseRegex:
        (value: boolean) =>
        ({ editor }) => {
          this.options.useRegex = value;
          if (this.options.searchTerm) {
            this.storage.results = findResults(
              editor.state.doc,
              this.options.searchTerm,
              {
                caseSensitive: this.options.caseSensitive,
                wholeWord: this.options.wholeWord,
                useRegex: value,
              }
            );
            this.storage.currentIndex =
              this.storage.results.length > 0 ? 0 : -1;
            editor.view.dispatch(editor.state.tr);
          }
          return true;
        },

      goToNextResult:
        () =>
        ({ editor }) => {
          if (this.storage.results.length === 0) return false;
          this.storage.currentIndex =
            (this.storage.currentIndex + 1) % this.storage.results.length;
          const result = this.storage.results[this.storage.currentIndex];
          if (!result) return false;
          editor.commands.setTextSelection({ from: result.from, to: result.to });
          // Scroll into view
          editor.commands.scrollIntoView();
          // Force redraw des décorations
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      goToPrevResult:
        () =>
        ({ editor }) => {
          if (this.storage.results.length === 0) return false;
          this.storage.currentIndex =
            (this.storage.currentIndex - 1 + this.storage.results.length) %
            this.storage.results.length;
          const result = this.storage.results[this.storage.currentIndex];
          if (!result) return false;
          editor.commands.setTextSelection({ from: result.from, to: result.to });
          editor.commands.scrollIntoView();
          editor.view.dispatch(editor.state.tr);
          return true;
        },

      replace:
        () =>
        ({ editor, chain }) => {
          if (
            this.storage.currentIndex === -1 ||
            this.storage.results.length === 0
          )
            return false;

          const result = this.storage.results[this.storage.currentIndex];
          if (!result) return false;

          // Sélectionner et remplacer
          chain()
            .setTextSelection({ from: result.from, to: result.to })
            .insertContent(this.options.replaceTerm)
            .run();

          // Recalculer les résultats
          this.storage.results = findResults(
            editor.state.doc,
            this.options.searchTerm,
            {
              caseSensitive: this.options.caseSensitive,
              wholeWord: this.options.wholeWord,
              useRegex: this.options.useRegex,
            }
          );

          // Ajuster l'index
          if (this.storage.results.length === 0) {
            this.storage.currentIndex = -1;
          } else if (this.storage.currentIndex >= this.storage.results.length) {
            this.storage.currentIndex = 0;
          }

          return true;
        },

      replaceAll:
        () =>
        ({ editor, tr, dispatch }) => {
          if (this.storage.results.length === 0) return false;

          // Remplacer de la fin vers le début pour préserver les positions
          const sortedResults = [...this.storage.results].sort(
            (a, b) => b.from - a.from
          );

          if (dispatch) {
            for (const result of sortedResults) {
              tr.insertText(this.options.replaceTerm, result.from, result.to);
            }
            dispatch(tr);
          }

          this.storage.results = [];
          this.storage.currentIndex = -1;
          return true;
        },

      clearSearch:
        () =>
        ({ editor }) => {
          this.options.searchTerm = '';
          this.options.replaceTerm = '';
          this.storage.results = [];
          this.storage.currentIndex = -1;
          // Force redraw pour enlever les décorations
          editor.view.dispatch(editor.state.tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: searchReplacePluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, _oldState, _oldEditorState, newEditorState) {
            // Recalculer les décorations
            return createDecorations(
              newEditorState.doc,
              extensionThis.storage.results,
              extensionThis.storage.currentIndex
            );
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },

  // Les raccourcis clavier sont gérés au niveau du composant NoteEditor
  // pour éviter les problèmes de typage avec les événements personnalisés
});
