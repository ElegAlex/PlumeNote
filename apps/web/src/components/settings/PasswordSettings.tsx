// ===========================================
// Composant PasswordSettings (Sprint 7)
// Changement de mot de passe utilisateur
// ===========================================

import { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    setIsSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Erreur lors du changement de mot de passe';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Changer le mot de passe
        </h3>

        {/* Mot de passe actuel */}
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Mot de passe actuel</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Entrez votre mot de passe actuel"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Indicateur de force */}
          {newPassword.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${
                      level <= passwordStrength.level
                        ? passwordStrength.color
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${passwordStrength.textColor}`}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirmation */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le nouveau mot de passe"
              className={
                confirmPassword.length > 0 && newPassword !== confirmPassword
                  ? 'border-destructive'
                  : ''
              }
            />
            {confirmPassword.length > 0 && newPassword === confirmPassword && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">
              Les mots de passe ne correspondent pas
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={!isValid || isSaving}>
        {isSaving ? 'Modification...' : 'Modifier le mot de passe'}
      </Button>
    </form>
  );
}

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
  textColor: string;
} {
  if (password.length === 0) {
    return { level: 0, label: '', color: '', textColor: '' };
  }

  let score = 0;

  // Longueur
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexité
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const level = Math.min(4, Math.ceil(score / 1.25));

  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = [
    'bg-destructive',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-green-600',
  ];
  const textColors = [
    'text-destructive',
    'text-orange-500',
    'text-yellow-500',
    'text-green-500',
    'text-green-600',
  ];

  return {
    level,
    label: labels[level] ?? labels[0] ?? '',
    color: colors[level] ?? colors[0] ?? '',
    textColor: textColors[level] ?? textColors[0] ?? '',
  };
}
