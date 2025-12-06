// ===========================================
// HelpMenu - Menu d'aide avec accès Statistiques et Raccourcis
// ===========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle, BarChart3, Keyboard, Settings, X } from 'lucide-react';
import { ShortcutsModal } from '../shortcuts/ShortcutsModal';
import { cn } from '../../lib/utils';

interface HelpMenuProps {
  isCollapsed?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export function HelpMenu({ isCollapsed = false }: HelpMenuProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      onClick: () => {
        setIsOpen(false);
        // TODO: Navigate to settings page when available
      },
    },
    {
      id: 'statistics',
      label: 'Statistiques',
      icon: BarChart3,
      onClick: () => {
        setIsOpen(false);
        navigate('/dashboard');
      },
    },
    {
      id: 'shortcuts',
      label: 'Raccourcis',
      icon: Keyboard,
      onClick: () => {
        setIsOpen(false);
        setShowShortcutsModal(true);
      },
    },
  ];

  return (
    <>
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              'hover:bg-muted text-muted-foreground hover:text-foreground',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isCollapsed && 'justify-center'
            )}
            data-testid="help-menu-trigger"
            aria-label="Menu aide"
          >
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Aide</span>}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className={cn(
              'w-48 rounded-md border bg-popover p-1 shadow-lg z-50',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
            side="top"
            align="start"
            sideOffset={8}
          >
            <div className="flex flex-col">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-sm text-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    'transition-colors cursor-pointer',
                    'focus:outline-none focus-visible:bg-accent'
                  )}
                  data-testid={`help-menu-${item.id}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <Popover.Arrow className="fill-popover" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Modal Raccourcis */}
      <ShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />
    </>
  );
}
