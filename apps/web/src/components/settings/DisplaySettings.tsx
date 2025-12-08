// ===========================================
// Composant Paramètres d'affichage
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { usePreferencesStore } from '../../stores/preferencesStore';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { Theme, Language, TimeFormat, StartOfWeek } from '@plumenote/types';

const THEMES: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Clair', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Sombre', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: 'Système', icon: <Monitor className="h-4 w-4" /> },
];

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const TIME_FORMATS: Array<{ value: TimeFormat; label: string }> = [
  { value: '24h', label: '24 heures (14:30)' },
  { value: '12h', label: '12 heures (2:30 PM)' },
];

const WEEK_STARTS: Array<{ value: StartOfWeek; label: string }> = [
  { value: 'monday', label: 'Lundi' },
  { value: 'sunday', label: 'Dimanche' },
];

const DATE_FORMATS = [
  { value: 'dd/MM/yyyy', label: '31/12/2024' },
  { value: 'MM/dd/yyyy', label: '12/31/2024' },
  { value: 'yyyy-MM-dd', label: '2024-12-31' },
  { value: 'dd MMMM yyyy', label: '31 décembre 2024' },
];

export function DisplaySettings() {
  const { preferences, updateDisplay, setTheme, isLoading } = usePreferencesStore();
  const { display } = preferences;

  return (
    <div className="space-y-6">
      {/* Thème */}
      <div className="space-y-2">
        <Label>Thème</Label>
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                display.theme === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Langue */}
      <div className="space-y-2">
        <Label htmlFor="language">Langue de l'interface</Label>
        <Select
          value={display.language}
          onValueChange={(value: string) => updateDisplay({ language: value as Language })}
          disabled={isLoading}
        >
          <SelectTrigger id="language" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format de date */}
      <div className="space-y-2">
        <Label htmlFor="dateFormat">Format de date</Label>
        <Select
          value={display.dateFormat}
          onValueChange={(value: string) => updateDisplay({ dateFormat: value })}
          disabled={isLoading}
        >
          <SelectTrigger id="dateFormat" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format d'heure */}
      <div className="space-y-2">
        <Label htmlFor="timeFormat">Format d'heure</Label>
        <Select
          value={display.timeFormat}
          onValueChange={(value: string) => updateDisplay({ timeFormat: value as TimeFormat })}
          disabled={isLoading}
        >
          <SelectTrigger id="timeFormat" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_FORMATS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Premier jour de la semaine */}
      <div className="space-y-2">
        <Label htmlFor="startOfWeek">Premier jour de la semaine</Label>
        <Select
          value={display.startOfWeek}
          onValueChange={(value: string) => updateDisplay({ startOfWeek: value as StartOfWeek })}
          disabled={isLoading}
        >
          <SelectTrigger id="startOfWeek" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEK_STARTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
