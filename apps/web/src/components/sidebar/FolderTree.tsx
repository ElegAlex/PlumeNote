// ===========================================
// Composant FolderTree - P0
// Arborescence des dossiers avec lazy loading
// ===========================================

import { useEffect } from 'react';
import { useSidebarStore } from '../../stores/sidebarStore';
import { FolderItem } from './FolderItem';
import { Spinner } from '../ui/Spinner';

interface FolderTreeProps {
  onCreateNote?: (folderId: string) => void;
  onCreateFolder?: (name: string, parentId: string) => Promise<void>;
}

export function FolderTree({ onCreateNote, onCreateFolder }: FolderTreeProps) {
  const { tree, isLoading, error, fetchTree } = useSidebarStore();

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (isLoading && tree.length === 0) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Erreur de chargement : {error}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Aucun dossier. Créez-en un pour commencer.
      </div>
    );
  }

  return (
    <nav className="folder-tree" role="tree" aria-label="Arborescence des dossiers">
      <ul className="space-y-0.5">
        {tree.map((folder, index) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            rootIndex={index}
            onCreateNote={onCreateNote}
            onCreateFolder={onCreateFolder}
          />
        ))}
      </ul>
    </nav>
  );
}
