// ===========================================
// Dialog de réinitialisation de mot de passe
// ===========================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import type { UserWithStats } from '@plumenote/types';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithStats | null;
  onConfirm: () => Promise<string | undefined>;
  isLoading?: boolean;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: ResetPasswordDialogProps) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!user) return null;

  const handleReset = async () => {
    try {
      const password = await onConfirm();
      if (password) {
        setTemporaryPassword(password);
      }
    } catch {
      // Erreur gérée par le parent
    }
  };

  const handleCopy = async () => {
    if (temporaryPassword) {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setTemporaryPassword(null);
    setCopied(false);
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {temporaryPassword
              ? 'Mot de passe réinitialisé'
              : 'Réinitialiser le mot de passe'}
          </DialogTitle>
          <DialogDescription>
            {temporaryPassword
              ? `Le mot de passe de ${user.displayName} a été réinitialisé.`
              : `Réinitialiser le mot de passe de ${user.displayName} (${user.email}) ?`}
          </DialogDescription>
        </DialogHeader>

        {temporaryPassword ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Mot de passe temporaire :
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={temporaryPassword}
                  readOnly
                  type={showPassword ? 'text' : 'password'}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-amber-600 dark:text-amber-400">
              Communiquez ce mot de passe à l'utilisateur de manière sécurisée.
              Il devra le changer à sa prochaine connexion.
            </p>

            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Un nouveau mot de passe temporaire sera généré. L'utilisateur sera
              déconnecté de toutes ses sessions et devra changer son mot de passe
              à la prochaine connexion.
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button onClick={handleReset} disabled={isLoading}>
                {isLoading ? 'Réinitialisation...' : 'Réinitialiser'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
