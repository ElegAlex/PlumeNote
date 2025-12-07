// ===========================================
// CalendarFilters - Filtres du calendrier (P3)
// ===========================================

import { Target, Calendar, Play, X } from 'lucide-react';
import type { CalendarEventType } from '@plumenote/types';
import { useCalendarStore } from '../../stores/calendarStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

const EVENT_TYPES: {
  type: CalendarEventType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: 'deadline', label: 'Échéances', icon: Target, color: 'text-red-600' },
  { type: 'event', label: 'Événements', icon: Calendar, color: 'text-blue-600' },
  { type: 'period-start', label: 'Périodes', icon: Play, color: 'text-green-600' },
];

const STATUSES = [
  { value: 'todo', label: 'À faire' },
  { value: 'in-progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
];

export function CalendarFilters() {
  const {
    filters,
    availableTags,
    setFilter,
    toggleTypeFilter,
    toggleStatusFilter,
    toggleTagFilter,
    clearFilters,
  } = useCalendarStore();

  const hasActiveFilters =
    filters.types.length < 3 ||
    filters.statuses.length < 2 ||
    filters.tags.length > 0 ||
    filters.search.length > 0;

  return (
    <aside className="w-64 border-r p-4 space-y-6 overflow-y-auto">
      {/* Recherche */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recherche
        </label>
        <Input
          type="search"
          placeholder="Rechercher..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          className="mt-2 h-8"
        />
      </div>

      {/* Types d'événements */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Type d'événement
        </label>
        <div className="mt-2 space-y-1">
          {EVENT_TYPES.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                'hover:bg-muted/50 transition-colors',
                filters.types.includes(type)
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', color)} />
              <span>{label}</span>
              {filters.types.includes(type) && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Statuts */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Statut
        </label>
        <div className="mt-2 space-y-1">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleStatusFilter(value)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm',
                'hover:bg-muted/50 transition-colors',
                filters.statuses.includes(value)
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <span>{label}</span>
              {filters.statuses.includes(value) && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tags
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs transition-colors',
                  filters.tags.includes(tag)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Réinitialiser */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full"
        >
          <X className="h-3 w-3 mr-1" />
          Réinitialiser les filtres
        </Button>
      )}
    </aside>
  );
}
