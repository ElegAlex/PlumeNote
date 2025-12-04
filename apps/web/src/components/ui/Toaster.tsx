// ===========================================
// Toaster Component (Sonner)
// ===========================================

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-background border-border text-foreground',
          title: 'text-foreground font-semibold',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'bg-destructive text-destructive-foreground border-destructive',
          success: 'bg-green-500 text-white border-green-500',
          warning: 'bg-yellow-500 text-white border-yellow-500',
          info: 'bg-blue-500 text-white border-blue-500',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
