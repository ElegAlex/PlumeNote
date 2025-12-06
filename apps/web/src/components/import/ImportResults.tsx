// ===========================================
// Import Results Component
// EP-008: Affichage des résultats d'import
// ===========================================

import { CheckCircle, XCircle, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ImportJobDetail, ImportFileResult } from '@collabnotes/types';
import { Button } from '../ui/Button';

interface ImportResultsProps {
  job: ImportJobDetail;
  onClose: () => void;
}

export function ImportResults({ job, onClose }: ImportResultsProps) {
  const navigate = useNavigate();
  const results = job.results || [];

  const successResults = results.filter(r => r.status === 'success' || r.status === 'renamed');
  const skippedResults = results.filter(r => r.status === 'skipped');
  const errorResults = results.filter(r => r.status === 'error');

  const handleNavigateToNote = (noteId: string) => {
    onClose();
    // Naviguer vers la note (utiliser l'ID pour trouver le slug)
    navigate(`/notes/${noteId}`);
  };

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${
        job.status === 'COMPLETED' ? 'bg-green-500/10' : 'bg-red-500/10'
      }`}>
        {job.status === 'COMPLETED' ? (
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-6 h-6 text-destructive flex-shrink-0" />
        )}
        <div>
          <p className="font-medium">
            {job.status === 'COMPLETED' ? 'Import terminé' : "L'import a échoué"}
          </p>
          <p className="text-sm text-muted-foreground">
            {job.successCount} note(s) importée(s), {job.warningCount} ignorée(s), {job.errorCount} erreur(s)
          </p>
        </div>
      </div>

      {/* Notes importées avec succès */}
      {successResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Notes importées ({successResults.length})
          </h4>
          <div className="max-h-40 overflow-auto border rounded-md divide-y">
            {successResults.slice(0, 10).map((result, i) => (
              <div key={i} className="p-2 flex items-center justify-between hover:bg-muted/50">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{result.noteTitle || result.file}</p>
                    {result.status === 'renamed' && (
                      <p className="text-xs text-muted-foreground">
                        Renommé: {result.renamedTo}
                      </p>
                    )}
                  </div>
                </div>
                {result.noteId && (
                  <button
                    onClick={() => handleNavigateToNote(result.noteId!)}
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    Voir <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {successResults.length > 10 && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                et {successResults.length - 10} autres...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fichiers ignorés */}
      {skippedResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Fichiers ignorés ({skippedResults.length})
          </h4>
          <div className="max-h-32 overflow-auto border rounded-md p-2">
            <ul className="text-sm space-y-1">
              {skippedResults.slice(0, 5).map((result, i) => (
                <li key={i} className="text-muted-foreground truncate flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  {result.file} - {result.noteTitle || 'Note existante'}
                </li>
              ))}
              {skippedResults.length > 5 && (
                <li className="text-muted-foreground/75 italic">
                  et {skippedResults.length - 5} autres...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Erreurs */}
      {errorResults.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Erreurs ({errorResults.length})
          </h4>
          <div className="max-h-32 overflow-auto border border-destructive/25 rounded-md p-2 bg-destructive/5">
            <ul className="text-sm space-y-1">
              {errorResults.slice(0, 5).map((result, i) => (
                <li key={i} className="text-destructive truncate">
                  {result.file}: {result.error}
                </li>
              ))}
              {errorResults.length > 5 && (
                <li className="text-muted-foreground/75 italic">
                  et {errorResults.length - 5} autres...
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}
