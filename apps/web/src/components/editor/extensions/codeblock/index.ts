// ===========================================
// Extension CodeBlock avec coloration syntaxique
// Utilise lowlight pour le highlighting
// ===========================================

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

// Créer une instance lowlight avec les langages communs
const lowlight = createLowlight(common);

// Liste des langages supportés pour l'autocomplétion
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'sql',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'xml',
  'graphql',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Extension CodeBlock avec coloration syntaxique via lowlight
 *
 * Fonctionnalités:
 * - Coloration syntaxique automatique pour les langages courants
 * - Sélecteur de langage au-dessus du bloc
 * - Bouton de copie
 * - Numérotation des lignes (optionnel via CSS)
 */
export const CodeBlockHighlightExtension = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: (element) => {
          const { languageClassPrefix } = this.options;
          // Chercher la classe de langage (ex: language-javascript)
          const codeElement = element.querySelector('code');
          const classAttr = codeElement?.getAttribute('class');
          if (!classAttr) return null;

          const regex = new RegExp(`^${languageClassPrefix}([\\w-]+)`, 'gi');
          const match = regex.exec(classAttr);
          return match?.[1] || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.language) {
            return {};
          }
          return {
            class: `${this.options.languageClassPrefix}${attributes.language}`,
          };
        },
      },
    };
  },
}).configure({
  lowlight,
  languageClassPrefix: 'language-',
  HTMLAttributes: {
    class: 'code-block-highlight not-prose',
  },
});

// Export par défaut
export default CodeBlockHighlightExtension;
