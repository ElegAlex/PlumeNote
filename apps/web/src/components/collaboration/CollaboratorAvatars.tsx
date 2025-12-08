// ===========================================
// Avatars des Collaborateurs (US-031)
// Affiche les utilisateurs qui éditent la même note
// ===========================================

import { cn } from '../../lib/utils';
import type { CollaboratorInfo } from '../../hooks/useCollaboration';

interface CollaboratorAvatarsProps {
  /** Liste des collaborateurs connectés */
  collaborators: CollaboratorInfo[];
  /** Nombre maximum d'avatars à afficher */
  maxDisplay?: number;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Génère les initiales à partir d'un nom
 */
function getInitials(name: string): string {
  if (!name || name === 'Anonymous') return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

/**
 * Composant Avatar individuel
 */
function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'w-7 h-7 rounded-full text-xs font-semibold text-white',
        'ring-2 ring-background',
        'transition-transform hover:scale-110 hover:z-10',
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
}

/**
 * Compteur pour les collaborateurs supplémentaires
 */
function MoreIndicator({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'w-7 h-7 rounded-full text-xs font-semibold',
        'bg-muted text-muted-foreground',
        'ring-2 ring-background',
        className
      )}
      title={`${count} autres collaborateurs`}
    >
      +{count}
    </div>
  );
}

export function CollaboratorAvatars({
  collaborators,
  maxDisplay = 4,
  className,
}: CollaboratorAvatarsProps) {
  if (collaborators.length === 0) {
    return null;
  }

  const displayedCollaborators = collaborators.slice(0, maxDisplay);
  const remainingCount = collaborators.length - maxDisplay;

  return (
    <div
      className={cn(
        'flex items-center',
        className
      )}
    >
      {/* Avatars empilés */}
      <div className="flex -space-x-2">
        {displayedCollaborators.map((collaborator) => (
          <Avatar
            key={collaborator.id}
            name={collaborator.name}
            color={collaborator.color}
          />
        ))}

        {/* Indicateur de collaborateurs supplémentaires */}
        {remainingCount > 0 && (
          <MoreIndicator count={remainingCount} />
        )}
      </div>

      {/* Texte optionnel */}
      {collaborators.length === 1 && collaborators[0] && (
        <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
          {collaborators[0].name} édite
        </span>
      )}
      {collaborators.length > 1 && (
        <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
          {collaborators.length} personnes éditent
        </span>
      )}
    </div>
  );
}
