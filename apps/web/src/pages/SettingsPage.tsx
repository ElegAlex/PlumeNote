// ===========================================
// Page Paramètres (Settings)
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePreferencesStore } from '../stores/preferencesStore';
import { useAuthStore } from '../stores/auth';
import { DisplaySettings, EditorSettings, ProfileSettings } from '../components/settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { toast } from 'sonner';
import {
  Palette,
  FileEdit,
  Shield,
  RotateCcw,
  User,
} from 'lucide-react';

type Tab = 'display' | 'editor' | 'profile';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    loadPreferences,
    resetPreferences,
    isLoading,
    isInitialized,
    error,
    clearError,
  } = usePreferencesStore();

  const [activeTab, setActiveTab] = useState<Tab>('display');
  const [isResetting, setIsResetting] = useState(false);

  // Chargement initial des préférences
  useEffect(() => {
    if (!isInitialized) {
      loadPreferences();
    }
  }, [isInitialized, loadPreferences]);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      return;
    }

    setIsResetting(true);
    try {
      await resetPreferences();
      toast.success('Paramètres réinitialisés');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Personnalisez votre expérience PlumeNote.
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role.name === 'admin' && (
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <Shield className="mr-2 h-4 w-4" />
              Administration
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Affichage</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            <span className="hidden sm:inline">Éditeur</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Affichage
              </CardTitle>
              <CardDescription>
                Personnalisez le thème, la langue et le format d'affichage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisplaySettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                Éditeur
              </CardTitle>
              <CardDescription>
                Configurez le comportement et l'apparence de l'éditeur de notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditorSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles et votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
