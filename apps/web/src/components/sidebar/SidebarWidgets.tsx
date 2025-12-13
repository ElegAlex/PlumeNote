// ===========================================
// SidebarWidgets - P1: Stats & Raccourcis
// Widgets migrés de la homepage vers la sidebar
// ===========================================

import { useEffect, useState, memo } from 'react';
import { useHomepageStore } from '../../stores/homepage';

// ===========================================
// Widget Statistiques
// ===========================================

export const SidebarStats = memo(function SidebarStats() {
  const { pinnedNotes, recentNotes, upcomingEvents } = useHomepageStore();

  return (
    <div className="px-2 py-3 border-t">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Statistiques
      </h3>
      <div className="space-y-1.5 text-sm">
        <StatItem label="Notes récentes" value={recentNotes.length} />
        <StatItem label="Notes épinglées" value={pinnedNotes.length} />
        <StatItem label="Événements" value={upcomingEvents.length} />
      </div>
    </div>
  );
});

interface StatItemProps {
  label: string;
  value: number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/50 transition-colors">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ===========================================
// Widget Raccourcis clavier
// ===========================================

import { NavLink } from 'react-router-dom';

interface Shortcut {
  key: string;
  action: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: '⌘K', action: 'Recherche' },
  { key: 'Alt+N', action: 'Nouvelle note' },
  { key: '⌘S', action: 'Sauvegarder' },
  { key: '⌘?', action: 'Raccourcis' },
];

export const SidebarShortcuts = memo(function SidebarShortcuts() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.includes('Mac'));
  }, []);

  const formatKey = (key: string) => {
    if (!isMac) {
      return key.replace('⌘', 'Ctrl+');
    }
    return key;
  };

  return (
    <div className="px-2 py-3 border-t">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Raccourcis
        </h3>
        <NavLink
          to="/shortcuts"
          className="text-xs text-primary hover:underline"
        >
          Tous
        </NavLink>
      </div>
      <div className="space-y-1 text-sm">
        {SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.key}
            className="flex items-center justify-between px-2 py-1"
          >
            <span className="text-muted-foreground">{shortcut.action}</span>
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded text-muted-foreground font-mono">
              {formatKey(shortcut.key)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
});
