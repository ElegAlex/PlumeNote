// ===========================================
// Import Wizard Component
// EP-008: Assistant d'import de notes Markdown
// ===========================================

import { useState, useEffect } from 'react';
import { Upload, FolderInput, AlertCircle, X } from 'lucide-react';
import { useImportStore } from '../../stores/importStore';
import { useFoldersStore } from '../../stores/folders';
import { Button } from '../ui/Button';
import { UploadDropzone } from './UploadDropzone';
import { ImportPreview as ImportPreviewComponent } from './ImportPreview';
import { ImportProgress } from './ImportProgress';
import { ImportResults } from './ImportResults';
import type { ConflictStrategy } from '@plumenote/types';
import { cn } from '../../lib/utils';

type Step = 'upload' | 'configure' | 'processing' | 'results';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
}

interface FolderOption {
  id: string;
  name: string;
  path: string;
  level: number;
}

export function ImportWizard({ open, onClose }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>();
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('RENAME');

  const {
    preview,
    currentJob,
    isUploading,
    isProcessing,
    error,
    uploadZip,
    startImport,
    clearPreview,
    clearError,
  } = useImportStore();

  const { tree, fetchTree } = useFoldersStore();

  // Charger l'arbre des dossiers
  useEffect(() => {
    if (open) {
      fetchTree();
    }
  }, [open, fetchTree]);

  // Passer aux résultats quand l'import est terminé
  useEffect(() => {
    if (step === 'processing' && currentJob) {
      if (currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED') {
        setStep('results');
      }
    }
  }, [step, currentJob]);

  // Extraire les dossiers en liste plate
  const flattenFolders = (nodes: any[], level = 0): FolderOption[] => {
    const result: FolderOption[] = [];
    for (const node of nodes) {
      if (!node.isPersonal) {
        result.push({
          id: node.id,
          name: node.name,
          path: node.path || `/${node.name}`,
          level,
        });
        if (node.children?.length) {
          result.push(...flattenFolders(node.children, level + 1));
        }
      }
    }
    return result;
  };

  const folderOptions = flattenFolders(tree);

  const handleFileSelect = async (file: File) => {
    try {
      await uploadZip(file);
      setStep('configure');
    } catch {
      // Erreur gérée par le store
    }
  };

  const handleStartImport = async () => {
    if (!preview) return;

    try {
      await startImport(preview.id, { targetFolderId, conflictStrategy });
      setStep('processing');
    } catch {
      // Erreur gérée par le store
    }
  };

  const handleClose = () => {
    // Rafraichir les dossiers si l'import a reussi
    if (currentJob?.status === 'COMPLETED') {
      fetchTree();
    }
    clearPreview();
    clearError();
    setStep('upload');
    setTargetFolderId(undefined);
    setConflictStrategy('RENAME');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={step !== 'processing' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border rounded-lg shadow-lg z-50 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer des notes Markdown
          </h2>
          {step !== 'processing' && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto flex-1">
          {/* Erreur globale */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
              <button onClick={clearError} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Étape 1: Upload */}
          {step === 'upload' && (
            <UploadDropzone
              onFileSelect={handleFileSelect}
              isLoading={isUploading}
            />
          )}

          {/* Étape 2: Configuration */}
          {step === 'configure' && preview && (
            <div className="space-y-6">
              <ImportPreviewComponent preview={preview} />

              <div className="space-y-4">
                {/* Sélection du dossier de destination */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dossier de destination
                  </label>
                  <select
                    value={targetFolderId || ''}
                    onChange={(e) => setTargetFolderId(e.target.value || undefined)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">Racine (aucun dossier parent)</option>
                    {folderOptions.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {'  '.repeat(folder.level)}{folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stratégie de conflit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    En cas de conflit de nom
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflict"
                        value="RENAME"
                        checked={conflictStrategy === 'RENAME'}
                        onChange={() => setConflictStrategy('RENAME')}
                        className="text-primary"
                      />
                      <span className="text-sm">Renommer la nouvelle note</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflict"
                        value="SKIP"
                        checked={conflictStrategy === 'SKIP'}
                        onChange={() => setConflictStrategy('SKIP')}
                        className="text-primary"
                      />
                      <span className="text-sm">Ignorer (conserver l'existante)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conflict"
                        value="OVERWRITE"
                        checked={conflictStrategy === 'OVERWRITE'}
                        onChange={() => setConflictStrategy('OVERWRITE')}
                        className="text-primary"
                      />
                      <span className="text-sm">Écraser l'existante</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Retour
                </Button>
                <Button onClick={handleStartImport}>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Importer {preview.totalFiles} fichier(s)
                </Button>
              </div>
            </div>
          )}

          {/* Étape 3: Traitement */}
          {step === 'processing' && currentJob && (
            <ImportProgress job={currentJob} />
          )}

          {/* Étape 4: Résultats */}
          {step === 'results' && currentJob && (
            <ImportResults job={currentJob} onClose={handleClose} />
          )}
        </div>
      </div>
    </>
  );
}
