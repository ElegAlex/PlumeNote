// ===========================================
// Page Administration (Sprint 2)
// US-053: Interface admin utilisateurs
// US-110: Configuration système
// US-112: Journal d'audit
// ===========================================

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { UsersManagement, AuditLogs } from '../components/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Users, FileText, Settings, Shield } from 'lucide-react';

type Tab = 'users' | 'roles' | 'audit' | 'system';

export function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // Rediriger si non admin
  if (currentUser?.role.name !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Gérez les utilisateurs, les rôles et consultez les logs d'audit.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Rôles</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Système</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>
                Créez, modifiez et gérez les comptes utilisateurs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des rôles</CardTitle>
              <CardDescription>
                Gérez les rôles et leurs permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>La gestion des rôles sera disponible prochainement.</p>
                <p className="text-sm mt-2">
                  Les rôles par défaut (Admin, Éditeur, Lecteur) sont déjà configurés.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Journal d'audit</CardTitle>
              <CardDescription>
                Consultez l'historique des actions effectuées sur la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogs />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration système</CardTitle>
              <CardDescription>
                Paramètres globaux de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>La configuration système sera disponible prochainement.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
