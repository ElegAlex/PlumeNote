// ===========================================
// Utilitaires Calendar (P3 Calendrier)
// ===========================================

import type {
  CalendarEvent,
  CalendarMonth,
  CalendarWeek,
  CalendarDay,
} from '@plumenote/types';

// ===========================================
// Construction du calendrier
// ===========================================

/**
 * Construit la structure du calendrier pour un mois donné
 */
export function buildCalendarMonth(
  date: Date,
  events: CalendarEvent[]
): CalendarMonth {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Premier jour à afficher (lundi de la semaine du 1er)
  const startDay = new Date(firstDayOfMonth);
  const dayOfWeek = startDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDay.setDate(startDay.getDate() - daysToSubtract);

  // Dernier jour à afficher (dimanche de la semaine du dernier jour)
  const endDay = new Date(lastDayOfMonth);
  const lastDayOfWeek = endDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endDay.setDate(endDay.getDate() + daysToAdd);

  // Index des événements par date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const dateKey = event.date;
    const existing = eventsByDate.get(dateKey) ?? [];
    existing.push(event);
    eventsByDate.set(dateKey, existing);
  }

  // Construire les semaines
  const weeks: CalendarWeek[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDay = new Date(startDay);

  while (currentDay <= endDay) {
    const week: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const dateKey = formatDateKey(currentDay);
      const dayOfWeekNum = currentDay.getDay();

      week.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.getTime() === today.getTime(),
        isWeekend: dayOfWeekNum === 0 || dayOfWeekNum === 6,
        events: eventsByDate.get(dateKey) ?? [],
      });

      currentDay.setDate(currentDay.getDate() + 1);
    }

    weeks.push({ days: week });
  }

  return { year, month, weeks };
}

// ===========================================
// Plages de dates
// ===========================================

/**
 * Retourne la plage de dates pour un mois
 */
export function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Premier jour du mois - reculer pour inclure la semaine précédente visible
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  firstDay.setDate(firstDay.getDate() - daysToSubtract);

  // Dernier jour du mois + semaine suivante visible
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  lastDay.setDate(lastDay.getDate() + daysToAdd);

  return {
    start: formatDateKey(firstDay),
    end: formatDateKey(lastDay),
  };
}

/**
 * Retourne la plage de dates pour une semaine
 */
export function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Lundi comme premier jour

  const start = new Date(date);
  start.setDate(date.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  };
}

// ===========================================
// Navigation
// ===========================================

/**
 * Ajoute des mois à une date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Ajoute des semaines à une date
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Ajoute des jours à une date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===========================================
// Formatage
// ===========================================

/**
 * Formate une date en clé YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date pour affichage du mois
 */
export function formatMonthYear(date: Date, locale = 'fr-FR'): string {
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date pour affichage de la semaine
 */
export function formatWeekRange(date: Date, locale = 'fr-FR'): string {
  const { start, end } = getWeekRange(date);
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startStr = startDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
  const endStr = endDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Formate une heure HH:mm
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Formate une date relative (aujourd'hui, demain, etc.)
 */
export function formatRelativeDate(dateStr: string, locale = 'fr-FR'): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = addDays(today, 1);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return "Aujourd'hui";
  }

  if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Demain';
  }

  const diffDays = Math.ceil(
    (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString(locale, { weekday: 'long' });
  }

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: targetDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

// ===========================================
// Helpers
// ===========================================

/**
 * Vérifie si deux dates sont le même jour
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Vérifie si une date est dans le passé
 */
export function isPast(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Retourne les noms des jours de la semaine
 */
export function getWeekdayNames(locale = 'fr-FR', format: 'long' | 'short' | 'narrow' = 'short'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });
  const days: string[] = [];

  // Commencer par lundi
  for (let i = 0; i < 7; i++) {
    const date = new Date(2024, 0, i + 1); // 1er janvier 2024 = lundi
    days.push(formatter.format(date));
  }

  return days;
}

/**
 * Génère les heures de la journée pour la vue semaine
 */
export function getHoursOfDay(): string[] {
  const hours: string[] = [];
  for (let i = 0; i < 24; i++) {
    hours.push(`${String(i).padStart(2, '0')}:00`);
  }
  return hours;
}
