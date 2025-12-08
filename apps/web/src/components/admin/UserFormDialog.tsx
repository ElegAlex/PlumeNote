// ===========================================
// Dialog création/modification utilisateur
// ===========================================

import { useState, useEffect } from 'react';
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
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import type { Role, CreateUserRequest, UserWithStats } from '@plumenote/types';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithStats | null;
  roles: Role[];
  onSubmit: (data: CreateUserRequest) => Promise<void>;
  isLoading?: boolean;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
  onSubmit,
  isLoading,
}: UserFormDialogProps) {
  const isEdit = !!user;

  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    displayName: '',
    password: '',
    roleId: '',
    isActive: true,
    mustChangePassword: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        password: '',
        roleId: user.role.id,
        isActive: user.isActive,
        mustChangePassword: false,
      });
    } else {
      setFormData({
        username: '',
        email: '',
        displayName: '',
        password: '',
        roleId: roles[0]?.id || '',
        isActive: true,
        mustChangePassword: true,
      });
    }
    setErrors({});
  }, [user, roles, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Le nom d\'utilisateur est requis';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Caractères invalides';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Le nom d\'affichage est requis';
    }

    if (!isEdit && formData.password && formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }

    if (!formData.roleId) {
      newErrors.roleId = 'Le rôle est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch {
      // Erreur gérée par le parent
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations de l\'utilisateur.'
              : 'Remplissez les informations pour créer un nouvel utilisateur.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                disabled={isEdit}
                placeholder="john.doe"
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="John Doe"
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Mot de passe <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Laisser vide pour générer automatiquement"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value: string) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && (
                <p className="text-sm text-destructive">{errors.roleId}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setFormData({ ...formData, isActive: checked === true })
                }
              />
              <Label htmlFor="isActive" className="text-sm font-normal">
                Compte actif
              </Label>
            </div>

            {!isEdit && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustChangePassword"
                  checked={formData.mustChangePassword}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    setFormData({ ...formData, mustChangePassword: checked === true })
                  }
                />
                <Label htmlFor="mustChangePassword" className="text-sm font-normal">
                  Forcer le changement de mot de passe à la première connexion
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
