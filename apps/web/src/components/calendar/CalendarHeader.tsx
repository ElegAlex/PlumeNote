// ===========================================
// CalendarHeader - En-tête du calendrier (P3)
// ===========================================

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarViewMode } from '@plumenote/types';
import { useCalendarStore } from '../../stores/calendarStore';
import { formatMonthYear, formatWeekRange } from '../../lib/calendarUtils';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export function CalendarHeader() {
  const {
    viewMode,
    currentDate,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
  } = useCalendarStore();

  const title =
    viewMode === 'month'
      ? formatMonthYear(currentDate)
      : viewMode === 'week'
        ? formatWeekRange(currentDate)
        : formatMonthYear(currentDate);

  return (
    <header
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b bg-background/95 sticky top-0 z-10"
      role="banner"
    >
      <div className="flex items-center gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Titre période */}
        <h1 className="text-xl font-semibold capitalize">{title}</h1>

        {/* Bouton Aujourd'hui */}
        <Button variant="outline" size="sm" onClick={goToToday}>
          Aujourd'hui
        </Button>
      </div>

      {/* Sélecteur de vue */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
        <ViewModeButton
          mode="month"
          current={viewMode}
          onClick={setViewMode}
          label="Mois"
        />
        <ViewModeButton
          mode="week"
          current={viewMode}
          onClick={setViewMode}
          label="Semaine"
        />
        <ViewModeButton
          mode="agenda"
          current={viewMode}
          onClick={setViewMode}
          label="Agenda"
        />
      </div>
    </header>
  );
}

interface ViewModeButtonProps {
  mode: CalendarViewMode;
  current: CalendarViewMode;
  onClick: (mode: CalendarViewMode) => void;
  label: string;
}

function ViewModeButton({ mode, current, onClick, label }: ViewModeButtonProps) {
  const isActive = mode === current;

  return (
    <button
      onClick={() => onClick(mode)}
      className={cn(
        'px-3 py-1.5 text-sm rounded-md transition-colors',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
