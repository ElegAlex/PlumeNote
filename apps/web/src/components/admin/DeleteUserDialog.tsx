// ===========================================
// Dialog de confirmation de suppression utilisateur
// ===========================================

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/AlertDialog';
import type { UserWithStats } from '@plumenote/types';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithStats | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: DeleteUserDialogProps) {
  if (!user) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Erreur gérée par le parent
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
              <strong>{user.displayName}</strong> ({user.email}) ?
            </p>
            <p className="text-destructive">
              Cette action est irréversible. Les notes créées par cet utilisateur
              seront conservées mais n'auront plus d'auteur associé.
            </p>
            {user.stats.notesCreated > 0 && (
              <p className="text-sm text-muted-foreground">
                Cet utilisateur a créé {user.stats.notesCreated} note(s).
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
