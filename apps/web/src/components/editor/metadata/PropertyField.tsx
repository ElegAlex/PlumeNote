// ===========================================
// Composant PropertyField (P2)
// Champ d'édition adaptatif selon le type de propriété
// ===========================================

import { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Check,
  X,
  Tag,
  Link as LinkIcon,
  Hash,
  Type,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { PropertyDefinition, PropertyType } from '@plumenote/types';

// ----- Types -----

interface PropertyFieldProps {
  name: string;
  displayName?: string;
  value: unknown;
  definition?: PropertyDefinition;
  onChange: (value: unknown) => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

// ----- Icônes par type -----

const TYPE_ICONS: Record<PropertyType, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  datetime: Clock,
  checkbox: Check,
  tags: Tag,
  select: ChevronDown,
  multiselect: ChevronDown,
  link: LinkIcon,
};

// ----- Composant Principal -----

export function PropertyField({
  name,
  displayName,
  value,
  definition,
  onChange,
  onRemove,
  readOnly = false,
}: PropertyFieldProps) {
  const type = definition?.type || inferType(value);
  const Icon = TYPE_ICONS[type] || Type;
  const label = displayName || definition?.displayName || formatLabel(name);

  return (
    <div className="flex items-start gap-2 py-1.5 group" data-testid="property-field">
      {/* Label avec icône */}
      <div className="flex items-center gap-1.5 min-w-[120px] text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>

      {/* Champ de valeur */}
      <div className="flex-1 min-w-0">
        <FieldInput
          type={type}
          value={value}
          options={definition?.options || []}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>

      {/* Bouton supprimer */}
      {onRemove && !readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
          onClick={onRemove}
          data-testid="remove-property-button"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );
}

// ----- Champs par type -----

interface FieldInputProps {
  type: PropertyType;
  value: unknown;
  options: string[];
  onChange: (value: unknown) => void;
  readOnly: boolean;
}

function FieldInput({ type, value, options, onChange, readOnly }: FieldInputProps) {
  switch (type) {
    case 'text':
      return <TextField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'number':
      return <NumberField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'date':
      return <DateField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'datetime':
      return <DateTimeField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'checkbox':
      return <CheckboxField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'tags':
      return <TagsField value={value} onChange={onChange} readOnly={readOnly} />;
    case 'select':
      return <SelectField value={value} options={options} onChange={onChange} readOnly={readOnly} />;
    case 'multiselect':
      return <MultiSelectField value={value} options={options} onChange={onChange} readOnly={readOnly} />;
    case 'link':
      return <LinkField value={value} onChange={onChange} readOnly={readOnly} />;
    default:
      return <TextField value={value} onChange={onChange} readOnly={readOnly} />;
  }
}

// ----- TEXT -----

function TextField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <Input
      type="text"
      value={String(value || '')}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-sm"
      disabled={readOnly}
      data-testid="property-text-input"
    />
  );
}

// ----- NUMBER -----

function NumberField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <Input
      type="number"
      value={Number(value) || 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="h-7 text-sm"
      disabled={readOnly}
    />
  );
}

// ----- DATE -----

function DateField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  const dateValue = useMemo(() => {
    if (!value) return '';
    const str = String(value);
    // Extraire YYYY-MM-DD
    return str.split('T')[0];
  }, [value]);

  return (
    <Input
      type="date"
      value={dateValue}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-sm"
      disabled={readOnly}
      data-testid="property-date-input"
    />
  );
}

// ----- DATETIME -----

function DateTimeField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  const dateTimeValue = useMemo(() => {
    if (!value) return '';
    const str = String(value);
    // Format pour input datetime-local: YYYY-MM-DDTHH:mm
    if (str.includes('T')) {
      return str.slice(0, 16);
    }
    return str;
  }, [value]);

  return (
    <Input
      type="datetime-local"
      value={dateTimeValue}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
      className="h-7 text-sm"
      disabled={readOnly}
    />
  );
}

// ----- CHECKBOX -----

function CheckboxField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  const checked = Boolean(value);

  return (
    <button
      type="button"
      onClick={() => !readOnly && onChange(!checked)}
      className={`
        h-5 w-5 rounded border flex items-center justify-center
        ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}
        ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}
      `}
      disabled={readOnly}
      data-testid="property-checkbox"
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  );
}

// ----- TAGS -----

function TagsField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  }, [inputValue, tags, onChange]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [addTag, inputValue, removeTag, tags]
  );

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[28px] p-1 border rounded-md bg-background" data-testid="property-tags">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-muted rounded"
        >
          {tag}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder="Add tag..."
          className="flex-1 min-w-[80px] text-sm bg-transparent outline-none"
        />
      )}
    </div>
  );
}

// ----- SELECT -----

function SelectField({
  value,
  options,
  onChange,
  readOnly,
}: {
  value: unknown;
  options: string[];
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  return (
    <select
      value={String(value || '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
      className="h-7 w-full text-sm border rounded-md bg-background px-2 outline-none focus:ring-1 focus:ring-ring"
      data-testid="property-select"
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {formatLabel(opt)}
        </option>
      ))}
    </select>
  );
}

// ----- MULTISELECT -----

function MultiSelectField({
  value,
  options,
  onChange,
  readOnly,
}: {
  value: unknown;
  options: string[];
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  const selected = Array.isArray(value) ? value : [];

  const toggleOption = useCallback(
    (opt: string) => {
      if (selected.includes(opt)) {
        onChange(selected.filter((s) => s !== opt));
      } else {
        onChange([...selected, opt]);
      }
    },
    [selected, onChange]
  );

  return (
    <div className="flex flex-wrap gap-1" data-testid="property-multiselect">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => !readOnly && toggleOption(opt)}
            disabled={readOnly}
            className={`
              px-2 py-0.5 text-xs rounded-full border
              ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:border-primary'}
              ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            role="option"
            aria-selected={isSelected}
          >
            {formatLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ----- LINK -----

function LinkField({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly: boolean;
}) {
  // TODO: Implémenter l'autocomplétion des notes
  return (
    <div className="flex items-center gap-1" data-testid="property-link">
      <span className="text-muted-foreground">[[</span>
      <Input
        type="text"
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Note title or ID"
        className="h-7 text-sm"
        disabled={readOnly}
      />
      <span className="text-muted-foreground">]]</span>
    </div>
  );
}

// ----- Helpers -----

/**
 * Infère le type d'une valeur
 */
function inferType(value: unknown): PropertyType {
  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'tags';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (value.startsWith('[[') && value.endsWith(']]')) return 'link';
  }
  return 'text';
}

/**
 * Formate un nom de propriété en label
 */
function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default PropertyField;
