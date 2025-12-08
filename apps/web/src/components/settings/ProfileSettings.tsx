// ===========================================
// Composant ProfileSettings (Sprint 6)
// Modification du profil utilisateur
// ===========================================

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { toast } from 'sonner';
import { Save, User, Mail, AtSign, Shield } from 'lucide-react';

export function ProfileSettings() {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(value !== user?.displayName || avatarUrl !== (user?.avatarUrl || ''));
  };

  const handleAvatarUrlChange = (value: string) => {
    setAvatarUrl(value);
    setHasChanges(displayName !== user?.displayName || value !== (user?.avatarUrl || ''));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await api.patch(`/users/${user.id}`, {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });

      // Mettre à jour le store
      setUser({
        ...user,
        displayName: response.data.displayName,
        avatarUrl: response.data.avatarUrl,
      });

      setHasChanges(false);
      toast.success('Profil mis à jour');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
    setHasChanges(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Informations non modifiables */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Informations du compte
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Nom d'utilisateur
            </Label>
            <Input
              value={user.username}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Le nom d'utilisateur ne peut pas être modifié.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Adresse email
            </Label>
            <Input
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Contactez un administrateur pour modifier l'email.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Rôle
          </Label>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {user.role.name}
            </span>
          </div>
        </div>
      </div>

      {/* Informations modifiables */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground">
          Informations personnelles
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nom d'affichage
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="Votre nom"
            />
            <p className="text-xs text-muted-foreground">
              Ce nom sera affiché dans l'application.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">URL de l'avatar</Label>
            <Input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => handleAvatarUrlChange(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-xs text-muted-foreground">
              URL d'une image pour votre avatar.
            </p>
          </div>
        </div>

        {/* Aperçu de l'avatar */}
        {avatarUrl && (
          <div className="space-y-2">
            <Label>Aperçu</Label>
            <div className="flex items-center gap-4">
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="h-16 w-16 rounded-full object-cover border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-sm text-muted-foreground">
                {displayName || user.username}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {hasChanges && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      )}

      {/* Statistiques */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground">
          Statistiques du compte
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Membre depuis</p>
            <p className="text-lg font-medium">
              {new Date(user.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Dernière connexion</p>
            <p className="text-lg font-medium">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
                : 'Maintenant'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Statut</p>
            <p className="text-lg font-medium text-green-600">Actif</p>
          </div>
        </div>
      </div>

      {/* Sécurité - Mot de passe */}
      <div className="space-y-4 pt-4 border-t">
        <PasswordSection />
      </div>
    </div>
  );
}

// Section mot de passe (lazy import pour éviter les dépendances circulaires)
function PasswordSection() {
  const [PasswordSettings, setPasswordSettings] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('./PasswordSettings').then((mod) => {
      setPasswordSettings(() => mod.PasswordSettings);
    });
  }, []);

  if (!PasswordSettings) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-muted rounded mb-2"></div>
        <div className="h-10 bg-muted rounded mb-2"></div>
        <div className="h-10 bg-muted rounded"></div>
      </div>
    );
  }

  return <PasswordSettings />;
}
