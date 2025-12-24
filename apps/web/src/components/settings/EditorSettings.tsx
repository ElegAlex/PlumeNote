// ===========================================
// Composant Paramètres de l'éditeur
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { usePreferencesStore } from '../../stores/preferencesStore';
import { Label } from '../ui/Label';
import { Checkbox } from '../ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import type { EditorWidth, DefaultViewMode } from '@plumenote/types';

const EDITOR_WIDTHS: Array<{ value: EditorWidth; label: string; description: string }> = [
  { value: 'narrow', label: 'Étroit', description: '600px max' },
  { value: 'medium', label: 'Moyen', description: '800px max' },
  { value: 'wide', label: 'Large', description: '1000px max' },
  { value: 'full', label: 'Pleine largeur', description: '100%' },
];

// FEAT-12: Options de mode de vue par défaut
const VIEW_MODES: Array<{ value: DefaultViewMode; label: string; description: string }> = [
  { value: 'edit', label: 'Édition', description: 'Ouvrir les notes en mode édition' },
  { value: 'view', label: 'Lecture', description: 'Ouvrir les notes en mode lecture seule' },
];

export function EditorSettings() {
  const { preferences, updateEditor, setEditorWidth, setDefaultViewMode, isLoading } = usePreferencesStore();
  const { editor } = preferences;

  return (
    <div className="space-y-6">
      {/* FEAT-12: Mode de vue par défaut */}
      <div className="space-y-2">
        <Label htmlFor="defaultViewMode">Mode d'ouverture des notes</Label>
        <Select
          value={editor.defaultViewMode ?? 'edit'}
          onValueChange={(value: string) => setDefaultViewMode(value as DefaultViewMode)}
          disabled={isLoading}
        >
          <SelectTrigger id="defaultViewMode" className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_MODES.map(({ value, label, description }) => (
              <SelectItem key={value} value={value}>
                {label} - {description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choisissez si les notes s'ouvrent en mode édition ou lecture par défaut.
        </p>
      </div>

      {/* Largeur de l'éditeur */}
      <div className="space-y-2">
        <Label htmlFor="editorWidth">Largeur de l'éditeur</Label>
        <Select
          value={editor.width}
          onValueChange={(value: string) => setEditorWidth(value as EditorWidth)}
          disabled={isLoading}
        >
          <SelectTrigger id="editorWidth" className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_WIDTHS.map(({ value, label, description }) => (
              <SelectItem key={value} value={value}>
                {label} ({description})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options de l'éditeur */}
      <div className="space-y-4">
        <Label>Options de l'éditeur</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showLineNumbers"
            checked={editor.showLineNumbers}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              updateEditor({ showLineNumbers: checked === true })
            }
            disabled={isLoading}
          />
          <Label htmlFor="showLineNumbers" className="text-sm font-normal">
            Afficher les numéros de ligne (mode Markdown)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="spellCheck"
            checked={editor.spellCheck}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              updateEditor({ spellCheck: checked === true })
            }
            disabled={isLoading}
          />
          <Label htmlFor="spellCheck" className="text-sm font-normal">
            Activer la vérification orthographique
          </Label>
        </div>
      </div>
    </div>
  );
}
