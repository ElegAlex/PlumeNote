// ===========================================
// Page d'Accueil - P1: Layout refactorisé
// Homepage full-width avec widgets déplacés en sidebar
// ===========================================

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useHomepageStore } from '../stores/homepage';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { CalendarWidget } from '../components/homepage/CalendarWidget';
import { PinnedNotesSection } from '../components/homepage/PinnedNotesSection';
import { RecentNotesSection } from '../components/homepage/RecentNotesSection';
import { api } from '../lib/api';

// ===========================================
// Types
// ===========================================

interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'danger';
  dismissible: boolean;
  createdAt: string;
}

// ===========================================
// Helpers
// ===========================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ===========================================
// Main Component
// ===========================================

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isLoading, error, loadHomepageData } = useHomepageStore();

  // Annonces
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]'))
  );

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Création de note en cours
  const [isCreating, setIsCreating] = useState(false);

  // Chargement des données
  useEffect(() => {
    loadHomepageData();
    fetchAnnouncements();
  }, [loadHomepageData]);

  // Raccourci clavier recherche (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch annonces
  const fetchAnnouncements = async () => {
    try {
      const response = await api.get<{ announcements: Announcement[] }>('/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch {
      // Ignorer silencieusement
    }
  };

  // Dismiss annonce
  const dismissAnnouncement = (id: string) => {
    setDismissedAnnouncements((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissedAnnouncements', JSON.stringify([...next]));
      return next;
    });
  };

  // Créer nouvelle note
  const handleNewNote = async () => {
    setIsCreating(true);
    try {
      const response = await api.post('/notes', { title: 'Sans titre' });
      navigate(`/notes/${response.data.slug}`);
    } catch {
      // Erreur gérée par le store
    } finally {
      setIsCreating(false);
    }
  };

  // Recherche
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Annonces visibles
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedAnnouncements.has(a.id)
  );

  // Affichage erreur
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadHomepageData}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Bannière Annonces */}
      {visibleAnnouncements.length > 0 && (
        <div className="border-b">
          {visibleAnnouncements.map((announcement) => (
            <AnnouncementBanner
              key={announcement.id}
              announcement={announcement}
              onDismiss={dismissAnnouncement}
            />
          ))}
        </div>
      )}

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header avec date et boutons d'action */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {formatDate(new Date())}
            </p>
            <h1 className="text-3xl font-bold">
              {getGreeting()}, {user?.displayName || user?.username}
            </h1>
          </div>

          {/* Boutons d'action - P1: Déplacés en haut à droite */}
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => navigate('/search')}>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Recherche avancée
            </Button>
            <Button onClick={handleNewNote} isLoading={isCreating}>
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle note
            </Button>
          </div>
        </header>

        {/* Barre de recherche */}
        <form onSubmit={handleSearchSubmit} className="mb-8">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des notes..."
              className="w-full pl-12 pr-20 py-3 text-lg border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded border text-muted-foreground">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
            </kbd>
          </div>
        </form>

        {/* Contenu principal - P1: Layout full-width */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Widget Calendrier - P1: En premier */}
            <CalendarWidget />

            {/* Notes épinglées - P1: Après calendrier */}
            <PinnedNotesSection />

            {/* Notes récentes - P1: En dernier */}
            <RecentNotesSection />
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Sous-composants
// ===========================================

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  const bgClasses = {
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200',
  };

  return (
    <div className={`px-4 py-2 flex items-center justify-between ${bgClasses[announcement.type]}`}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm">{announcement.message}</span>
      </div>
      {announcement.dismissible && (
        <button
          onClick={() => onDismiss(announcement.id)}
          className="p-1 hover:bg-black/10 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
