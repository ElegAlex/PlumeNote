// ===========================================
// Store Administration (Zustand) - Sprint 2
// ===========================================

import { create } from 'zustand';
import type {
  UserWithStats,
  Role,
  AuditLog,
  AdminStats,
  CreateUserRequest,
  UpdateUserAdminRequest,
  AuditLogFilters,
  TrashedNote,
} from '@plumenote/types';
import { adminApi } from '../services/adminApi';

// ===== Types d'état =====

interface UsersState {
  items: UserWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  roleFilter: string | null;
  activeFilter: boolean | null;
  sortBy: 'displayName' | 'lastLoginAt' | 'createdAt' | 'notesCreated' | 'notesModified';
  sortOrder: 'asc' | 'desc';
}

interface AuditState {
  logs: AuditLog[];
  total: number;
  filters: AuditLogFilters;
}

interface AdminState {
  // État utilisateurs
  users: UsersState;

  // Rôles
  roles: Role[];

  // Audit
  audit: AuditState;

  // Statistiques
  stats: AdminStats | null;

  // Corbeille
  trash: TrashedNote[];

  // État global
  isLoading: boolean;
  error: string | null;

  // Actions utilisateurs
  loadUsers: () => Promise<void>;
  setUsersPage: (page: number) => void;
  setUsersSearch: (search: string) => void;
  setUsersRoleFilter: (roleId: string | null) => void;
  setUsersActiveFilter: (active: boolean | null) => void;
  setUsersSort: (sortBy: UsersState['sortBy'], sortOrder?: 'asc' | 'desc') => void;
  createUser: (data: CreateUserRequest) => Promise<{ temporaryPassword?: string }>;
  updateUser: (userId: string, data: UpdateUserAdminRequest) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<string | undefined>;

  // Actions rôles
  loadRoles: () => Promise<void>;

  // Actions audit
  loadAuditLogs: () => Promise<void>;
  setAuditFilters: (filters: Partial<AuditLogFilters>) => void;
  exportAuditLogs: () => Promise<Blob>;

  // Actions stats
  loadStats: () => Promise<void>;

  // Actions corbeille
  loadTrash: () => Promise<void>;
  deletePermanently: (noteId: string) => Promise<void>;
  emptyTrash: () => Promise<number>;

  // Utilitaires
  clearError: () => void;
}

// ===== Store =====

export const useAdminStore = create<AdminState>()((set, get) => ({
  // État initial
  users: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    search: '',
    roleFilter: null,
    activeFilter: null,
    sortBy: 'displayName',
    sortOrder: 'asc',
  },

  roles: [],

  audit: {
    logs: [],
    total: 0,
    filters: {
      limit: 50,
      offset: 0,
    },
  },

  stats: null,
  trash: [],
  isLoading: false,
  error: null,

  // ===== Actions Utilisateurs =====

  loadUsers: async () => {
    const { users } = get();
    set({ isLoading: true, error: null });

    try {
      const response = await adminApi.getUsers({
        search: users.search || undefined,
        roleId: users.roleFilter || undefined,
        isActive: users.activeFilter ?? undefined,
        page: users.page,
        limit: users.pageSize,
        sortBy: users.sortBy,
        sortOrder: users.sortOrder,
      });

      set({
        users: {
          ...users,
          items: response.items,
          total: response.total,
          totalPages: response.totalPages,
        },
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement',
        isLoading: false,
      });
    }
  },

  setUsersPage: (page) => {
    set((state) => ({
      users: { ...state.users, page },
    }));
    get().loadUsers();
  },

  setUsersSearch: (search) => {
    set((state) => ({
      users: { ...state.users, search, page: 1 },
    }));
    get().loadUsers();
  },

  setUsersRoleFilter: (roleId) => {
    set((state) => ({
      users: { ...state.users, roleFilter: roleId, page: 1 },
    }));
    get().loadUsers();
  },

  setUsersActiveFilter: (active) => {
    set((state) => ({
      users: { ...state.users, activeFilter: active, page: 1 },
    }));
    get().loadUsers();
  },

  setUsersSort: (sortBy, sortOrder) => {
    const currentOrder = get().users.sortOrder;
    const newOrder = sortOrder || (currentOrder === 'asc' ? 'desc' : 'asc');

    set((state) => ({
      users: { ...state.users, sortBy, sortOrder: newOrder, page: 1 },
    }));
    get().loadUsers();
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await adminApi.createUser(data);
      await get().loadUsers();
      return { temporaryPassword: response.temporaryPassword };
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la création';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateUser: async (userId, data) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.updateUser(userId, data);
      await get().loadUsers();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la modification';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.deleteUser(userId);
      await get().loadUsers();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la suppression';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  toggleUserStatus: async (userId, isActive) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.toggleUserStatus(userId, isActive);

      // Mise à jour optimiste
      set((state) => ({
        users: {
          ...state.users,
          items: state.users.items.map((u) =>
            u.id === userId ? { ...u, isActive } : u
          ),
        },
        isLoading: false,
      }));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors du changement de statut';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  resetUserPassword: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await adminApi.resetPassword(userId);
      set({ isLoading: false });
      return response.temporaryPassword;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors du reset';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // ===== Actions Rôles =====

  loadRoles: async () => {
    try {
      const roles = await adminApi.getRoles();
      set({ roles });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement des rôles',
      });
    }
  },

  // ===== Actions Audit =====

  loadAuditLogs: async () => {
    const { audit } = get();
    set({ isLoading: true, error: null });

    try {
      const response = await adminApi.getAuditLogs(audit.filters);
      set({
        audit: {
          ...audit,
          logs: response.logs,
          total: response.total,
        },
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement',
        isLoading: false,
      });
    }
  },

  setAuditFilters: (filters) => {
    set((state) => ({
      audit: {
        ...state.audit,
        filters: { ...state.audit.filters, ...filters, offset: 0 },
      },
    }));
    get().loadAuditLogs();
  },

  exportAuditLogs: async () => {
    const { audit } = get();
    return adminApi.exportAuditLogs(audit.filters);
  },

  // ===== Actions Stats =====

  loadStats: async () => {
    set({ isLoading: true, error: null });

    try {
      const stats = await adminApi.getStats();
      set({ stats, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement',
        isLoading: false,
      });
    }
  },

  // ===== Actions Corbeille =====

  loadTrash: async () => {
    set({ isLoading: true, error: null });

    try {
      const trash = await adminApi.getTrash();
      set({ trash, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Erreur lors du chargement',
        isLoading: false,
      });
    }
  },

  deletePermanently: async (noteId) => {
    set({ isLoading: true, error: null });

    try {
      await adminApi.deletePermanently(noteId);
      set((state) => ({
        trash: state.trash.filter((n) => n.id !== noteId),
        isLoading: false,
      }));
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la suppression';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  emptyTrash: async () => {
    set({ isLoading: true, error: null });

    try {
      const { deletedCount } = await adminApi.emptyTrash();
      set({ trash: [], isLoading: false });
      return deletedCount;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors du vidage';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // ===== Utilitaires =====

  clearError: () => set({ error: null }),
}));
