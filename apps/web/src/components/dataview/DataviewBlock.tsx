// ===========================================
// Composant Bloc Dataview (US-090, US-091)
// ===========================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import { formatRelativeTime } from '../../lib/utils';

interface DataviewQuery {
  type: 'table' | 'list' | 'task' | 'calendar';
  from?: 'notes' | 'tags' | 'folders';
  where?: { field: string; operator: string; value: string | number | boolean | string[] }[];
  sort?: { field: string; order: 'asc' | 'desc' };
  limit?: number;
  fields?: string[];
}

interface DataviewBlockProps {
  query: string | DataviewQuery;
  className?: string;
}

export function DataviewBlock({ query, className = '' }: DataviewBlockProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    executeQuery();
  }, [query]);

  const executeQuery = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let queryObj: DataviewQuery;

      // Parser la requête si c'est une chaîne
      if (typeof query === 'string') {
        const parseResponse = await api.post<{ success: boolean; query: DataviewQuery }>(
          '/dataview/parse',
          { query }
        );
        queryObj = parseResponse.data.query;
      } else {
        queryObj = query;
      }

      // Exécuter la requête
      const response = await api.post('/dataview/query', queryObj);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la requête');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-destructive/10 text-destructive rounded-md p-4 ${className}`}>
        <p className="text-sm font-medium">Erreur Dataview</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Render selon le type
  switch (data.type) {
    case 'table':
      return <DataviewTable data={data} className={className} />;
    case 'list':
      return <DataviewList data={data} className={className} />;
    case 'task':
      return <DataviewTasks data={data} className={className} />;
    case 'calendar':
      return <DataviewCalendar data={data} className={className} />;
    default:
      return <DataviewList data={data} className={className} />;
  }
}

// Table View
function DataviewTable({
  data,
  className,
}: {
  data: { headers: string[]; rows: any[]; count: number };
  className: string;
}) {
  const formatValue = (key: string, value: any) => {
    if (key === 'updated' || key === 'created') {
      return formatRelativeTime(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {data.headers.map((header) => (
              <th
                key={header}
                className="text-left py-2 px-3 font-medium text-muted-foreground"
              >
                {header.charAt(0).toUpperCase() + header.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/50">
              {data.headers.map((header) => (
                <td key={header} className="py-2 px-3">
                  {header === 'title' ? (
                    <Link
                      to={`/notes/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    formatValue(header, row[header])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-2">
        {data.count} résultat{data.count > 1 ? 's' : ''}
      </p>
    </div>
  );
}

// List View
function DataviewList({
  data,
  className,
}: {
  data: { items: { id: string; title: string; folder: string }[]; count: number };
  className: string;
}) {
  return (
    <div className={className}>
      <ul className="space-y-1">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="text-muted-foreground">•</span>
            <Link
              to={`/notes/${item.id}`}
              className="text-primary hover:underline"
            >
              {item.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              ({item.folder})
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-2">
        {data.count} note{data.count > 1 ? 's' : ''}
      </p>
    </div>
  );
}

// Task View
function DataviewTasks({
  data,
  className,
}: {
  data: {
    tasks: { noteId: string; noteTitle: string; text: string; completed: boolean }[];
    count: number;
  };
  className: string;
}) {
  const pendingTasks = data.tasks.filter((t) => !t.completed);
  const completedTasks = data.tasks.filter((t) => t.completed);

  return (
    <div className={className}>
      {pendingTasks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">
            À faire ({pendingTasks.length})
          </h4>
          <ul className="space-y-1">
            {pendingTasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={false}
                  readOnly
                  className="mt-1"
                />
                <div>
                  <span>{task.text}</span>
                  <Link
                    to={`/notes/${task.noteId}`}
                    className="text-xs text-muted-foreground ml-2 hover:underline"
                  >
                    {task.noteTitle}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Terminé ({completedTasks.length})
          </h4>
          <ul className="space-y-1">
            {completedTasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="mt-1"
                />
                <span className="line-through">{task.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">
        {data.count} tâche{data.count > 1 ? 's' : ''}
      </p>
    </div>
  );
}

// Calendar View
function DataviewCalendar({
  data,
  className,
}: {
  data: {
    days: { date: string; count: number; notes: { id: string; title: string }[] }[];
  };
  className: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {data.days.map((day) => (
          <div key={day.date} className="border-l-2 border-primary pl-3">
            <div className="text-sm font-medium">
              {new Date(day.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <ul className="mt-1 space-y-0.5">
              {day.notes.map((note) => (
                <li key={note.id}>
                  <Link
                    to={`/notes/${note.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {note.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
