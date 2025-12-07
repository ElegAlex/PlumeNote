// ===========================================
// Page de Recherche Avancée (US-060 à US-063)
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { debounce, formatRelativeTime } from '../lib/utils';
import type { SearchResult } from '@plumenote/types';

interface Facets {
  folders: { id: string; name: string; path: string; count: number }[];
  tags: { id: string; name: string; color: string | null; count: number }[];
  authors: { id: string; name: string; count: number }[];
  dates: { month: string; label: string; count: number }[];
}

interface SearchFilters {
  folderId?: string;
  tags?: string[];
  authorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'relevance' | 'date' | 'title';
  sortOrder: 'asc' | 'desc';
}

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc',
  });

  // Load facets on mount
  useEffect(() => {
    loadFacets();
  }, []);

  const loadFacets = async () => {
    try {
      const response = await api.get<Facets>('/search/facets');
      setFacets(response.data);
    } catch {
      // Ignore errors
    }
  };

  const performSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          sortBy: searchFilters.sortBy,
          sortOrder: searchFilters.sortOrder,
        });

        if (searchFilters.folderId) {
          params.set('folderId', searchFilters.folderId);
        }
        if (searchFilters.tags && searchFilters.tags.length > 0) {
          params.set('tags', searchFilters.tags.join(','));
        }
        if (searchFilters.authorId) {
          params.set('authorId', searchFilters.authorId);
        }
        if (searchFilters.dateFrom) {
          params.set('dateFrom', searchFilters.dateFrom);
        }
        if (searchFilters.dateTo) {
          params.set('dateTo', searchFilters.dateTo);
        }

        const response = await api.get<{
          results: SearchResult[];
          total: number;
          facets: Facets;
        }>(`/search?${params}`);

        setResults(response.data.results);
        setTotal(response.data.total);
        if (response.data.facets) {
          setFacets(response.data.facets);
        }
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(query, filters);
  }, [query, filters, performSearch]);

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const terms = searchQuery.split(/\s+/).filter(Boolean);
    let result = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>'
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  const toggleTag = (tagName: string) => {
    setFilters((prev) => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tagName)
        ? currentTags.filter((t) => t !== tagName)
        : [...currentTags, tagName];
      return { ...prev, tags: newTags };
    });
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'relevance',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters =
    filters.folderId ||
    (filters.tags && filters.tags.length > 0) ||
    filters.authorId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="flex h-full">
      {/* Sidebar Facets */}
      <aside
        className={`w-64 border-r bg-card p-4 overflow-y-auto ${
          showFilters ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Filtres</h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Effacer
            </Button>
          )}
        </div>

        {facets && (
          <div className="space-y-6">
            {/* Sort */}
            <div>
              <h3 className="text-sm font-medium mb-2">Trier par</h3>
              <select
                className="w-full border rounded-md px-2 py-1.5 text-sm"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [
                    SearchFilters['sortBy'],
                    SearchFilters['sortOrder']
                  ];
                  setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
                }}
              >
                <option value="relevance-desc">Pertinence</option>
                <option value="date-desc">Date (récent)</option>
                <option value="date-asc">Date (ancien)</option>
                <option value="title-asc">Titre (A-Z)</option>
                <option value="title-desc">Titre (Z-A)</option>
              </select>
            </div>

            {/* Folders */}
            {facets.folders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Dossiers</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {facets.folders.map((folder) => (
                    <label
                      key={folder.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                    >
                      <input
                        type="radio"
                        name="folder"
                        checked={filters.folderId === folder.id}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            folderId:
                              prev.folderId === folder.id ? undefined : folder.id,
                          }))
                        }
                        className="h-3 w-3"
                      />
                      <span className="truncate flex-1">{folder.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {folder.count}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {facets.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {facets.tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.tags?.includes(tag.name) ?? false}
                        onChange={() => toggleTag(tag.name)}
                        className="h-3 w-3"
                      />
                      {tag.color && (
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      <span className="truncate flex-1">#{tag.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {tag.count}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Authors */}
            {facets.authors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Auteurs</h3>
                <div className="space-y-1">
                  {facets.authors.map((author) => (
                    <label
                      key={author.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                    >
                      <input
                        type="radio"
                        name="author"
                        checked={filters.authorId === author.id}
                        onChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            authorId:
                              prev.authorId === author.id ? undefined : author.id,
                          }))
                        }
                        className="h-3 w-3"
                      />
                      <span className="truncate flex-1">{author.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {author.count}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {facets.dates.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Période</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {facets.dates.map((date) => (
                    <button
                      key={date.month}
                      onClick={() => {
                        const [year, month] = date.month.split('-');
                        const startDate = `${year}-${month}-01`;
                        const endDate = new Date(
                          parseInt(year),
                          parseInt(month),
                          0
                        )
                          .toISOString()
                          .split('T')[0];

                        setFilters((prev) => ({
                          ...prev,
                          dateFrom:
                            prev.dateFrom === startDate ? undefined : startDate,
                          dateTo:
                            prev.dateTo === endDate ? undefined : endDate,
                        }));
                      }}
                      className={`w-full flex items-center justify-between text-sm p-1 rounded ${
                        filters.dateFrom?.startsWith(date.month)
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span>{date.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {date.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-2xl font-bold">Recherche</h1>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
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
              <Input
                type="search"
                placeholder="Rechercher dans vos notes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
                autoFocus
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-3">
                {filters.folderId && facets && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                    Dossier:{' '}
                    {facets.folders.find((f) => f.id === filters.folderId)?.name}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, folderId: undefined }))
                      }
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs"
                  >
                    #{tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {filters.authorId && facets && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                    Auteur:{' '}
                    {facets.authors.find((a) => a.id === filters.authorId)?.name}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, authorId: undefined }))
                      }
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.dateFrom && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs">
                    Période: {filters.dateFrom}
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: undefined,
                          dateTo: undefined,
                        }))
                      }
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : hasSearched ? (
            results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <svg
                  className="h-16 w-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg">Aucun résultat trouvé</p>
                <p className="text-sm mt-1">
                  Essayez avec d'autres termes ou filtres
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {total} résultat{total > 1 ? 's' : ''} trouvé
                  {total > 1 ? 's' : ''}
                </p>

                <div className="divide-y rounded-lg border">
                  {results.map((result) => (
                    <Link
                      key={result.noteId}
                      to={`/notes/${result.noteId}`}
                      className="block p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">
                            {highlightMatch(result.title, query)}
                          </h3>

                          {result.excerpt && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {highlightMatch(result.excerpt, query)}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {result.folderPath && (
                              <span className="flex items-center gap-1">
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
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                  />
                                </svg>
                                {result.folderPath}
                              </span>
                            )}
                            {result.authorName && (
                              <span>{result.authorName}</span>
                            )}
                          </div>

                          {result.tags && result.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {result.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(result.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <svg
                className="h-16 w-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-lg">Commencez à taper pour rechercher</p>
              <p className="text-sm mt-1">
                Recherchez dans les titres, contenus et tags
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
