// ===========================================
// NoteTable - P1: Tableau de notes avec métadonnées
// ===========================================

import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHomepageStore, type NoteWithMetadata } from '../../stores/homepage';
import { formatRelativeTime } from '../../lib/utils';

interface NoteTableProps {
  notes: NoteWithMetadata[];
  showPinAction?: boolean;
}

export const NoteTable = memo(function NoteTable({
  notes,
  showPinAction = true,
}: NoteTableProps) {
  const { pinNote, unpinNote } = useHomepageStore();

  const handlePinToggle = useCallback(
    async (e: React.MouseEvent, note: NoteWithMetadata) => {
      e.preventDefault();
      e.stopPropagation();

      if (note.isPinned) {
        await unpinNote(note.id);
      } else {
        await pinNote(note.id);
      }
    },
    [pinNote, unpinNote]
  );

  if (notes.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">Aucune note</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Titre</th>
            <th className="pb-2 pr-4 font-medium whitespace-nowrap hidden sm:table-cell">Auteur</th>
            <th className="pb-2 pr-4 font-medium whitespace-nowrap hidden md:table-cell">Créée</th>
            <th className="pb-2 pr-4 font-medium whitespace-nowrap">Modifiée</th>
            <th className="pb-2 pr-4 font-medium text-center hidden lg:table-cell">Vues</th>
            <th className="pb-2 pr-4 font-medium hidden xl:table-cell">Dossier</th>
            {showPinAction && <th className="pb-2 font-medium w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr
              key={note.id}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors group"
            >
              {/* Titre */}
              <td className="py-3 pr-4">
                <Link
                  to={`/notes/${note.slug || note.id}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  {note.isPinned && (
                    <svg
                      className="h-3 w-3 text-amber-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  <span className="font-medium truncate max-w-xs">
                    {note.title}
                  </span>
                </Link>
              </td>

              {/* Auteur */}
              <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                {note.author ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                      {(note.author.displayName || note.author.username).slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[120px]" title={note.author.displayName || note.author.username}>
                      {note.author.displayName || note.author.username}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>

              {/* Date création */}
              <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap hidden md:table-cell">
                <span title={new Date(note.createdAt).toLocaleString('fr-FR')}>
                  {formatRelativeTime(note.createdAt)}
                </span>
              </td>

              {/* Date modification */}
              <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                <span title={new Date(note.updatedAt).toLocaleString('fr-FR')}>
                  {formatRelativeTime(note.updatedAt)}
                </span>
              </td>

              {/* Nombre de vues */}
              <td className="py-3 pr-4 text-center hidden lg:table-cell">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>{note.viewCount}</span>
                </div>
              </td>

              {/* Dossier */}
              <td className="py-3 pr-4 text-muted-foreground hidden xl:table-cell">
                <div className="flex items-center gap-1 truncate max-w-[200px]">
                  <svg
                    className="h-3 w-3 flex-shrink-0"
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
                  <span className="truncate">{note.folderPath}</span>
                </div>
              </td>

              {/* Action épingler */}
              {showPinAction && (
                <td className="py-3">
                  <button
                    onClick={(e) => handlePinToggle(e, note)}
                    className={`p-1.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 ${
                      note.isPinned ? 'text-amber-500' : 'text-muted-foreground'
                    }`}
                    title={note.isPinned ? 'Désépingler' : 'Épingler'}
                  >
                    {note.isPinned ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    )}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
