// ===========================================
// Composant ActionMenu - Générique
// Menu d'actions avec dropdown réutilisable
// ===========================================

import { useState } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

// Icons
const DotsVerticalIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  dividerBefore?: boolean;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
}

export function ActionMenu({ items, className }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <DotsVerticalIcon />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg z-20">
            <div className="py-1">
              {items.map((item, index) => (
                <div key={index}>
                  {item.dividerBefore && <hr className="my-1" />}
                  <button
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2',
                      item.variant === 'destructive' && 'text-destructive'
                    )}
                    onClick={() => {
                      item.onClick();
                      setIsOpen(false);
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
