// ===========================================
// API Client Administration (Sprint 2)
// ===========================================

import { api } from '../lib/api';
import type {
  AdminUsersResponse,
  UserWithStats,
  Role,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserAdminRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  AuditLog,
  AuditLogFilters,
  AuditLogsResponse,
  AdminStats,
  SystemConfig,
  TrashedNote,
} from '@plumenote/types';

// ===== Types de requêtes =====

interface UsersQueryParams {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'displayName' | 'lastLoginAt' | 'createdAt' | 'notesCreated' | 'notesModified';
  sortOrder?: 'asc' | 'desc';
}

// ===== Service API Admin =====

export const adminApi = {
  // ===== Gestion des utilisateurs =====

  /**
   * Liste les utilisateurs avec filtres et pagination
   */
  async getUsers(params: UsersQueryParams = {}): Promise<AdminUsersResponse> {
    const searchParams = new URLSearchParams();

    if (params.search) searchParams.set('search', params.search);
    if (params.roleId) searchParams.set('roleId', params.roleId);
    if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    const response = await api.get<AdminUsersResponse>(`/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  /**
   * Récupère un utilisateur par ID
   */
  async getUser(userId: string): Promise<UserWithStats> {
    const response = await api.get<UserWithStats>(`/users/${userId}`);
    return response.data;
  },

  /**
   * Crée un nouvel utilisateur
   */
  async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await api.post<CreateUserResponse>('/users', data);
    return response.data;
  },

  /**
   * Met à jour un utilisateur
   */
  async updateUser(userId: string, data: UpdateUserAdminRequest): Promise<UserWithStats> {
    const response = await api.patch<UserWithStats>(`/users/${userId}`, data);
    return response.data;
  },

  /**
   * Supprime un utilisateur
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },

  /**
   * Active/désactive un utilisateur
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<UserWithStats> {
    return this.updateUser(userId, { isActive });
  },

  /**
   * Change le rôle d'un utilisateur
   */
  async changeUserRole(userId: string, roleId: string): Promise<UserWithStats> {
    return this.updateUser(userId, { roleId });
  },

  /**
   * Réinitialise le mot de passe d'un utilisateur
   */
  async resetPassword(userId: string, data: ResetPasswordRequest = {}): Promise<ResetPasswordResponse> {
    const response = await api.post<ResetPasswordResponse>(
      `/users/${userId}/reset-password`,
      { generateTemporary: true, mustChangePassword: true, ...data }
    );
    return response.data;
  },

  // ===== Gestion des rôles =====

  /**
   * Liste tous les rôles
   */
  async getRoles(): Promise<Role[]> {
    const response = await api.get<{ roles: Role[] }>('/users/roles');
    return response.data.roles;
  },

  // ===== Journal d'audit =====

  /**
   * Récupère les logs d'audit avec filtres
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const searchParams = new URLSearchParams();

    if (filters.userId) searchParams.set('userId', filters.userId);
    if (filters.action) searchParams.set('action', filters.action);
    if (filters.resourceType) searchParams.set('resourceType', filters.resourceType);
    if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) searchParams.set('dateTo', filters.dateTo);
    if (filters.limit) searchParams.set('limit', String(filters.limit));
    if (filters.offset) searchParams.set('offset', String(filters.offset));

    const query = searchParams.toString();
    const response = await api.get<AuditLogsResponse>(`/admin/audit${query ? `?${query}` : ''}`);
    return response.data;
  },

  /**
   * Exporte les logs d'audit en CSV
   */
  async exportAuditLogs(filters: Omit<AuditLogFilters, 'limit' | 'offset'> = {}): Promise<Blob> {
    const searchParams = new URLSearchParams();

    if (filters.userId) searchParams.set('userId', filters.userId);
    if (filters.action) searchParams.set('action', filters.action);
    if (filters.resourceType) searchParams.set('resourceType', filters.resourceType);
    if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) searchParams.set('dateTo', filters.dateTo);

    const query = searchParams.toString();
    const url = `/api/v1/admin/audit/export${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'export');
    }

    return response.blob();
  },

  // ===== Statistiques système =====

  /**
   * Récupère les statistiques d'administration
   */
  async getStats(): Promise<AdminStats> {
    const response = await api.get<AdminStats>('/admin/stats');
    return response.data;
  },

  // ===== Configuration système =====

  /**
   * Récupère la configuration système
   */
  async getConfig(): Promise<SystemConfig> {
    const response = await api.get<{ config: SystemConfig }>('/admin/config');
    return response.data.config;
  },

  /**
   * Met à jour une valeur de configuration
   */
  async updateConfig(key: string, value: unknown): Promise<void> {
    await api.put('/admin/config', { key, value });
  },

  // ===== Corbeille =====

  /**
   * Liste les notes supprimées
   */
  async getTrash(): Promise<TrashedNote[]> {
    const response = await api.get<{ notes: TrashedNote[] }>('/admin/trash');
    return response.data.notes;
  },

  /**
   * Supprime définitivement une note
   */
  async deletePermanently(noteId: string): Promise<void> {
    await api.delete(`/admin/trash/${noteId}`);
  },

  /**
   * Vide la corbeille
   */
  async emptyTrash(): Promise<{ deletedCount: number }> {
    const response = await api.delete<{ success: boolean; deletedCount: number }>('/admin/trash');
    return { deletedCount: response.data.deletedCount };
  },
};
