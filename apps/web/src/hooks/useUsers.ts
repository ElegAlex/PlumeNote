// ===========================================
// Hook useUsers - Liste des utilisateurs
// ===========================================

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '@plumenote/types';

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get<{ users: User[] }>('/users/list');
        setUsers(response.data.users || []);
      } catch (err: any) {
        const message = err.response?.data?.message || 'Erreur lors du chargement des utilisateurs';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, isLoading, error };
}
