// ===========================================
// FolderAccessModal - Gestion des accès restreints
// ===========================================

import { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';
import { useFolderAccess } from '../../hooks/useFolderAccess';
import { useUsers } from '../../hooks/useUsers';
import type { FolderAccessType } from '@plumenote/types';

// Icons
const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UnlockIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

interface SelectedUser {
  userId: string;
  canRead: boolean;
  canWrite: boolean;
}

interface FolderAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
}

export function FolderAccessModal({
  isOpen,
  onClose,
  folderId,
  folderName,
}: FolderAccessModalProps) {
  const { access, isLoading, updateAccess, isSaving } = useFolderAccess(folderId);
  const { users, isLoading: isLoadingUsers } = useUsers();

  const [accessType, setAccessType] = useState<FolderAccessType>('OPEN');
  const [selectedUsers, setSelectedUsers] = useState<Map<string, SelectedUser>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  // Initialiser avec les données existantes
  useEffect(() => {
    if (access) {
      setAccessType(access.accessType);
      const usersMap = new Map<string, SelectedUser>();
      access.accessList.forEach((item) => {
        usersMap.set(item.userId, {
          userId: item.userId,
          canRead: item.canRead,
          canWrite: item.canWrite,
        });
      });
      setSelectedUsers(usersMap);
    }
  }, [access]);

  // Filtrer les utilisateurs
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const searchLower = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.displayName?.toLowerCase().includes(searchLower)
    );
  }, [users, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    const newMap = new Map(selectedUsers);
    if (newMap.has(userId)) {
      newMap.delete(userId);
    } else {
      newMap.set(userId, { userId, canRead: true, canWrite: false });
    }
    setSelectedUsers(newMap);
  };

  const toggleUserWrite = (userId: string) => {
    const newMap = new Map(selectedUsers);
    const existing = newMap.get(userId);
    if (existing) {
      newMap.set(userId, { ...existing, canWrite: !existing.canWrite });
      setSelectedUsers(newMap);
    }
  };

  const handleSave = async () => {
    try {
      const accessList = Array.from(selectedUsers.values());
      await updateAccess(accessType, accessList);
      onClose();
    } catch {
      // L'erreur est gérée dans le hook
    }
  };

  const getInitials = (displayName: string, username: string) => {
    const name = displayName || username;
    return name.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-lg shadow-xl">
            <Dialog.Title className="sr-only">Chargement</Dialog.Title>
            <Dialog.Description className="sr-only">Chargement des accès du dossier</Dialog.Description>
            <div className="flex items-center justify-center p-8">
              <Spinner size="lg" />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background rounded-lg shadow-xl animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="text-lg font-semibold">
              Gestion des accès - {folderName}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Configurez qui peut accéder à ce dossier et avec quels droits
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <XIcon />
              </Button>
            </Dialog.Close>
          </div>

          <div className="p-4 space-y-6">
            {/* Toggle Accès ouvert / restreint */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {accessType === 'OPEN' ? (
                  <span className="text-green-600">
                    <UnlockIcon />
                  </span>
                ) : (
                  <span className="text-amber-600">
                    <LockIcon />
                  </span>
                )}
                <div>
                  <p className="font-medium">
                    {accessType === 'OPEN' ? 'Accès ouvert' : 'Accès restreint'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {accessType === 'OPEN'
                      ? 'Tous les utilisateurs peuvent accéder à ce dossier'
                      : 'Seuls les utilisateurs sélectionnés ont accès'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={accessType === 'RESTRICTED'}
                onClick={() => setAccessType(accessType === 'OPEN' ? 'RESTRICTED' : 'OPEN')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  accessType === 'RESTRICTED' ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    accessType === 'RESTRICTED' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Liste des utilisateurs (visible si RESTRICTED) */}
            {accessType === 'RESTRICTED' && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <SearchIcon />
                  </span>
                  <Input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {isLoadingUsers ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Chargement...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Aucun utilisateur trouvé
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedUsers.has(user.id);
                      const selection = selectedUsers.get(user.id);

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50"
                        >
                          {/* Checkbox sélection */}
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(user.id)}
                            className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-background border-input'
                            }`}
                          >
                            {isSelected && <CheckIcon />}
                          </button>

                          {/* Avatar */}
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {getInitials(user.displayName, user.username)}
                          </div>

                          {/* Info utilisateur */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {user.displayName || user.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>

                          {/* Toggle "Peut modifier" */}
                          {isSelected && (
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <button
                                type="button"
                                onClick={() => toggleUserWrite(user.id)}
                                className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                  selection?.canWrite
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'bg-background border-input'
                                }`}
                              >
                                {selection?.canWrite && <CheckIcon />}
                              </button>
                              <span className="text-muted-foreground">
                                Peut modifier
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedUsers.size > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedUsers.size} utilisateur(s) sélectionné(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
