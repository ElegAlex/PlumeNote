// ===========================================
// Composant Breadcrumb - Générique
// Navigation fil d'Ariane réutilisable
// ===========================================

import { cn } from '../../lib/utils';

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface BreadcrumbProps {
  root: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  items: BreadcrumbItem[];
  onItemClick: (id: string) => void;
  className?: string;
  rootClassName?: string;
}

export function Breadcrumb({
  root,
  items,
  onItemClick,
  className,
  rootClassName,
}: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <button
        onClick={root.onClick}
        className={cn(
          'flex items-center gap-1 hover:underline',
          rootClassName
        )}
      >
        {root.icon}
        {root.label}
      </button>
      {items.map((item, index) => (
        <span key={item.id} className="flex items-center gap-1">
          <ChevronRightIcon />
          <button
            onClick={() => onItemClick(item.id)}
            className={cn(
              'hover:underline',
              index === items.length - 1
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
