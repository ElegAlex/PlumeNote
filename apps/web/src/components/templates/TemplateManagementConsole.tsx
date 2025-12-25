// ===========================================
// FEAT-06: Console de gestion des templates
// CRUD complet pour les templates personnalisés
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { cn } from '../../lib/utils';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type NoteTemplate,
} from '../../services/templatesApi';
import { toast } from 'sonner';
import {
  FileText,
  Users,
  BookOpen,
  Briefcase,
  FileCode,
  Plus,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';

// Catégories disponibles
const CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'work', label: 'Travail' },
  { value: 'personal', label: 'Personnel' },
  { value: 'technical', label: 'Technique' },
];

// Icônes disponibles
const ICONS = [
  { value: 'FileText', label: 'Document', icon: FileText },
  { value: 'Users', label: 'Équipe', icon: Users },
  { value: 'BookOpen', label: 'Livre', icon: BookOpen },
  { value: 'Briefcase', label: 'Travail', icon: Briefcase },
  { value: 'FileCode', label: 'Code', icon: FileCode },
];

interface TemplateFormData {
  name: string;
  description: string;
  content: string;
  icon: string;
  category: string;
  isPublic: boolean;
}

const DEFAULT_FORM: TemplateFormData = {
  name: '',
  description: '',
  content: '',
  icon: 'FileText',
  category: 'general',
  isPublic: false,
};

interface TemplateManagementConsoleProps {
  className?: string;
}

export function TemplateManagementConsole({ className }: TemplateManagementConsoleProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // État du formulaire
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // État suppression
  const [templateToDelete, setTemplateToDelete] = useState<NoteTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Charger les templates
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filtrer les templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Ouvrir le dialogue pour créer
  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  // Ouvrir le dialogue pour éditer
  const handleEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description ?? '',
      content: template.content,
      icon: template.icon ?? 'FileText',
      category: template.category,
      isPublic: template.isPublic ?? false,
    });
    setIsDialogOpen(true);
  };

  // Sauvegarder le template
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast.success('Template mis à jour');
      } else {
        await createTemplate(formData);
        toast.success('Template créé');
      }
      setIsDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Supprimer le template
  const handleDelete = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      await deleteTemplate(templateToDelete.id);
      toast.success('Template supprimé');
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const found = ICONS.find((i) => i.value === iconName);
    return found?.icon ?? FileText;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestion des templates</h2>
          <p className="text-sm text-muted-foreground">
            Créez et gérez vos modèles de notes personnalisés
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau template
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedCategory ?? 'all'}
          onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des templates */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory
              ? 'Aucun template trouvé'
              : 'Aucun template personnalisé'}
          </p>
          <Button variant="link" onClick={handleCreate}>
            Créer votre premier template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const Icon = getIconComponent(template.icon ?? 'FileText');
            return (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {template.name}
                      {template.isBuiltIn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Intégré
                        </span>
                      )}
                      {template.isPublic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {template.description || 'Pas de description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {CATEGORIES.find((c) => c.value === template.category)?.label ?? template.category}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateToDelete(template)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogue création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Modifiez les informations du template'
                : 'Créez un nouveau modèle de note réutilisable'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Compte-rendu réunion"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Catégorie</label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brève description du template"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Icône</label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComp className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Visibilité</label>
                <Select
                  value={formData.isPublic ? 'public' : 'private'}
                  onValueChange={(v) => setFormData({ ...formData, isPublic: v === 'public' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privé</SelectItem>
                    <SelectItem value="public">Public (visible par tous)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contenu du template</label>
              <textarea
                className="w-full min-h-[200px] p-3 border rounded-md bg-background font-mono text-sm"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="# Titre&#10;&#10;## Section 1&#10;&#10;Contenu..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" /> : null}
              {editingTemplate ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue confirmation suppression */}
      <Dialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le template</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le template "{templateToDelete?.name}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner size="sm" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
