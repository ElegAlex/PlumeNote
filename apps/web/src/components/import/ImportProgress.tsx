// ===========================================
// Import Progress Component
// EP-008: Affichage de la progression de l'import
// ===========================================

import { Loader2, CheckCircle, XCircle, FileText, Folder, Link } from 'lucide-react';
import type { ImportJobDetail } from '@plumenote/types';

interface ImportProgressProps {
  job: ImportJobDetail;
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente...',
  EXTRACTING: 'Extraction du ZIP...',
  PARSING: 'Analyse des fichiers Markdown...',
  CREATING: 'Création des notes et dossiers...',
  RESOLVING: 'Résolution des wikilinks...',
  COMPLETED: 'Import terminé !',
  FAILED: "Échec de l'import",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />,
  EXTRACTING: <Folder className="w-5 h-5 text-primary animate-pulse" />,
  PARSING: <FileText className="w-5 h-5 text-primary animate-pulse" />,
  CREATING: <FileText className="w-5 h-5 text-primary animate-pulse" />,
  RESOLVING: <Link className="w-5 h-5 text-primary animate-pulse" />,
  COMPLETED: <CheckCircle className="w-5 h-5 text-green-500" />,
  FAILED: <XCircle className="w-5 h-5 text-destructive" />,
};

export function ImportProgress({ job }: ImportProgressProps) {
  const progress = job.totalFiles > 0
    ? Math.round((job.processedFiles / job.totalFiles) * 100)
    : 0;

  const isInProgress = !['COMPLETED', 'FAILED'].includes(job.status);

  return (
    <div className="space-y-6">
      {/* Statut */}
      <div className="flex items-center gap-3">
        {statusIcons[job.status]}
        <span className="font-medium">{statusLabels[job.status]}</span>
      </div>

      {/* Barre de progression */}
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{job.processedFiles} / {job.totalFiles} fichiers</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              job.status === 'FAILED' ? 'bg-destructive' :
              job.status === 'COMPLETED' ? 'bg-green-500' :
              'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{job.successCount}</div>
          <div className="text-sm text-green-700">Succès</div>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{job.warningCount}</div>
          <div className="text-sm text-yellow-700">Ignorés</div>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{job.errorCount}</div>
          <div className="text-sm text-red-700">Erreurs</div>
        </div>
      </div>

      {/* Message en cours */}
      {isInProgress && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          Traitement en cours, veuillez patienter...
        </p>
      )}
    </div>
  );
}
