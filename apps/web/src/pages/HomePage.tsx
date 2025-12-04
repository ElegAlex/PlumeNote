// ===========================================
// Page d'Accueil (US-050)
// ===========================================

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotesStore } from '../stores/notes';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { formatRelativeTime } from '../lib/utils';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { recentNotes, fetchRecentNotes, createNote, isLoading } = useNotesStore();

  useEffect(() => {
    fetchRecentNotes();
  }, [fetchRecentNotes]);

  const handleNewNote = async () => {
    try {
      const note = await createNote({ title: 'Sans titre' });
      navigate(`/notes/${note.id}`);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bonjour, {user?.displayName || user?.username}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans votre espace de notes collaboratif
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Button onClick={handleNewNote} isLoading={isLoading}>
          <svg
            className="h-4 w-4 mr-2"
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
          Nouvelle note
        </Button>
        <Button variant="outline" onClick={() => navigate('/search')}>
          <svg
            className="h-4 w-4 mr-2"
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
          Rechercher
        </Button>
      </div>

      {/* Recent Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <svg
                className="h-12 w-12 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p>Aucune note récente</p>
              <p className="text-sm mt-1">
                Créez votre première note pour commencer
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    {note.folderPath && (
                      <p className="text-sm text-muted-foreground truncate">
                        {note.folderPath}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                    {formatRelativeTime(note.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{recentNotes.length}</div>
            <p className="text-sm text-muted-foreground">Notes récentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">-</div>
            <p className="text-sm text-muted-foreground">Dossiers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">-</div>
            <p className="text-sm text-muted-foreground">Tags</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
