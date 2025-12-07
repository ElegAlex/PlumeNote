// ===========================================
// Composant FolderCard - Générique
// Carte dossier réutilisable (grid view)
// ===========================================

import { cn } from '../../lib/utils';

// Icons
const FolderIcon = ({ color, className }: { color?: string; className?: string }) => (
  <svg className={cn('h-5 w-5', className)} fill="none" stroke={color || 'currentColor'} viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={cn('h-3.5 w-3.5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export interface FolderCardProps {
  id: string;
  name: string;
  color?: string | null;
  path?: string | null;
  notesCount?: number;
  accessType?: 'OPEN' | 'RESTRICTED';
  onClick: (id: string) => void;
  className?: string;
}

export function FolderCard({
  id,
  name,
  color,
  path,
  notesCount,
  accessType,
  onClick,
  className,
}: FolderCardProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left w-full',
        className
      )}
    >
      <span style={{ color: color ?? 'inherit' }}>
        <FolderIcon color={color ?? undefined} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium truncate">{name}</p>
          {accessType === 'RESTRICTED' && (
            <span className="text-amber-600" title="Accès restreint">
              <LockIcon />
            </span>
          )}
        </div>
        {path && (
          <p className="text-xs text-muted-foreground truncate">{path}</p>
        )}
      </div>
      {typeof notesCount === 'number' && notesCount > 0 && (
        <span className="text-xs text-muted-foreground">{notesCount}</span>
      )}
    </button>
  );
}
