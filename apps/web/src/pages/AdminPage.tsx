// ===========================================
// Page Administration (US-110 à US-114)
// US-053: Interface admin utilisateurs
// ===========================================

import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { toast } from '../components/ui/Toaster';
import { useAuthStore } from '../stores/auth';
import { FileText, Edit3, ChevronUp, ChevronDown } from 'lucide-react';
import type { Role, UserWithStats, AdminUsersResponse } from '@collabnotes/types';

type Tab = 'users' | 'roles' | 'audit' | 'system';
type SortField = 'displayName' | 'lastLoginAt' | 'createdAt' | 'notesCreated' | 'notesModified';
type SortOrder = 'asc' | 'desc';

// Formater la date de dernière connexion
function formatLastLogin(dateString: string | null | undefined): string {
  if (!dateString) return 'Jamais';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

export function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      loadRoles();
    }
  }, [activeTab, sortField, sortOrder, currentPage]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await api.get<AdminUsersResponse>(`/users?${params}`);
      setUsers(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const loadRoles = async () => {
    try {
      const response = await api.get<{ roles: Role[] }>('/users/roles');
      setRoles(response.data.roles);
    } catch {
      // Silently fail - roles dropdown won't work but page still usable
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await api.patch(`/users/${userId}`, { isActive: !isActive });
      toast.success(`Utilisateur ${isActive ? 'désactivé' : 'activé'}`);
      loadUsers();
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const changeUserRole = async (userId: string, roleId: string) => {
    try {
      await api.patch(`/users/${userId}`, { roleId });
      toast.success('Rôle modifié');
      loadUsers();
    } catch {
      toast.error('Erreur lors du changement de rôle');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { id: 'users' as Tab, label: 'Utilisateurs' },
          { id: 'roles' as Tab, label: 'Rôles' },
          { id: 'audit' as Tab, label: 'Audit' },
          { id: 'system' as Tab, label: 'Système' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {total} utilisateur{total > 1 ? 's' : ''} au total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-64"
                />
                <Button onClick={handleSearch} variant="outline" size="sm">
                  Rechercher
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th
                        className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('displayName')}
                      >
                        Utilisateur
                        <SortIcon field="displayName" />
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Rôle</th>
                      <th className="text-left py-3 px-4 font-medium">Statut</th>
                      <th
                        className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('lastLoginAt')}
                      >
                        Dernière connexion
                        <SortIcon field="lastLoginAt" />
                      </th>
                      <th
                        className="text-center py-3 px-4 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('notesCreated')}
                        title="Notes créées"
                      >
                        <FileText className="h-4 w-4 inline" />
                        <SortIcon field="notesCreated" />
                      </th>
                      <th
                        className="text-center py-3 px-4 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('notesModified')}
                        title="Notes modifiées"
                      >
                        <Edit3 className="h-4 w-4 inline" />
                        <SortIcon field="notesModified" />
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {user.displayName || user.username}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {user.email || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {roles.length > 0 ? (
                            <select
                              value={user.role?.id || ''}
                              onChange={(e) => changeUserRole(user.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded border bg-background"
                              disabled={user.id === currentUser?.id}
                            >
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted">
                              {user.role?.name || 'User'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              user.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatLastLogin(user.lastLoginAt)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className="font-medium">{user.stats?.notesCreated ?? 0}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          <span className="font-medium">{user.stats?.notesModified ?? 0}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleUserStatus(user.id, user.isActive)
                            }
                            disabled={user.id === currentUser?.id}
                          >
                            {user.isActive ? 'Désactiver' : 'Activer'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {users.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'roles' && (
        <Card>
          <CardHeader>
            <CardTitle>Gestion des rôles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              La gestion des rôles sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle>Journal d'audit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Le journal d'audit sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
      )}

      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration système</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              La configuration système sera disponible prochainement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
