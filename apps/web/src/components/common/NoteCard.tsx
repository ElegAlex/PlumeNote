// ===========================================
// Composant NoteCard - Générique
// Carte note réutilisable (list view)
// ===========================================

import { cn } from '../../lib/utils';

// Icons
const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export interface NoteCardProps {
  id: string;
  title: string;
  excerpt?: string | null;
  updatedAt: string;
  onClick: (id: string) => void;
  className?: string;
  iconClassName?: string;
}

export function NoteCard({
  id,
  title,
  excerpt,
  updatedAt,
  onClick,
  className,
  iconClassName,
}: NoteCardProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left w-full',
        className
      )}
    >
      <span className={cn('text-muted-foreground', iconClassName)}>
        <FileTextIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        {excerpt && (
          <p className="text-sm text-muted-foreground truncate">{excerpt}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatDate(updatedAt)}
      </span>
    </button>
  );
}

// Helper
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}
