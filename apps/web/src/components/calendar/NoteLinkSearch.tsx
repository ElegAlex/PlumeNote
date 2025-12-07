// ===========================================
// NoteLinkSearch - Recherche de notes à lier à un événement
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface NoteSearchResult {
  id: string;
  title: string;
  slug: string;
  folderPath?: string;
}

interface NoteLinkSearchProps {
  excludeNoteIds: string[];
  onSelect: (noteId: string) => void;
  onCancel: () => void;
}

export function NoteLinkSearch({
  excludeNoteIds,
  onSelect,
  onCancel,
}: NoteLinkSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Effectuer la recherche
  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get<{ notes: NoteSearchResult[] }>(
          `/notes/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        );
        // Filtrer les notes déjà liées
        const filtered = response.data.notes.filter(
          (note) => !excludeNoteIds.includes(note.id)
        );
        setResults(filtered);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery, excludeNoteIds]);

  const handleSelect = useCallback(
    (noteId: string) => {
      onSelect(noteId);
    },
    [onSelect]
  );

  return (
    <div className="mb-4 border rounded-lg overflow-hidden bg-background">
      {/* Champ de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une note à lier..."
          className="pl-9 border-0 border-b rounded-none focus:ring-0"
          autoFocus
        />
      </div>

      {/* Résultats */}
      <div className="max-h-48 overflow-y-auto">
        {isSearching && (
          <p className="p-3 text-sm text-muted-foreground">Recherche...</p>
        )}

        {!isSearching && results.length > 0 && (
          <ul>
            {results.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => handleSelect(note.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted text-sm transition-colors"
                >
                  <span className="font-medium">{note.title}</span>
                  {note.folderPath && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {note.folderPath}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!isSearching && query.length >= 2 && results.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Aucune note trouvée</p>
        )}

        {query.length < 2 && (
          <p className="p-3 text-sm text-muted-foreground">
            Tapez au moins 2 caractères pour rechercher
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-2 border-t bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
