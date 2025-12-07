// ===========================================
// Page d'Accueil Espace Personnel
// Vue des dossiers et notes racines
// ===========================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonalStore } from '../stores/personalStore';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toaster';
import {
  FolderCard,
  NoteCard,
  CreateFolderForm,
  EmptyState,
} from '../components/common';
import { cn } from '../lib/utils';
import type { PersonalSearchResult } from '@plumenote/types';

// Icons
const LockIcon = ({ className }: { className?: string }) => (
  <svg className={cn('h-5 w-5', className)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const FolderIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const FileTextIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// ===========================================
// Composant Principal
// ===========================================

export function PersonalHomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    folders,
    notes,
    searchResults,
    isLoading,
    isSearching,
    isSaving,
    error,
    fetchRootFolders,
    fetchNotes,
    createFolder,
    createNote,
    search,
    clearSearch,
  } = usePersonalStore();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Rediriger les readers
  useEffect(() => {
    if (user?.role?.name === 'reader') {
      navigate('/');
    }
  }, [user, navigate]);

  // Charger les données au montage
  useEffect(() => {
    fetchRootFolders();
    fetchNotes();
  }, [fetchRootFolders, fetchNotes]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search, clearSearch]);

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder({ name });
      toast.success('Dossier créé');
      setIsCreatingFolder(false);
    } catch {
      toast.error('Erreur lors de la création du dossier');
    }
  };

  const handleCreateNote = async () => {
    try {
      const note = await createNote({ title: 'Sans titre' });
      navigate(`/personal/note/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création de la note');
    }
  };

  const handleFolderClick = (id: string) => {
    navigate(`/personal/folder/${id}`);
  };

  const handleNoteClick = (id: string) => {
    navigate(`/personal/note/${id}`);
  };

  if (isLoading && folders.length === 0 && notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-purple-600 dark:text-purple-400">
            <LockIcon />
          </span>
          <h1 className="text-2xl font-bold">Notes personnelles</h1>
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          Votre espace privé. Ces notes sont visibles uniquement par vous.
        </p>

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <SearchIcon />
          </span>
          <Input
            type="text"
            placeholder="Rechercher dans vos notes personnelles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Résultats de recherche */}
        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              {isSearching ? 'Recherche...' : `${searchResults.length} résultat(s)`}
            </h2>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <SearchResultItem key={result.id} result={result} />
                ))}
              </div>
            ) : (
              !isSearching && (
                <p className="text-sm text-muted-foreground">Aucun résultat trouvé</p>
              )
            )}
          </div>
        )}

        {/* Actions */}
        {!searchQuery && (
          <>
            <div className="flex gap-2 mb-6">
              <Button
                variant="outline"
                onClick={() => setIsCreatingFolder(true)}
                disabled={isSaving}
              >
                <PlusIcon />
                <span className="ml-2">Nouveau dossier</span>
              </Button>
              <Button onClick={handleCreateNote} disabled={isSaving}>
                <PlusIcon />
                <span className="ml-2">Nouvelle note</span>
              </Button>
            </div>

            {/* Formulaire création dossier (composant générique) */}
            {isCreatingFolder && (
              <CreateFolderForm
                onSubmit={handleCreateFolder}
                onCancel={() => setIsCreatingFolder(false)}
                isLoading={isSaving}
                className="mb-6"
              />
            )}

            {/* Erreur */}
            {error && (
              <div className="mb-6 p-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
                {error}
              </div>
            )}

            {/* Dossiers (composant générique) */}
            {folders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Dossiers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      id={folder.id}
                      name={folder.name}
                      color={folder.color}
                      path={folder.path}
                      onClick={handleFolderClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Notes (composant générique) */}
            {notes.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Notes</h2>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      id={note.id}
                      title={note.title}
                      updatedAt={note.updatedAt}
                      onClick={handleNoteClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* État vide (composant générique) */}
            {folders.length === 0 && notes.length === 0 && !isLoading && (
              <EmptyState
                icon={<LockIcon className="h-12 w-12" />}
                title="Vous n'avez pas encore de notes personnelles."
                action={{
                  label: 'Créer ma première note',
                  onClick: handleCreateNote,
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Sous-composant spécifique recherche
// ===========================================

function SearchResultItem({ result }: { result: PersonalSearchResult }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/personal/note/${result.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left w-full"
    >
      <span className="text-muted-foreground">
        <FileTextIcon />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{result.title}</p>
        {result.excerpt && (
          <p className="text-sm text-muted-foreground truncate">{result.excerpt}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        Note
      </span>
    </button>
  );
}
