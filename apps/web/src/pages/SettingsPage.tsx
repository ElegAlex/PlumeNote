// ===========================================
// Page Paramètres (Settings)
// Accès aux préférences utilisateur et administration
// ===========================================

import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Shield, User, Bell, Palette } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Administration */}
        <div
          className="rounded-lg border bg-card text-card-foreground shadow-sm h-full hover:border-primary transition-colors cursor-pointer"
          onClick={() => navigate('/admin')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin')}
        >
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              Administration
            </h3>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">
              Gérer les utilisateurs, les rôles et les paramètres système.
            </p>
          </div>
        </div>

        {/* Profil */}
        <Card className="h-full opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Modifier votre nom d'affichage, avatar et informations personnelles.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="h-full opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configurer vos préférences de notifications.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        {/* Apparence */}
        <Card className="h-full opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Palette className="h-5 w-5" />
              Apparence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Personnaliser le thème et l'affichage de l'application.
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
