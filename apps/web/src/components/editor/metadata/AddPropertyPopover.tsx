// ===========================================
// Composant AddPropertyPopover (P2)
// Popover pour ajouter une nouvelle propriété à une note
// ===========================================

import { useState, useCallback } from 'react';
import {
  Plus,
  Type,
  Hash,
  Calendar,
  Clock,
  Check,
  Tag,
  ChevronDown,
  Link as LinkIcon,
  Star,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { PropertyDefinition, PropertyType } from '@plumenote/types';

// ----- Types -----

interface AddPropertyPopoverProps {
  suggestedProperties: PropertyDefinition[];
  onAddProperty: (name: string, type: PropertyType, defaultValue?: unknown) => void;
}

// ----- Types disponibles -----

const PROPERTY_TYPES: Array<{
  type: PropertyType;
  label: string;
  icon: typeof Type;
  description: string;
}> = [
  { type: 'text', label: 'Text', icon: Type, description: 'Free-form text' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date (YYYY-MM-DD)' },
  { type: 'datetime', label: 'Date & Time', icon: Clock, description: 'Date with time' },
  { type: 'checkbox', label: 'Checkbox', icon: Check, description: 'True/False toggle' },
  { type: 'tags', label: 'Tags', icon: Tag, description: 'Multiple tags' },
  { type: 'select', label: 'Select', icon: ChevronDown, description: 'Single choice' },
  { type: 'multiselect', label: 'Multi-Select', icon: ChevronDown, description: 'Multiple choices' },
  { type: 'link', label: 'Link', icon: LinkIcon, description: 'Link to another note' },
];

// ----- Composant Principal -----

export function AddPropertyPopover({
  suggestedProperties,
  onAddProperty,
}: AddPropertyPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'suggested' | 'custom'>('suggested');
  const [customName, setCustomName] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType>('text');

  const handleAddSuggested = useCallback(
    (prop: PropertyDefinition) => {
      onAddProperty(prop.name, prop.type, prop.defaultValue);
      setIsOpen(false);
    },
    [onAddProperty]
  );

  const handleAddCustom = useCallback(() => {
    const name = customName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (name) {
      onAddProperty(name, selectedType);
      setCustomName('');
      setSelectedType('text');
      setIsOpen(false);
    }
  }, [customName, selectedType, onAddProperty]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustom();
      }
    },
    [handleAddCustom]
  );

  return (
    <div className="relative">
      {/* Trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add property
      </Button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Content */}
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-popover border rounded-lg shadow-lg p-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                onClick={() => setMode('suggested')}
                className={`flex-1 text-xs py-1 px-2 rounded ${
                  mode === 'suggested'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Suggested
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 text-xs py-1 px-2 rounded ${
                  mode === 'custom'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Suggested Properties */}
            {mode === 'suggested' && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {suggestedProperties.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    All properties are already added
                  </p>
                ) : (
                  suggestedProperties.map((prop) => {
                    const typeConfig = PROPERTY_TYPES.find((t) => t.type === prop.type);
                    const Icon = typeConfig?.icon || Type;

                    return (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => handleAddSuggested(prop)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded hover:bg-muted"
                      >
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{prop.displayName}</div>
                          {prop.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {prop.description}
                            </div>
                          )}
                        </div>
                        {prop.isDefault && (
                          <Star className="h-3 w-3 text-amber-500" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Custom Property */}
            {mode === 'custom' && (
              <div className="space-y-2">
                {/* Name input */}
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="property_name"
                    className="h-7 text-sm mt-1"
                    autoFocus
                  />
                </div>

                {/* Type selector */}
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {PROPERTY_TYPES.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-xs ${
                          selectedType === type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="truncate w-full text-center">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add button */}
                <Button
                  size="sm"
                  onClick={handleAddCustom}
                  disabled={!customName.trim()}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add "{customName || 'property'}"
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AddPropertyPopover;
