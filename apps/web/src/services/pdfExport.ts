// ===========================================
// Service Export PDF (Sprint 4)
// Génération PDF côté client avec html2pdf.js
// ===========================================

import html2pdf from 'html2pdf.js';

export interface PdfExportOptions {
  title: string;
  filename?: string;
  margin?: number;
  pageSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
}

const DEFAULT_OPTIONS: Required<Omit<PdfExportOptions, 'title' | 'headerText'>> = {
  filename: 'export.pdf',
  margin: 15,
  pageSize: 'a4',
  orientation: 'portrait',
  includeHeader: true,
  includeFooter: true,
};

/**
 * Export HTML content to PDF
 */
export async function exportToPdf(
  htmlContent: string,
  options: PdfExportOptions
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const filename = opts.filename || `${slugify(opts.title)}.pdf`;

  // Create a wrapper with proper styling
  const wrapper = document.createElement('div');
  wrapper.innerHTML = createPdfTemplate(htmlContent, opts);

  const pdfOptions = {
    margin: opts.margin,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: opts.pageSize,
      orientation: opts.orientation,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(pdfOptions).from(wrapper).save();
}

/**
 * Export note content to PDF
 */
export async function exportNoteToPdf(
  note: {
    title: string;
    content: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
  },
  options?: Partial<PdfExportOptions>
): Promise<void> {
  const htmlContent = createNoteHtml(note);

  await exportToPdf(htmlContent, {
    title: note.title,
    filename: `${slugify(note.title)}.pdf`,
    headerText: note.title,
    ...options,
  });
}

/**
 * Export editor element directly to PDF
 */
export async function exportEditorToPdf(
  editorElement: HTMLElement,
  options: PdfExportOptions
): Promise<void> {
  const clone = editorElement.cloneNode(true) as HTMLElement;

  // Clean up editor-specific classes
  clone.querySelectorAll('[contenteditable]').forEach((el) => {
    el.removeAttribute('contenteditable');
  });

  // Remove any UI elements
  clone.querySelectorAll('.ProseMirror-gapcursor, .collaboration-cursor').forEach((el) => {
    el.remove();
  });

  await exportToPdf(clone.innerHTML, options);
}

/**
 * Create PDF template with header/footer
 */
function createPdfTemplate(
  content: string,
  options: Required<Omit<PdfExportOptions, 'title' | 'headerText'>> & { title: string; headerText?: string }
): string {
  const headerHtml = options.includeHeader
    ? `<header class="pdf-header">
        <h1>${options.headerText || options.title}</h1>
        <div class="pdf-date">${new Date().toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</div>
      </header>`
    : '';

  const footerHtml = options.includeFooter
    ? `<footer class="pdf-footer">
        <span>Exporté depuis PlumeNote</span>
      </footer>`
    : '';

  return `
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1a1a1a;
      }
      .pdf-header {
        border-bottom: 2px solid #e5e5e5;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .pdf-header h1 {
        margin: 0 0 5px 0;
        font-size: 18pt;
        color: #333;
      }
      .pdf-date {
        font-size: 10pt;
        color: #666;
      }
      .pdf-footer {
        border-top: 1px solid #e5e5e5;
        padding-top: 10px;
        margin-top: 20px;
        font-size: 9pt;
        color: #999;
        text-align: center;
      }
      .pdf-content {
        min-height: 200mm;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #333;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        page-break-after: avoid;
      }
      h1 { font-size: 16pt; }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
      p {
        margin: 0.8em 0;
      }
      ul, ol {
        margin: 0.8em 0;
        padding-left: 1.5em;
      }
      li {
        margin: 0.3em 0;
      }
      code {
        font-family: 'Courier New', monospace;
        background-color: #f5f5f5;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-size: 0.9em;
      }
      pre {
        background-color: #f5f5f5;
        padding: 1em;
        border-radius: 5px;
        overflow-x: auto;
        page-break-inside: avoid;
      }
      pre code {
        background: none;
        padding: 0;
      }
      blockquote {
        border-left: 4px solid #ddd;
        margin: 1em 0;
        padding-left: 1em;
        color: #666;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f5f5f5;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a {
        color: #0066cc;
        text-decoration: none;
      }
      .task-list-item {
        list-style: none;
        margin-left: -1.5em;
      }
      .task-list-item input[type="checkbox"] {
        margin-right: 0.5em;
      }
      .note-metadata {
        background-color: #f9f9f9;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 20px;
        font-size: 10pt;
        color: #666;
      }
      .note-tags {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-top: 5px;
      }
      .note-tag {
        background-color: #e0e0e0;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 9pt;
      }
    </style>
    ${headerHtml}
    <div class="pdf-content">
      ${content}
    </div>
    ${footerHtml}
  `;
}

/**
 * Create HTML for note with metadata
 */
function createNoteHtml(note: {
  title: string;
  content: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}): string {
  let metadataHtml = '';

  if (note.author || note.createdAt || note.tags?.length) {
    metadataHtml = '<div class="note-metadata">';

    if (note.author) {
      metadataHtml += `<div><strong>Auteur:</strong> ${note.author}</div>`;
    }

    if (note.createdAt) {
      const date = new Date(note.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      metadataHtml += `<div><strong>Créé le:</strong> ${date}</div>`;
    }

    if (note.updatedAt) {
      const date = new Date(note.updatedAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      metadataHtml += `<div><strong>Modifié le:</strong> ${date}</div>`;
    }

    if (note.tags && note.tags.length > 0) {
      metadataHtml += '<div class="note-tags">';
      metadataHtml += note.tags.map((tag) => `<span class="note-tag">${tag}</span>`).join('');
      metadataHtml += '</div>';
    }

    metadataHtml += '</div>';
  }

  return `${metadataHtml}${note.content}`;
}

/**
 * Slugify a string for filename
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
