// ===========================================
// Liste des Collaborateurs (Indicateurs de présence)
// (US-041, US-042 - Sprint 3-4)
// ===========================================

import { CollaboratorInfo } from '../../hooks/useCollaboration';
import { cn } from '../../lib/utils';

interface CollaboratorListProps {
  collaborators: CollaboratorInfo[];
  maxVisible?: number;
}

export function CollaboratorList({
  collaborators,
  maxVisible = 5,
}: CollaboratorListProps) {
  if (collaborators.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Vous êtes seul sur cette note
      </span>
    );
  }

  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const remainingCount = collaborators.length - maxVisible;

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-2">
        {collaborators.length} collaborateur{collaborators.length > 1 ? 's' : ''}
      </span>

      <div className="flex -space-x-2">
        {visibleCollaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="relative group"
          >
            {/* Avatar */}
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-background"
              style={{ backgroundColor: collaborator.color }}
              title={collaborator.name}
            >
              {collaborator.name.charAt(0).toUpperCase()}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {collaborator.name}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"
              />
            </div>

            {/* Online indicator */}
            <span
              className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background"
            />
          </div>
        ))}

        {/* Remaining count */}
        {remainingCount > 0 && (
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium border-2 border-background"
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

// Curseur collaboratif stylisé
export function CollaboratorCursor({
  color,
  name,
}: {
  color: string;
  name: string;
}) {
  return (
    <span
      className="collaboration-cursor__caret"
      style={{ borderColor: color }}
    >
      <span
        className="collaboration-cursor__label"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </span>
  );
}
