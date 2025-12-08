// ===========================================
// Composant Paramètres de l'éditeur
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { usePreferencesStore } from '../../stores/preferencesStore';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { FileText, Columns, Code } from 'lucide-react';
import type { EditorMode, EditorWidth } from '@plumenote/types';

const EDITOR_MODES: Array<{ value: EditorMode; label: string; description: string; icon: React.ReactNode }> = [
  {
    value: 'wysiwyg',
    label: 'WYSIWYG',
    description: 'Éditeur visuel avec mise en forme directe',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Édition en texte brut avec syntaxe Markdown',
    icon: <Code className="h-5 w-5" />,
  },
  {
    value: 'split',
    label: 'Split',
    description: 'Vue divisée : Markdown à gauche, aperçu à droite',
    icon: <Columns className="h-5 w-5" />,
  },
];

const EDITOR_WIDTHS: Array<{ value: EditorWidth; label: string; description: string }> = [
  { value: 'narrow', label: 'Étroit', description: '600px max' },
  { value: 'medium', label: 'Moyen', description: '800px max' },
  { value: 'wide', label: 'Large', description: '1000px max' },
  { value: 'full', label: 'Pleine largeur', description: '100%' },
];

export function EditorSettings() {
  const { preferences, updateEditor, setEditorMode, setEditorWidth, isLoading } = usePreferencesStore();
  const { editor } = preferences;

  const handleAutoSaveIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      updateEditor({ autoSaveInterval: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode d'édition par défaut */}
      <div className="space-y-3">
        <Label>Mode d'édition par défaut</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {EDITOR_MODES.map(({ value, label, description, icon }) => (
            <button
              key={value}
              onClick={() => setEditorMode(value)}
              disabled={isLoading}
              className={`flex flex-col items-start gap-2 p-4 rounded-lg border transition-colors text-left ${
                editor.defaultMode === value
                  ? 'border-primary bg-primary/10'
                  : 'border-input hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
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

      {/* Sauvegarde automatique */}
      <div className="space-y-4">
        <Label>Sauvegarde automatique</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoSave"
            checked={editor.autoSave}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              updateEditor({ autoSave: checked === true })
            }
            disabled={isLoading}
          />
          <Label htmlFor="autoSave" className="text-sm font-normal">
            Activer la sauvegarde automatique
          </Label>
        </div>

        {editor.autoSave && (
          <div className="flex items-center gap-2 ml-6">
            <Label htmlFor="autoSaveInterval" className="text-sm font-normal">
              Intervalle :
            </Label>
            <Input
              id="autoSaveInterval"
              type="number"
              min={5}
              max={300}
              value={editor.autoSaveInterval}
              onChange={handleAutoSaveIntervalChange}
              disabled={isLoading}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">secondes</span>
          </div>
        )}
      </div>
    </div>
  );
}
