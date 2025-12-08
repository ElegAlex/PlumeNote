// ===========================================
// Tableau des utilisateurs
// ===========================================

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import {
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  Key,
  Trash2,
  Pencil,
} from 'lucide-react';
import type { UserWithStats, Role } from '@plumenote/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserTableProps {
  users: UserWithStats[];
  roles: Role[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onEdit: (user: UserWithStats) => void;
  onToggleStatus: (user: UserWithStats) => void;
  onResetPassword: (user: UserWithStats) => void;
  onDelete: (user: UserWithStats) => void;
  onChangeRole: (user: UserWithStats, roleId: string) => void;
  currentUserId?: string;
}

export function UserTable({
  users,
  roles,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
  onChangeRole,
  currentUserId,
}: UserTableProps) {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const formatLastLogin = (date: string | null) => {
    if (!date) return 'Jamais';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort('displayName')}
                className="h-8 px-2 hover:bg-transparent"
              >
                Utilisateur
                <SortIcon field="displayName" />
              </Button>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort('lastLoginAt')}
                className="h-8 px-2 hover:bg-transparent"
              >
                Dernière connexion
                <SortIcon field="lastLoginAt" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort('notesCreated')}
                className="h-8 px-2 hover:bg-transparent"
              >
                Notes créées
                <SortIcon field="notesCreated" />
              </Button>
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.displayName}</span>
                      <span className="text-sm text-muted-foreground">
                        @{user.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={isSelf}
                        >
                          {user.role.name}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {roles.map((role) => (
                          <DropdownMenuItem
                            key={role.id}
                            onClick={() => onChangeRole(user, role.id)}
                            disabled={role.id === user.role.id}
                          >
                            {role.name}
                            {role.id === user.role.id && ' (actuel)'}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="default" className="bg-green-500">
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Désactivé</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastLogin(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {user.stats.notesCreated}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleStatus(user)}
                          disabled={isSelf}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activer
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(user)}>
                          <Key className="mr-2 h-4 w-4" />
                          Réinitialiser le mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(user)}
                          disabled={isSelf}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
