// ===========================================
// Composant Sidebar - Arborescence des dossiers
// ===========================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFoldersStore } from '../../stores/folders';
import { useNotesStore } from '../../stores/notes';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { toast } from '../ui/Toaster';
import { cn } from '../../lib/utils';
import type { FolderTreeNode } from '@collabnotes/types';

export function Sidebar() {
  const navigate = useNavigate();
  const {
    tree,
    expandedFolders,
    selectedFolderId,
    isLoading,
    fetchTree,
    toggleFolder,
    selectFolder,
    createFolder,
  } = useFoldersStore();

  const { createNote } = useNotesStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderForNew, setParentFolderForNew] = useState<string | null>(null);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName, parentFolderForNew);
      setNewFolderName('');
      setIsCreatingFolder(false);
      setParentFolderForNew(null);
      toast.success('Dossier créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleCreateNote = async (folderId: string | null) => {
    try {
      const note = await createNote({
        title: 'Sans titre',
        folderId: folderId || undefined,
      });
      navigate(`/notes/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const renderFolderNode = (node: FolderTreeNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors',
            isSelected ? 'bg-muted' : 'hover:bg-muted/50'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => selectFolder(node.id)}
        >
          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node.id);
            }}
            className="h-4 w-4 flex items-center justify-center"
          >
            {hasChildren && (
              <svg
                className={cn(
                  'h-3 w-3 transition-transform',
                  isExpanded && 'rotate-90'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>

          {/* Folder Icon */}
          <svg
            className="h-4 w-4 flex-shrink-0"
            style={{ color: node.color || 'currentColor' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isExpanded
                  ? 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z'
                  : 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
              }
            />
          </svg>

          {/* Name */}
          <span className="flex-1 truncate text-sm">{node.name}</span>

          {/* Actions */}
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNote(node.id);
              }}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
              title="Nouvelle note"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setParentFolderForNew(node.id);
                setIsCreatingFolder(true);
              }}
              className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
              title="Nouveau sous-dossier"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* Note count */}
          {node.noteCount !== undefined && node.noteCount > 0 && (
            <span className="text-xs text-muted-foreground">{node.noteCount}</span>
          )}
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderFolderNode(child, depth + 1))}
          </div>
        )}

        {/* Notes in folder */}
        {isExpanded && node.notes && node.notes.length > 0 && (
          <div>
            {node.notes.map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/notes/${note.id}`)}
                className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="truncate text-sm">{note.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Dossiers
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => {
            setParentFolderForNew(null);
            setIsCreatingFolder(true);
          }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Button>
      </div>

      {/* New Folder Input */}
      {isCreatingFolder && (
        <div className="mb-2 px-2">
          <div className="flex gap-1">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }
              }}
            />
            <Button
              size="sm"
              className="h-7"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Folder Tree */}
      <div className="space-y-0.5">
        {tree.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4 text-center">
            Aucun dossier
          </p>
        ) : (
          tree.map((node) => renderFolderNode(node))
        )}
      </div>
    </div>
  );
}
