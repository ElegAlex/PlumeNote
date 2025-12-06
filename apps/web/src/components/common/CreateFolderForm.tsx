// ===========================================
// Composant CreateFolderForm - Générique
// Formulaire de création de dossier avec titre
// Wrapper autour de InlineCreateForm pour les pages
// ===========================================

import { InlineCreateForm } from './InlineCreateForm';
import { cn } from '../../lib/utils';

export interface CreateFolderFormProps {
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
  placeholder?: string;
  className?: string;
}

export function CreateFolderForm({
  onSubmit,
  onCancel,
  isLoading = false,
  title = 'Nouveau dossier',
  placeholder = 'Nom du dossier',
  className,
}: CreateFolderFormProps) {
  return (
    <div className={cn('p-4 border rounded-lg bg-card', className)}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <InlineCreateForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
