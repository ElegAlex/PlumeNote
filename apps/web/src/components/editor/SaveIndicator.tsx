// ===========================================
// Indicateur de statut de sauvegarde
// US-009: Feedback visuel sur l'état de sauvegarde
// ===========================================

import { cn } from '../../lib/utils';
import { formatRelativeTime } from '../../lib/utils';
import type { SaveStatus } from '../../hooks/useAutoSave';

interface SaveIndicatorProps {
  /** Statut actuel de la sauvegarde */
  status: SaveStatus;
  /** Date de dernière sauvegarde réussie */
  lastSaved: Date | null;
  /** Message d'erreur à afficher */
  errorMessage?: string | null;
  /** Callback pour réessayer après une erreur */
  onRetry?: () => void;
  /** Classes CSS additionnelles */
  className?: string;
}

export function SaveIndicator({
  status,
  lastSaved,
  errorMessage,
  onRetry,
  className,
}: SaveIndicatorProps) {
  // État idle: rien affiché
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm transition-all duration-200',
        className
      )}
    >
      {status === 'pending' && (
        <>
          <PendingIcon />
          <span className="text-muted-foreground">
            Modifications non enregistrées
          </span>
        </>
      )}

      {status === 'saving' && (
        <>
          <SavingSpinner />
          <span className="text-muted-foreground">Enregistrement...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckIcon />
          <span className="text-green-600 dark:text-green-500">
            {lastSaved ? `Enregistré ${formatRelativeTime(lastSaved)}` : 'Enregistré'}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <ErrorIcon />
          <span className="text-destructive">
            {errorMessage || 'Erreur de sauvegarde'}
          </span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 text-destructive hover:underline focus:outline-none focus:ring-2 focus:ring-destructive/50 rounded px-1"
            >
              Réessayer
            </button>
          )}
        </>
      )}
    </div>
  );
}

// --- Icônes inline pour éviter les dépendances ---

function PendingIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

function SavingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-green-600 dark:text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="h-4 w-4 text-destructive"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
