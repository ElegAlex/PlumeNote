// ===========================================
// Composant ProfileSettings (Sprint 6)
// Modification du profil utilisateur
// ===========================================

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { toast } from 'sonner';
import { Save, User, Mail, AtSign, Shield, Upload, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// 20 avatars prédéfinis (utilisant DiceBear API)
const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Robot5',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Fire',
];

export function ProfileSettings() {
  const { user, checkAuth } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(value !== user?.displayName || avatarUrl !== (user?.avatarUrl || ''));
  };

  const handleAvatarSelect = (url: string) => {
    setAvatarUrl(url);
    setHasChanges(displayName !== user?.displayName || url !== (user?.avatarUrl || ''));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    setIsUploading(true);
    try {
      // Convertir en base64 pour l'aperçu et le stockage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        setHasChanges(true);
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast.error('Erreur lors de la lecture du fichier');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Erreur lors du chargement de l\'image');
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await api.patch(`/users/${user.id}`, {
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });

      // Recharger le user depuis l'API pour synchroniser le store
      await checkAuth();

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
        {/* Nom d'affichage */}
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

        {/* Sélection d'avatar */}
        <div className="space-y-4">
          <Label>Avatar</Label>

          {/* Aperçu actuel */}
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
            <img
              src={avatarUrl || PRESET_AVATARS[0]}
              alt="Avatar actuel"
              className="h-20 w-20 rounded-full object-cover border-2 border-primary"
            />
            <div>
              <p className="font-medium">{displayName || user.username}</p>
              <p className="text-sm text-muted-foreground">Avatar actuel</p>
            </div>
          </div>

          {/* Upload personnalisé */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image personnalisée</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Chargement...' : 'Télécharger une image'}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou GIF. Max 2 Mo.
              </p>
            </div>
          </div>

          {/* Avatars prédéfinis */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ou choisissez un avatar</Label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {PRESET_AVATARS.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAvatarSelect(url)}
                  className={cn(
                    'relative h-12 w-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110',
                    avatarUrl === url
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  <img
                    src={url}
                    alt={`Avatar ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {avatarUrl === url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
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
