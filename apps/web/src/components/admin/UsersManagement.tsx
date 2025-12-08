// ===========================================
// Composant principal de gestion des utilisateurs
// ===========================================

import { useEffect, useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useAuthStore } from '../../stores/auth';
import { UserTable } from './UserTable';
import { UserFormDialog } from './UserFormDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Spinner } from '../ui/Spinner';
import { toast } from 'sonner';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserWithStats, CreateUserRequest } from '@plumenote/types';

export function UsersManagement() {
  const { user: currentUser } = useAuthStore();
  const {
    users,
    roles,
    isLoading,
    error,
    loadUsers,
    loadRoles,
    setUsersPage,
    setUsersSearch,
    setUsersRoleFilter,
    setUsersActiveFilter,
    setUsersSort,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetUserPassword,
    clearError,
  } = useAdminStore();

  // États locaux pour les dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithStats | null>(null);
  const [resettingUser, setResettingUser] = useState<UserWithStats | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Chargement initial
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error]);

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== users.search) {
        setUsersSearch(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = async (data: CreateUserRequest) => {
    const result = await createUser(data);
    if (result.temporaryPassword) {
      toast.success(
        `Utilisateur créé. Mot de passe temporaire : ${result.temporaryPassword}`,
        { duration: 10000 }
      );
    } else {
      toast.success('Utilisateur créé avec succès');
    }
  };

  const handleEdit = async (data: CreateUserRequest) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, {
      displayName: data.displayName,
      email: data.email,
      roleId: data.roleId,
      isActive: data.isActive,
    });
    setEditingUser(null);
    toast.success('Utilisateur modifié');
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await deleteUser(deletingUser.id);
    setDeletingUser(null);
    toast.success('Utilisateur supprimé');
  };

  const handleToggleStatus = async (user: UserWithStats) => {
    await toggleUserStatus(user.id, !user.isActive);
    toast.success(user.isActive ? 'Utilisateur désactivé' : 'Utilisateur activé');
  };

  const handleResetPassword = async () => {
    if (!resettingUser) return undefined;
    return await resetUserPassword(resettingUser.id);
  };

  const handleChangeRole = async (user: UserWithStats, roleId: string) => {
    await updateUser(user.id, { roleId });
    toast.success('Rôle modifié');
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={users.roleFilter || 'all'}
            onValueChange={(value) => setUsersRoleFilter(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              users.activeFilter === null
                ? 'all'
                : users.activeFilter
                  ? 'active'
                  : 'inactive'
            }
            onValueChange={(value) =>
              setUsersActiveFilter(
                value === 'all' ? null : value === 'active'
              )
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Désactivés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Tableau */}
      {isLoading && users.items.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <UserTable
          users={users.items}
          roles={roles}
          sortBy={users.sortBy}
          sortOrder={users.sortOrder}
          onSort={(field) => setUsersSort(field as any)}
          onEdit={setEditingUser}
          onToggleStatus={handleToggleStatus}
          onResetPassword={setResettingUser}
          onDelete={setDeletingUser}
          onChangeRole={handleChangeRole}
          currentUserId={currentUser?.id}
        />
      )}

      {/* Pagination */}
      {users.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {users.total} utilisateur{users.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUsersPage(users.page - 1)}
              disabled={users.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {users.page} / {users.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUsersPage(users.page + 1)}
              disabled={users.page >= users.totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <UserFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        roles={roles}
        onSubmit={handleCreate}
        isLoading={isLoading}
      />

      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        roles={roles}
        onSubmit={handleEdit}
        isLoading={isLoading}
      />

      <DeleteUserDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
        onConfirm={handleDelete}
        isLoading={isLoading}
      />

      <ResetPasswordDialog
        open={!!resettingUser}
        onOpenChange={(open) => !open && setResettingUser(null)}
        user={resettingUser}
        onConfirm={handleResetPassword}
        isLoading={isLoading}
      />
    </div>
  );
}
