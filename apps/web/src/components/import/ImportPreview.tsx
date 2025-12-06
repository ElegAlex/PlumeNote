// ===========================================
// Import Preview Component
// EP-008: Aperçu des fichiers à importer
// ===========================================

import { FileText, Folder, Image } from 'lucide-react';
import type { ImportPreview as ImportPreviewType } from '@collabnotes/types';

interface ImportPreviewProps {
  preview: ImportPreviewType;
}

export function ImportPreview({ preview }: ImportPreviewProps) {
  const hasMoreFiles = preview.markdownFiles.length < preview.totalFiles;

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        <FileText className="w-5 h-5 text-primary" />
        <div>
          <p className="font-medium">{preview.fileName}</p>
          <p className="text-sm text-muted-foreground">
            {preview.totalFiles} fichier(s) Markdown détecté(s)
          </p>
        </div>
      </div>

      {/* Aperçu des dossiers */}
      {preview.directories.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Dossiers ({preview.directories.length})
          </h4>
          <div className="max-h-24 overflow-auto border rounded-md p-2">
            <ul className="text-sm space-y-1">
              {preview.directories.slice(0, 10).map((dir, i) => (
                <li key={i} className="text-muted-foreground truncate">
                  {dir}
                </li>
              ))}
              {preview.directories.length > 10 && (
                <li className="text-muted-foreground/75 italic">
                  et {preview.directories.length - 10} autres...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Aperçu des fichiers */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Fichiers Markdown ({preview.totalFiles})
        </h4>
        <div className="max-h-40 overflow-auto border rounded-md p-2">
          <ul className="text-sm space-y-1">
            {preview.markdownFiles.map((file, i) => (
              <li key={i} className="text-muted-foreground truncate">
                {file}
              </li>
            ))}
            {hasMoreFiles && (
              <li className="text-muted-foreground/75 italic">
                et {preview.totalFiles - preview.markdownFiles.length} autres...
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Aperçu des assets */}
      {preview.assetFiles.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Assets ({preview.assetFiles.length})
          </h4>
          <div className="max-h-24 overflow-auto border rounded-md p-2">
            <ul className="text-sm space-y-1">
              {preview.assetFiles.slice(0, 5).map((file, i) => (
                <li key={i} className="text-muted-foreground truncate">
                  {file}
                </li>
              ))}
              {preview.assetFiles.length > 5 && (
                <li className="text-muted-foreground/75 italic">
                  et {preview.assetFiles.length - 5} autres...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
