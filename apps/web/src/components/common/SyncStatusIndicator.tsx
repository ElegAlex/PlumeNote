// ===========================================
// Indicateur de statut de synchronisation temps réel
// Affiche l'état de la connexion WebSocket
// ===========================================

import { useSyncStatus } from '../../hooks/useSyncStatus';
import { cn } from '../../lib/utils';

// Icons SVG inline pour éviter les dépendances
const WifiIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
    />
  </svg>
);

const WifiOffIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
    />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function SyncStatusIndicator({
  className,
  showLabel = false,
}: SyncStatusIndicatorProps) {
  const status = useSyncStatus();

  const getIcon = () => {
    if (status.error) {
      return <AlertIcon className="h-4 w-4 text-red-500" />;
    }
    if (status.isReconnecting) {
      return <RefreshIcon className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    if (status.isConnected) {
      return <WifiIcon className="h-4 w-4 text-green-500" />;
    }
    return <WifiOffIcon className="h-4 w-4 text-gray-400" />;
  };

  const getMessage = () => {
    if (status.error) {
      return `Erreur: ${status.error}`;
    }
    if (status.isReconnecting) {
      return 'Reconnexion...';
    }
    if (status.isConnected) {
      return 'Synchronisation active';
    }
    return 'Hors ligne';
  };

  const getStatusColor = () => {
    if (status.error) return 'bg-red-100 dark:bg-red-900/20';
    if (status.isReconnecting) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (status.isConnected) return 'bg-green-100 dark:bg-green-900/20';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-md transition-colors',
        getStatusColor(),
        className
      )}
      title={getMessage()}
      role="status"
      aria-label={getMessage()}
    >
      {getIcon()}
      {showLabel && (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {getMessage()}
        </span>
      )}
    </div>
  );
}

/**
 * Version compacte (juste l'icône avec tooltip)
 */
export function SyncStatusDot({ className }: { className?: string }) {
  const status = useSyncStatus();

  const getColor = () => {
    if (status.error) return 'bg-red-500';
    if (status.isReconnecting) return 'bg-yellow-500 animate-pulse';
    if (status.isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getMessage = () => {
    if (status.error) return `Erreur de connexion: ${status.error}`;
    if (status.isReconnecting) return 'Reconnexion en cours...';
    if (status.isConnected) return 'Synchronisation active';
    return 'Hors ligne';
  };

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full transition-colors',
        getColor(),
        className
      )}
      title={getMessage()}
      role="status"
      aria-label={getMessage()}
    />
  );
}
