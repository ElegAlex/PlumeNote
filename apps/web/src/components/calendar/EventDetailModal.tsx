// ===========================================
// EventDetailModal - Visualisation/édition d'un événement
// Affiche le détail d'un événement autonome avec ses notes liées
// ===========================================

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Link2, Edit2, Trash2, Target, CalendarRange } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { LinkedNotesList } from './LinkedNotesList';
import { NoteLinkSearch } from './NoteLinkSearch';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

const TYPE_LABELS: Record<string, string> = {
  deadline: 'Échéance',
  event: 'Événement',
  period: 'Période',
};

const TYPE_COLORS: Record<string, string> = {
  deadline: 'bg-red-500',
  event: 'bg-blue-500',
  period: 'bg-green-500',
};

type EventTypeOption = 'deadline' | 'event' | 'period';

const EVENT_TYPE_OPTIONS: {
  type: EventTypeOption;
  label: string;
  icon: React.ElementType;
}[] = [
  { type: 'deadline', label: 'Échéance', icon: Target },
  { type: 'event', label: 'Événement', icon: Calendar },
  { type: 'period', label: 'Période', icon: CalendarRange },
];

export function EventDetailModal() {
  const {
    selectedEvent,
    isEventDetailOpen,
    closeEventDetail,
    updateEvent,
    deleteEvent,
    linkNote,
    unlinkNote,
    isLoading,
  } = useEventStore();
  const { loadEvents } = useCalendarStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedType, setEditedType] = useState<EventTypeOption>('event');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedAllDay, setEditedAllDay] = useState(true);
  const [showNoteLinkSearch, setShowNoteLinkSearch] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialiser les champs d'édition quand l'événement change
  useEffect(() => {
    if (selectedEvent) {
      setEditedTitle(selectedEvent.title);
      setEditedDescription(selectedEvent.description || '');
      setEditedType(selectedEvent.type as EventTypeOption);
      setEditedAllDay(selectedEvent.allDay);

      // Parser la date de début
      const startDate = new Date(selectedEvent.startDate);
      setEditedStartDate(startDate.toISOString().split('T')[0] || '');
      if (!selectedEvent.allDay) {
        const hours = startDate.getUTCHours().toString().padStart(2, '0');
        const mins = startDate.getUTCMinutes().toString().padStart(2, '0');
        setEditedStartTime(`${hours}:${mins}`);
      } else {
        setEditedStartTime('');
      }

      // Parser la date de fin pour les périodes
      if (selectedEvent.endDate) {
        const endDate = new Date(selectedEvent.endDate);
        setEditedEndDate(endDate.toISOString().split('T')[0] || '');
      } else {
        setEditedEndDate('');
      }
    }
  }, [selectedEvent]);

  if (!isEventDetailOpen || !selectedEvent) return null;

  const handleSave = async () => {
    if (!selectedEvent) return;

    setIsSaving(true);
    try {
      // Construire la date de début avec heure optionnelle
      const startDateStr = editedStartTime
        ? `${editedStartDate}T${editedStartTime}:00.000Z`
        : `${editedStartDate}T00:00:00.000Z`;

      // Construire la date de fin pour les périodes
      const endDateStr = editedType === 'period' && editedEndDate
        ? `${editedEndDate}T23:59:59.000Z`
        : null;

      await updateEvent(selectedEvent.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim() || null,
        type: editedType.toUpperCase() as 'DEADLINE' | 'EVENT' | 'PERIOD',
        startDate: startDateStr,
        endDate: endDateStr,
        allDay: !editedStartTime,
      });
      await loadEvents();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Réinitialiser les champs depuis l'événement original
    if (selectedEvent) {
      setEditedTitle(selectedEvent.title);
      setEditedDescription(selectedEvent.description || '');
      setEditedType(selectedEvent.type as EventTypeOption);
      setEditedAllDay(selectedEvent.allDay);

      const startDate = new Date(selectedEvent.startDate);
      setEditedStartDate(startDate.toISOString().split('T')[0] || '');
      if (!selectedEvent.allDay) {
        const hours = startDate.getUTCHours().toString().padStart(2, '0');
        const mins = startDate.getUTCMinutes().toString().padStart(2, '0');
        setEditedStartTime(`${hours}:${mins}`);
      } else {
        setEditedStartTime('');
      }

      if (selectedEvent.endDate) {
        const endDate = new Date(selectedEvent.endDate);
        setEditedEndDate(endDate.toISOString().split('T')[0] || '');
      } else {
        setEditedEndDate('');
      }
    }
    setIsEditing(false);
  };

  const handleLinkNote = async (noteId: string) => {
    if (!selectedEvent) return;
    await linkNote(selectedEvent.id, noteId);
    setShowNoteLinkSearch(false);
  };

  const handleUnlinkNote = async (noteId: string) => {
    if (!selectedEvent) return;
    await unlinkNote(selectedEvent.id, noteId);
  };

  const handleDelete = async () => {
    if (!selectedEvent || !window.confirm('Supprimer cet événement ?')) return;
    setIsDeleting(true);
    const success = await deleteEvent(selectedEvent.id);
    if (success) {
      await loadEvents();
    }
    setIsDeleting(false);
  };

  const formatDateRange = () => {
    const startDate = new Date(selectedEvent.startDate);
    const formattedStart = startDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (selectedEvent.type === 'period' && selectedEvent.endDate) {
      const endDate = new Date(selectedEvent.endDate);
      const formattedEnd = endDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return `${formattedStart} → ${formattedEnd}`;
    }

    if (!selectedEvent.allDay) {
      const time = startDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${formattedStart} à ${time}`;
    }

    return formattedStart;
  };

  const eventColor = selectedEvent.color || '#3b82f6';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeEventDetail}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header coloré */}
        <div
          className="px-6 py-4 text-white"
          style={{ backgroundColor: eventColor }}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-semibold pr-8">{selectedEvent.title}</h2>
            <div className="flex items-center gap-1">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={closeEventDetail}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-white/90 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {TYPE_LABELS[selectedEvent.type] || selectedEvent.type}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="capitalize">{formatDateRange()}</span>
            </span>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isEditing ? (
            /* Mode édition */
            <div className="space-y-4">
              {/* Titre */}
              <div>
                <label className="text-sm font-medium">Titre</label>
                <Input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Titre de l'événement"
                  className="mt-1"
                  autoFocus
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
                      onClick={() => {
                        setEditedType(type);
                        // Si on passe à période et pas de date de fin, initialiser
                        if (type === 'period' && !editedEndDate && editedStartDate) {
                          const startDate = new Date(editedStartDate);
                          startDate.setDate(startDate.getDate() + 1);
                          setEditedEndDate(startDate.toISOString().split('T')[0] || '');
                        }
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        editedType === type
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

              {/* Date de début */}
              <div>
                <label className="text-sm font-medium">
                  {editedType === 'period' ? 'Date de début' : 'Date'}
                </label>
                <Input
                  type="date"
                  value={editedStartDate}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Date de fin (uniquement pour les périodes) */}
              {editedType === 'period' && (
                <div>
                  <label className="text-sm font-medium">Date de fin</label>
                  <Input
                    type="date"
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    min={editedStartDate}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Heure (pas pour les périodes) */}
              {editedType !== 'period' && (
                <div>
                  <label className="text-sm font-medium">
                    Heure <span className="text-muted-foreground">(optionnel)</span>
                  </label>
                  <Input
                    type="time"
                    value={editedStartTime}
                    onChange={(e) => setEditedStartTime(e.target.value)}
                    className="mt-1 w-32"
                  />
                  {editedStartTime && (
                    <button
                      type="button"
                      onClick={() => setEditedStartTime('')}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium">
                  Description <span className="text-muted-foreground">(optionnel)</span>
                </label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="mt-1 w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Description de l'événement..."
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving || !editedTitle.trim()}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            /* Mode lecture */
            <>
              {/* Description */}
              <section className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <div className="p-3 bg-muted/50 rounded min-h-[60px] text-sm">
                  {selectedEvent.description || (
                    <span className="text-muted-foreground italic">
                      Aucune description
                    </span>
                  )}
                </div>
              </section>

              {/* Notes liées */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Link2 className="h-4 w-4" />
                    Notes liées ({selectedEvent.linkedNotes?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowNoteLinkSearch(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    + Lier une note
                  </button>
                </div>

                {showNoteLinkSearch && (
                  <NoteLinkSearch
                    excludeNoteIds={selectedEvent.linkedNotes?.map((ln) => ln.noteId) || []}
                    onSelect={handleLinkNote}
                    onCancel={() => setShowNoteLinkSearch(false)}
                  />
                )}

                <LinkedNotesList
                  linkedNotes={selectedEvent.linkedNotes || []}
                  onUnlink={handleUnlinkNote}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer (masqué en mode édition) */}
        {!isEditing && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-background">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
            <Button variant="outline" onClick={closeEventDetail}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
