// ===========================================
// Dialogue de Partage (US-070 à US-072)
// ===========================================

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { toast } from '../ui/Toaster';
import { cn } from '../../lib/utils';

type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';

interface Permission {
  id: string;
  principalType: 'USER' | 'ROLE';
  principalId: string;
  principalName: string;
  level: PermissionLevel;
  inherited: boolean;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'folder' | 'note';
  resourceId: string;
  resourceName: string;
}

export function ShareDialog({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
}: ShareDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; type: 'user' | 'role' }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, resourceId]);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ permissions: Permission[] }>(
        `/permissions/${resourceType}s/${resourceId}`
      );
      setPermissions(response.data.permissions);
    } catch {
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get<{
        users: { id: string; displayName: string }[];
        roles: { id: string; name: string }[];
      }>(`/search/principals?q=${encodeURIComponent(query)}`);

      setSearchResults([
        ...response.data.users.map((u) => ({ id: u.id, name: u.displayName, type: 'user' as const })),
        ...response.data.roles.map((r) => ({ id: r.id, name: r.name, type: 'role' as const })),
      ]);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addPermission = async (
    principalId: string,
    principalType: 'USER' | 'ROLE',
    level: PermissionLevel
  ) => {
    try {
      await api.post(`/permissions/${resourceType}s/${resourceId}`, {
        principalId,
        principalType,
        level,
      });
      toast.success('Permission ajoutée');
      loadPermissions();
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      toast.error("Erreur lors de l'ajout de la permission");
    }
  };

  const updatePermission = async (permissionId: string, level: PermissionLevel) => {
    try {
      await api.patch(`/permissions/${permissionId}`, { level });
      toast.success('Permission mise à jour');
      loadPermissions();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const removePermission = async (permissionId: string) => {
    try {
      await api.delete(`/permissions/${permissionId}`);
      toast.success('Permission supprimée');
      loadPermissions();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!isOpen) return null;

  const permissionLevels: { value: PermissionLevel; label: string; description: string }[] = [
    { value: 'READ', label: 'Lecture', description: 'Peut voir le contenu' },
    { value: 'WRITE', label: 'Écriture', description: 'Peut modifier le contenu' },
    { value: 'ADMIN', label: 'Admin', description: 'Peut gérer les permissions' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Partager</h2>
              <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                {resourceName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b">
            <div className="relative">
              <Input
                placeholder="Rechercher un utilisateur ou un rôle..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center text-xs text-white',
                          result.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                        )}
                      >
                        {result.type === 'user' ? (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                          </svg>
                        ) : (
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                        )}
                      </span>
                      <span className="text-sm">{result.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({result.type === 'user' ? 'Utilisateur' : 'Rôle'})
                      </span>
                    </div>
                    <select
                      className="text-sm border rounded px-2 py-1"
                      onChange={(e) =>
                        addPermission(
                          result.id,
                          result.type === 'user' ? 'USER' : 'ROLE',
                          e.target.value as PermissionLevel
                        )
                      }
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Ajouter...
                      </option>
                      {permissionLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissions List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <svg
                  className="h-12 w-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <p>Aucune permission partagée</p>
                <p className="text-sm mt-1">
                  Recherchez un utilisateur pour partager
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md border',
                      permission.inherited && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-white text-sm',
                          permission.principalType === 'USER'
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                        )}
                      >
                        {permission.principalName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="font-medium text-sm">
                          {permission.principalName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {permission.principalType === 'USER'
                            ? 'Utilisateur'
                            : 'Rôle'}
                          {permission.inherited && ' (Hérité)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {permission.inherited ? (
                        <span className="text-sm text-muted-foreground">
                          {permissionLevels.find((l) => l.value === permission.level)?.label}
                        </span>
                      ) : (
                        <>
                          <select
                            className="text-sm border rounded px-2 py-1"
                            value={permission.level}
                            onChange={(e) =>
                              updatePermission(
                                permission.id,
                                e.target.value as PermissionLevel
                              )
                            }
                          >
                            {permissionLevels.map((level) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removePermission(permission.id)}
                            className="h-8 w-8 rounded hover:bg-destructive/10 text-destructive flex items-center justify-center"
                            title="Supprimer"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t">
            <Button onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
