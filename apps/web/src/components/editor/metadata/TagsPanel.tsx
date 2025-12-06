// ===========================================
// Composant TagsPanel
// Panneau pour éditer les tags d'une note
// ===========================================

import { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Tag,
} from 'lucide-react';
import { api } from '../../../lib/api';

// ----- Types -----

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface TagsPanelProps {
  noteId: string;
  className?: string;
}

// ----- Composant Principal -----

export function TagsPanel({ noteId, className = '' }: TagsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Charger les tags de la note
  const loadTags = useCallback(async () => {
    if (!noteId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ noteId: string; tags: TagItem[] }>(
        `/notes/${noteId}/tags`
      );
      setTags(response.data.tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
      setError('Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Rechercher des suggestions de tags
  const searchTags = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await api.get<{ tags: TagItem[] }>(
        `/tags/search?q=${encodeURIComponent(query)}&limit=5`
      );
      // Filtrer les tags déjà présents
      const existingIds = new Set(tags.map((t) => t.id));
      setSuggestions(response.data.tags.filter((t) => !existingIds.has(t.id)));
    } catch {
      setSuggestions([]);
    }
  }, [tags]);

  // Ajouter un tag
  const addTag = async (name: string) => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const response = await api.post<TagItem>(`/notes/${noteId}/tags`, {
        name: name.trim(),
      });
      setTags((prev) => [...prev, response.data]);
      setNewTagName('');
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      console.error('Failed to add tag:', err);
      setError('Erreur lors de l\'ajout');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer un tag
  const removeTag = async (tagId: string) => {
    setIsSaving(true);
    try {
      await api.delete(`/notes/${noteId}/tags/${tagId}`);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      console.error('Failed to remove tag:', err);
      setError('Erreur lors de la suppression');
    } finally {
      setIsSaving(false);
    }
  };

  // Gérer la saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTagName(value);
    searchTags(value);
    setShowSuggestions(true);
  };

  // Gérer les touches
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagName.trim()) {
      e.preventDefault();
      addTag(newTagName);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`border-b ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Tag className="h-4 w-4" />
          Tags
          {tags.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({tags.length})
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          {isSaving && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Contenu */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Erreur */}
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
              {error}
            </div>
          )}

          {/* Chargement */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          )}

          {/* Liste des tags */}
          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">
                  Aucun tag
                </p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    style={tag.color ? { backgroundColor: `${tag.color}20`, color: tag.color } : undefined}
                  >
                    #{tag.name}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                      title="Supprimer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          )}

          {/* Ajouter un tag */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={newTagName}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Ajouter un tag..."
                className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => addTag(suggestion.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Tag className="h-3 w-3" />
                    #{suggestion.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TagsPanel;
