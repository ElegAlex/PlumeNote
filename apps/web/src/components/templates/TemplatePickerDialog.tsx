// ===========================================
// Dialog de sélection de template (Sprint 8)
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../lib/utils';
import { getTemplates, BUILT_IN_TEMPLATES, type NoteTemplate } from '../../services/templatesApi';
import {
  FileText,
  Users,
  BookOpen,
  Briefcase,
  FileCode,
  FolderOpen,
  Search,
  Plus,
  Sparkles,
} from 'lucide-react';

// Map des icônes
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  BookOpen,
  Briefcase,
  FileCode,
  FolderOpen,
};

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: NoteTemplate | null) => void;
}

// Catégories avec labels
const CATEGORIES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  general: { label: 'Général', icon: FileText },
  work: { label: 'Travail', icon: Briefcase },
  personal: { label: 'Personnel', icon: BookOpen },
  technical: { label: 'Technique', icon: FileCode },
};

export function TemplatePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Charger les templates
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getTemplates();
      // Combiner les templates de la base avec les templates intégrés
      const allTemplates = [
        ...BUILT_IN_TEMPLATES.map((t, i) => ({ ...t, id: `builtin-${i}` })),
        ...response.templates,
      ];
      // Dédupliquer par nom
      const unique = allTemplates.filter(
        (t, i, arr) => arr.findIndex((x) => x.name === t.name) === i
      );
      setTemplates(unique as NoteTemplate[]);
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Utiliser seulement les templates intégrés
      setTemplates(
        BUILT_IN_TEMPLATES.map((t, i) => ({ ...t, id: `builtin-${i}` })) as NoteTemplate[]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Grouper par catégorie
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const cat = template.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, NoteTemplate[]>);

  const handleSelect = (template: NoteTemplate | null) => {
    onSelect(template);
    onOpenChange(false);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const getIcon = (iconName?: string | null) => {
    const Icon = iconName ? ICON_MAP[iconName] : FileText;
    return Icon || FileText;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nouvelle note
          </DialogTitle>
          <DialogDescription>
            Choisissez un template ou commencez avec une note vide
          </DialogDescription>
        </DialogHeader>

        {/* Search and filters */}
        <div className="flex gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Tous
          </Button>
          {Object.entries(CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className="flex items-center gap-1"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        {/* Templates list */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun template trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Note vide en premier */}
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 border-dashed',
                  'hover:border-primary hover:bg-primary/5',
                  'transition-colors flex items-center gap-3'
                )}
              >
                <div className="p-2 rounded-lg bg-muted">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">Note vide</div>
                  <div className="text-sm text-muted-foreground">
                    Commencer avec une page blanche
                  </div>
                </div>
              </button>

              {/* Templates groupés par catégorie */}
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2 px-1">
                    {CATEGORIES[category]?.label || category}
                  </div>
                  <div className="grid gap-2">
                    {categoryTemplates.map((template) => {
                      const Icon = getIcon(template.icon);
                      return (
                        <button
                          key={template.id}
                          onClick={() => handleSelect(template)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border',
                            'hover:border-primary hover:bg-primary/5',
                            'transition-colors flex items-start gap-3'
                          )}
                        >
                          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {template.name}
                              {template.isBuiltIn && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  Intégré
                                </span>
                              )}
                            </div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground truncate">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
