// ===========================================
// QuickEventModal - Création rapide d'événement (P3)
// Supporte les événements autonomes avec dates de fin
// Permet de lier des notes à la création
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Target, CalendarRange, Link2, Search, Trash2 } from 'lucide-react';
import type { AutonomousEventType } from '@plumenote/types';
import { useEventStore } from '../../stores/eventStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { formatDateKey } from '../../lib/calendarUtils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

interface NoteToLink {
  id: string;
  title: string;
  folderPath?: string;
}

interface QuickEventModalProps {
  date: Date;
  onClose: () => void;
}

type EventTypeOption = 'DEADLINE' | 'EVENT' | 'PERIOD';

const EVENT_TYPE_OPTIONS: {
  type: EventTypeOption;
  label: string;
  icon: React.ElementType;
}[] = [
  { type: 'DEADLINE', label: 'Échéance', icon: Target },
  { type: 'EVENT', label: 'Événement', icon: Calendar },
  { type: 'PERIOD', label: 'Période', icon: CalendarRange },
];

export function QuickEventModal({ date, onClose }: QuickEventModalProps) {
  const { createEvent, linkNote } = useEventStore();
  const { loadEvents } = useCalendarStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventTypeOption>('EVENT');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // État pour les notes à lier
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteSearchResults, setNoteSearchResults] = useState<NoteToLink[]>([]);
  const [isSearchingNotes, setIsSearchingNotes] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<NoteToLink[]>([]);

  // Recherche de notes avec debounce
  useEffect(() => {
    if (noteSearchQuery.length < 2) {
      setNoteSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingNotes(true);
      try {
        const response = await api.get<{ notes: NoteToLink[] }>(
          `/notes/search?q=${encodeURIComponent(noteSearchQuery)}&limit=8`
        );
        // Filtrer les notes déjà sélectionnées
        const filtered = response.data.notes.filter(
          (note) => !selectedNotes.some((n) => n.id === note.id)
        );
        setNoteSearchResults(filtered);
      } catch (err) {
        console.error('Note search failed:', err);
        setNoteSearchResults([]);
      } finally {
        setIsSearchingNotes(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [noteSearchQuery, selectedNotes]);

  const handleAddNote = useCallback((note: NoteToLink) => {
    setSelectedNotes((prev) => [...prev, note]);
    setNoteSearchQuery('');
    setNoteSearchResults([]);
  }, []);

  const handleRemoveNote = useCallback((noteId: string) => {
    setSelectedNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  // Initialiser la date de fin quand le type passe à PERIOD
  useEffect(() => {
    if (eventType === 'PERIOD' && !endDate) {
      // Par défaut, endDate = startDate + 1 jour
      const defaultEnd = new Date(date);
      defaultEnd.setDate(defaultEnd.getDate() + 1);
      setEndDate(formatDateKey(defaultEnd));
    }
  }, [eventType, date, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    // Validation pour les périodes
    if (eventType === 'PERIOD') {
      if (!endDate) {
        setError('La date de fin est requise pour une période');
        return;
      }
      const startDateObj = new Date(formatDateKey(date));
      const endDateObj = new Date(endDate);
      if (endDateObj < startDateObj) {
        setError('La date de fin doit être après la date de début');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Construire la date de début avec heure optionnelle
      const startDateStr = time
        ? `${formatDateKey(date)}T${time}:00.000Z`
        : `${formatDateKey(date)}T00:00:00.000Z`;

      // Construire la date de fin pour les périodes
      const endDateStr = eventType === 'PERIOD' && endDate
        ? `${endDate}T23:59:59.000Z`
        : undefined;

      const createdEvent = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        type: eventType,
        startDate: startDateStr,
        endDate: endDateStr,
        allDay: !time,
      });

      // Lier les notes sélectionnées à l'événement créé
      if (createdEvent && selectedNotes.length > 0) {
        await Promise.all(
          selectedNotes.map((note) => linkNote(createdEvent.id, note.id))
        );
      }

      // Recharger les événements du calendrier
      await loadEvents();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nouvel événement</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Date sélectionnée */}
        <p className="text-sm text-muted-foreground mb-4 capitalize">
          {eventType === 'PERIOD' ? 'Début : ' : ''}{formattedDate}
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div>
            <label className="text-sm font-medium">Titre</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'événement"
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Description (optionnel) */}
          <div>
            <label className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optionnel)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'événement..."
              className="mt-1 w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={5000}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium">Type</label>
            <div className="mt-2 flex gap-2">
              {EVENT_TYPE_OPTIONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    eventType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date de fin (uniquement pour les périodes) */}
          {eventType === 'PERIOD' && (
            <div>
              <label className="text-sm font-medium">Date de fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={formatDateKey(date)}
                className="mt-1"
              />
            </div>
          )}

          {/* Heure (optionnel, pas pour les périodes) */}
          {eventType !== 'PERIOD' && (
            <div>
              <label className="text-sm font-medium">
                Heure <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-32"
              />
            </div>
          )}

          {/* Lier des notes */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Notes liées <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNoteSearch(!showNoteSearch)}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
                  showNoteSearch
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Link2 className="h-3 w-3" />
                {showNoteSearch ? 'Masquer' : 'Lier une note'}
              </button>
            </div>

            {/* Notes sélectionnées */}
            {selectedNotes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
                  >
                    <span className="truncate max-w-[150px]">{note.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(note.id)}
                      className="p-0.5 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recherche de notes */}
            {showNoteSearch && (
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="Rechercher une note..."
                    className="pl-8"
                  />
                </div>

                {/* Résultats de recherche */}
                {isSearchingNotes && (
                  <p className="text-xs text-muted-foreground">Recherche...</p>
                )}

                {noteSearchResults.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {noteSearchResults.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => handleAddNote(note)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm border-b last:border-b-0"
                      >
                        <span className="block truncate">{note.title}</span>
                        {note.folderPath && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {note.folderPath}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {noteSearchQuery.length >= 2 && !isSearchingNotes && noteSearchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune note trouvée</p>
                )}
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
