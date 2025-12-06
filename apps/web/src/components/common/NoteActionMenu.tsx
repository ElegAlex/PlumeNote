// ===========================================
// NoteActionMenu - Menu contextuel unifié pour les notes
// Utilisé par NotePage et PersonalNotePage
// ===========================================

import { ActionMenu } from './ActionMenu';
import type { ActionMenuItem } from './ActionMenu';

// Icons
const TocIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const SplitIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export interface NoteActionMenuProps {
  noteId: string;
  isPersonal: boolean;
  onShowToc?: () => void;
  onShowLinks?: () => void;
  onShowHistory?: () => void;
  onMoveClick: () => void;
  onSplitView: () => void;
  onDelete: () => void;
}

export function NoteActionMenu({
  isPersonal,
  onShowToc,
  onShowLinks,
  onShowHistory,
  onMoveClick,
  onSplitView,
  onDelete,
}: NoteActionMenuProps) {
  const items: ActionMenuItem[] = [];

  // Plan (si callback fourni)
  if (onShowToc) {
    items.push({ label: 'Plan', icon: <TocIcon />, onClick: onShowToc });
  }

  // Liens de la note (si callback fourni)
  if (onShowLinks) {
    items.push({ label: 'Liens de la note', icon: <LinkIcon />, onClick: onShowLinks });
  }

  // Historique des versions (si callback fourni)
  if (onShowHistory) {
    items.push({ label: 'Historique des versions', icon: <HistoryIcon />, onClick: onShowHistory, dividerBefore: items.length > 0 });
  }

  // Déplacer vers...
  items.push({ label: 'Déplacer vers...', icon: <FolderIcon />, onClick: onMoveClick, dividerBefore: items.length > 0 });

  // Ouvrir en Split View
  items.push({ label: 'Ouvrir en Split View', icon: <SplitIcon />, onClick: onSplitView });

  // Supprimer
  items.push({ label: 'Supprimer', icon: <TrashIcon />, onClick: onDelete, variant: 'destructive', dividerBefore: true });

  return <ActionMenu items={items} />;
}
