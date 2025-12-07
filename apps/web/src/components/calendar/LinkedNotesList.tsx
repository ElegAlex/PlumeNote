// ===========================================
// LinkedNotesList - Liste des notes liées à un événement
// ===========================================

import { Link } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import type { LinkedNote } from '@plumenote/types';

interface LinkedNotesListProps {
  linkedNotes: LinkedNote[];
  onUnlink: (noteId: string) => void;
}

export function LinkedNotesList({ linkedNotes, onUnlink }: LinkedNotesListProps) {
  if (linkedNotes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic py-2">
        Aucune note liée à cet événement
      </p>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <ul className="space-y-1">
      {linkedNotes.map((ln) => (
        <li
          key={ln.id}
          className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted group"
        >
          <Link
            to={`/notes/${ln.note.slug}`}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-sm">{ln.note.title}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDate(ln.note.updatedAt)}
            </span>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUnlink(ln.noteId);
            }}
            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            title="Délier cette note"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
