// ===========================================
// Composant InlineCreateForm - Générique
// Formulaire inline de création (dossier/note)
// Utilisé dans les sidebars et les pages
// ===========================================

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

export interface InlineCreateFormProps {
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  /** Variante compacte pour sidebar */
  compact?: boolean;
}

export function InlineCreateForm({
  onSubmit,
  onCancel,
  isLoading = false,
  placeholder = 'Nom...',
  submitLabel = 'OK',
  className,
  compact = false,
}: InlineCreateFormProps) {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSubmit(name.trim());
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (compact) {
    // Version compacte pour sidebar
    return (
      <div className={cn('flex gap-1', className)}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-sm"
          autoFocus
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button size="sm" className="h-7" onClick={handleSubmit} disabled={!name.trim() || isLoading}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancel} disabled={isLoading} title="Annuler (Échap)">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>
    );
  }

  // Version standard pour pages
  return (
    <div className={cn('flex gap-2', className)}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading}
      >
        Créer
      </Button>
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={isLoading}
      >
        Annuler
      </Button>
    </div>
  );
}
