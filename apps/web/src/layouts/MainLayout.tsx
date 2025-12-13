// ===========================================
// Layout Principal avec Sidebar (US-020 à US-024)
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useImportStore } from '../stores/importStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useNotesStore } from '../stores/notes';
import { useSidebarStore } from '../stores/sidebarStore';
import { useFoldersStore } from '../stores/folders';
import { Button } from '../components/ui/Button';
import { Sidebar } from '../components/sidebar/Sidebar';
import { ShortcutsModal } from '../components/shortcuts/ShortcutsModal';
import { ImportWizard } from '../components/import';
import { EventDetailModal } from '../components/calendar/EventDetailModal';
import { TutorialModal, TUTORIAL_VERSION } from '../components/tutorial';
import { SyncStatusDot } from '../components/common/SyncStatusIndicator';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isWizardOpen, openWizard, closeWizard } = useImportStore();
  const { markTutorialCompleted, isInitialized } = usePreferencesStore();
  const { createNote } = useNotesStore();
  const { addNoteToFolder, addFolderToTree, fetchTree } = useSidebarStore();
  const { createFolder } = useFoldersStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Helper pour créer une nouvelle note
  const handleNewNote = useCallback(async () => {
    if (isCreatingNote) return;
    setIsCreatingNote(true);
    try {
      const note = await createNote({ title: 'Sans titre' });
      if (note.folderId) {
        addNoteToFolder(note.folderId, {
          id: note.id,
          title: note.title,
          slug: note.slug,
          position: 0,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        });
      }
      await fetchTree();
      navigate(`/notes/${note.id}`);
    } catch {
      toast.error('Erreur lors de la création de la note');
    } finally {
      setIsCreatingNote(false);
    }
  }, [createNote, addNoteToFolder, fetchTree, navigate, isCreatingNote]);

  // Helper pour créer un nouveau dossier
  const handleNewFolder = useCallback(async () => {
    if (isCreatingFolder) return;
    setIsCreatingFolder(true);
    try {
      const folderName = window.prompt('Nom du nouveau dossier:');
      if (folderName?.trim()) {
        const newFolder = await createFolder(folderName.trim(), null);
        // Mise à jour optimiste de la sidebar
        addFolderToTree({
          id: newFolder.id,
          name: newFolder.name,
          slug: newFolder.slug,
          parentId: null,
          color: newFolder.color || null,
          icon: newFolder.icon || null,
          position: newFolder.position || 0,
          hasChildren: false,
          notesCount: 0,
          children: [],
          notes: [],
          isLoaded: true,
        }, null);
        toast.success('Dossier créé');
      }
    } catch {
      toast.error('Erreur lors de la création du dossier');
    } finally {
      setIsCreatingFolder(false);
    }
  }, [createFolder, addFolderToTree, isCreatingFolder]);

  // Raccourcis globaux
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // === RACCOURCIS GLOBAUX (fonctionnent partout, même dans l'éditeur) ===

      // Cmd+K → Recherche rapide
      if (isMod && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        navigate('/search');
        return;
      }

      // Cmd+? ou Cmd+/ → Raccourcis clavier
      if (isMod && (e.key === '?' || e.key === '/')) {
        e.preventDefault();
        e.stopPropagation();
        setShowShortcutsModal(true);
        return;
      }

      // Cmd+, → Paramètres
      if (isMod && !e.shiftKey && e.key === ',') {
        e.preventDefault();
        e.stopPropagation();
        navigate('/settings');
        return;
      }

      // Cmd+\ → Toggle sidebar
      if (isMod && !e.shiftKey && e.key === '\\') {
        e.preventDefault();
        e.stopPropagation();
        setIsSidebarCollapsed(prev => !prev);
        return;
      }

      // Cmd+Shift+E → Accueil
      if (isMod && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/');
        return;
      }

      // Cmd+Shift+F → Page recherche
      if (isMod && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/search');
        return;
      }

      // Alt+N → Nouvelle note (Ctrl+N est bloqué par le navigateur)
      if (e.altKey && !e.shiftKey && !isMod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        handleNewNote();
        return;
      }

      // Alt+Shift+N → Nouveau dossier
      if (e.altKey && e.shiftKey && !isMod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        handleNewFolder();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [navigate, handleNewNote, handleNewFolder]);

  // Afficher le tutoriel à la première connexion (une seule fois par session navigateur)
  useEffect(() => {
    const tutorialSessionKey = 'plumenote-tutorial-checked';
    const alreadyChecked = sessionStorage.getItem(tutorialSessionKey);

    if (isInitialized && !alreadyChecked) {
      sessionStorage.setItem(tutorialSessionKey, 'true');
      const shouldShow = usePreferencesStore.getState().shouldShowTutorial(TUTORIAL_VERSION);
      if (shouldShow) {
        // Petit délai pour laisser l'UI se charger
        const timer = setTimeout(() => setShowTutorial(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isInitialized]);

  const handleTutorialComplete = () => {
    markTutorialCompleted(TUTORIAL_VERSION);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300',
          isSidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b">
          {!isSidebarCollapsed && (
            <NavLink to="/" className="font-semibold text-lg flex items-center gap-2">
              PlumeNote
              <SyncStatusDot />
            </NavLink>
          )}
          {isSidebarCollapsed && (
            <SyncStatusDot className="mx-auto" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="h-8 w-8"
          >
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                isSidebarCollapsed && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Quick Links */}
          <div className="space-y-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!isSidebarCollapsed && <span>Accueil</span>}
            </NavLink>

            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {!isSidebarCollapsed && <span>Recherche</span>}
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )
              }
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {!isSidebarCollapsed && <span>Calendrier</span>}
            </NavLink>
          </div>

          {/* Folder Tree */}
          {!isSidebarCollapsed && (
            <div className="mt-6">
              <Sidebar />
            </div>
          )}
        </nav>

        {/* User Menu */}
        <div className="border-t p-2">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors',
                isSidebarCollapsed && 'justify-center'
              )}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium flex-shrink-0">
                  {user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">
                    {user?.displayName || user?.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
              )}
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className={cn(
                  'absolute bottom-full mb-2 w-48 rounded-md border bg-popover shadow-lg z-20',
                  isSidebarCollapsed ? 'left-0' : 'left-0'
                )}>
                  <div className="py-1">
                    {user?.role?.name === 'admin' && (
                      <NavLink
                        to="/admin"
                        className="block px-4 py-2 text-sm hover:bg-muted"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Administration
                      </NavLink>
                    )}
                    <NavLink
                      to="/dashboard"
                      className="block px-4 py-2 text-sm hover:bg-muted"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Statistiques
                    </NavLink>
                    <NavLink
                      to="/gallery"
                      className="block px-4 py-2 text-sm hover:bg-muted"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Galerie
                    </NavLink>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setShowUserMenu(false);
                        openWizard();
                      }}
                    >
                      Importer des notes
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowShortcutsModal(true);
                      }}
                    >
                      Raccourcis
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowTutorial(true);
                      }}
                    >
                      Tutoriel
                    </button>
                    <NavLink
                      to="/settings"
                      className="block px-4 py-2 text-sm hover:bg-muted"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Paramètres
                    </NavLink>
                    <hr className="my-1" />
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Modal Raccourcis */}
      <ShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />

      {/* Modal Import */}
      <ImportWizard
        open={isWizardOpen}
        onClose={closeWizard}
      />

      {/* Modal détail événement (disponible partout) */}
      <EventDetailModal />

      {/* Modal Tutoriel */}
      <TutorialModal
        open={showTutorial}
        onOpenChange={setShowTutorial}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
}
