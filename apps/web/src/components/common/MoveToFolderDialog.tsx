// ===========================================
// Composant MoveToFolderDialog - Générique
// Dialog pour déplacer un élément vers un dossier
// ===========================================

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';

// Icons
const FolderIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

export interface FolderTreeNode {
  id: string;
  name: string;
  children: FolderTreeNode[];
}

export interface MoveToFolderDialogProps {
  title?: string;
  folders: FolderTreeNode[];
  currentFolderId?: string | null;
  onMove: (folderId: string | null) => Promise<void>;
  onClose: () => void;
  rootLabel?: string;
}

export function MoveToFolderDialog({
  title = 'Déplacer vers un dossier',
  folders,
  currentFolderId,
  onMove,
  onClose,
  rootLabel = 'Racine (sans dossier)',
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId ?? null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMove = async () => {
    setIsLoading(true);
    try {
      await onMove(selectedFolderId);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border rounded-lg shadow-lg z-50 p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <div className="max-h-60 overflow-auto border rounded-md mb-4">
          {/* Option racine */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2',
              selectedFolderId === null && 'bg-accent'
            )}
          >
            <FolderIcon />
            {rootLabel}
          </button>

          {/* Dossiers */}
          {folders.map((folder) => (
            <FolderOption
              key={folder.id}
              folder={folder}
              selectedId={selectedFolderId}
              onSelect={setSelectedFolderId}
              level={0}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleMove} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : 'Déplacer'}
          </Button>
        </div>
      </div>
    </>
  );
}

interface FolderOptionProps {
  folder: FolderTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  level: number;
}

function FolderOption({ folder, selectedId, onSelect, level }: FolderOptionProps) {
  return (
    <>
      <button
        onClick={() => onSelect(folder.id)}
        className={cn(
          'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2',
          selectedId === folder.id && 'bg-accent'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <FolderIcon />
        {folder.name}
      </button>
      {folder.children.map((child) => (
        <FolderOption
          key={child.id}
          folder={child}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      ))}
    </>
  );
}
