// ===========================================
// API Client Export (Sprint 4)
// US-080: Export notes en Markdown
// US-081: Export notes en PDF
// ===========================================

export type ExportFormat = 'markdown' | 'json' | 'zip' | 'pdf';

export interface ExportOptions {
  noteIds?: string[];
  folderId?: string;
  format: ExportFormat;
  includeMetadata?: boolean;
  includeAttachments?: boolean;
}

export interface ExportNoteOptions {
  format: 'markdown' | 'json';
  includeMetadata?: boolean;
}

/**
 * Export multiple notes
 */
export async function exportNotes(options: ExportOptions): Promise<Blob> {
  const response = await fetch('/api/v1/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.blob();
}

/**
 * Export a single note as Markdown
 */
export async function exportNoteAsMarkdown(
  noteId: string,
  _includeMetadata = true
): Promise<string> {
  const response = await fetch(
    `/api/v1/export/note/${noteId}?format=markdown`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.text();
}

/**
 * Export a single note as JSON
 */
export async function exportNoteAsJson(noteId: string): Promise<{
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}> {
  const response = await fetch(
    `/api/v1/export/note/${noteId}?format=json`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.json();
}

/**
 * Trigger download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of text content
 */
export function downloadText(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Get file extension for format
 */
export function getExtension(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'md';
    case 'json':
      return 'json';
    case 'zip':
      return 'zip';
    case 'pdf':
      return 'pdf';
    default:
      return 'txt';
  }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'zip':
      return 'application/zip';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'text/plain';
  }
}

/**
 * Export folder as ZIP
 */
export async function exportFolderAsZip(
  folderId: string,
  options?: { includeMetadata?: boolean }
): Promise<Blob> {
  const response = await fetch('/api/v1/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      folderId,
      format: 'zip',
      includeMetadata: options?.includeMetadata ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Export failed');
  }

  return response.blob();
}

/**
 * Export folder as JSON
 */
export async function exportFolderAsJson(
  folderId: string,
  options?: { includeMetadata?: boolean }
): Promise<Blob> {
  const response = await fetch('/api/v1/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      folderId,
      format: 'json',
      includeMetadata: options?.includeMetadata ?? true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Export failed');
  }

  return response.blob();
}
