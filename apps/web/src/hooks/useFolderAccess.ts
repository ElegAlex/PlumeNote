// ===========================================
// Hook useFolderAccess - Gestion des accès aux dossiers
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../components/ui/Toaster';
import type { FolderAccess, FolderAccessType, UpdateFolderAccessRequest } from '@plumenote/types';

interface UseFolderAccessReturn {
  access: FolderAccess | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateAccess: (
    accessType: FolderAccessType,
    accessList: UpdateFolderAccessRequest['accessList']
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFolderAccess(folderId: string): UseFolderAccessReturn {
  const [access, setAccess] = useState<FolderAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    if (!folderId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<FolderAccess>(`/folders/${folderId}/access`);
      setAccess(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors du chargement des accès';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const updateAccess = useCallback(async (
    accessType: FolderAccessType,
    accessList: UpdateFolderAccessRequest['accessList']
  ) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await api.patch<FolderAccess>(`/folders/${folderId}/access`, {
        accessType,
        accessList,
      });
      setAccess(response.data);
      toast.success(
        accessType === 'RESTRICTED'
          ? 'Accès restreint activé'
          : 'Accès ouvert à tous'
      );
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la mise à jour des accès';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [folderId]);

  return {
    access,
    isLoading,
    isSaving,
    error,
    updateAccess,
    refresh: fetchAccess,
  };
}
