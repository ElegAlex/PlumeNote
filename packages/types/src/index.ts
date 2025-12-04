// ===========================================
// CollabNotes - Types partagés
// ===========================================

// ----- Utilisateurs et Auth -----

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  sidebarCollapsed?: boolean;
  editorMode?: 'wysiwyg' | 'source' | 'split';
  fontSize?: number;
  expandedFolders?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermissions;
}

export interface RolePermissions {
  canManageUsers?: boolean;
  canManageRoles?: boolean;
  canManageSystem?: boolean;
  canCreateNotes?: boolean;
  canDeleteNotes?: boolean;
  canManagePermissions?: boolean;
}

export type RoleName = 'admin' | 'editor' | 'reader';

// ----- Auth -----

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  expiresAt: string;
}

export interface AuthError {
  error: 'INVALID_CREDENTIALS' | 'ACCOUNT_DISABLED' | 'ACCOUNT_LOCKED';
  message: string;
  retryAfter?: number;
}

// ----- Dossiers -----

export interface Folder {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Relations chargées conditionnellement
  children?: Folder[];
  notes?: Note[];
  permissions?: Permission[];
}

export interface FolderTreeNode extends Omit<Folder, 'children' | 'notes'> {
  children: FolderTreeNode[];
  notes: NoteSummary[];
  level: number;
  hasAccess: boolean;
  accessLevel: PermissionLevel | null;
}

export interface CreateFolderRequest {
  name: string;
  parentId: string | null;
  color?: string;
  icon?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  color?: string;
  icon?: string;
  position?: number;
}

// ----- Notes -----

export interface Note {
  id: string;
  title: string;
  slug: string;
  folderId: string;
  content: string;
  frontmatter: NoteFrontmatter;
  authorId: string;
  modifiedBy: string | null;
  position: number;
  isPinnedGlobal: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  author?: User;
  modifier?: User;
  folder?: Folder;
  tags?: Tag[];
  backlinks?: Backlink[];
}

export interface NoteSummary {
  id: string;
  title: string;
  slug: string;
  folderId: string;
  authorId: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface NoteFrontmatter {
  title?: string;
  created?: string;
  modified?: string;
  author?: string;
  modifiedBy?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface CreateNoteRequest {
  title: string;
  folderId: string;
  content?: string;
  frontmatter?: Partial<NoteFrontmatter>;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  frontmatter?: Partial<NoteFrontmatter>;
  position?: number;
}

// ----- Versions -----

export interface NoteVersion {
  id: string;
  noteId: string;
  versionNumber: number;
  content: string;
  frontmatter: NoteFrontmatter;
  authorId: string;
  changeSummary: string | null;
  createdAt: string;
  author?: User;
}

// ----- Tags -----

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  noteCount?: number;
}

// ----- Liens et Rétroliens -----

export interface Link {
  id: string;
  sourceNoteId: string;
  targetNoteId: string | null;
  targetSlug: string;
  alias: string | null;
  position: number;
  context: string | null;
  isBroken: boolean;
}

export interface Backlink {
  noteId: string;
  noteTitle: string;
  folderPath: string;
  context: string;
  updatedAt: string;
}

// ----- Permissions -----

export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';
export type ResourceType = 'FOLDER' | 'NOTE';
export type PrincipalType = 'USER' | 'ROLE';

export interface Permission {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  principalType: PrincipalType;
  principalId: string;
  level: PermissionLevel;
  inherited: boolean;
  grantedBy: string;
  grantedAt: string;
}

export interface SetPermissionRequest {
  principalType: PrincipalType;
  principalId: string;
  level: PermissionLevel;
}

export interface EffectivePermission {
  resourceType: ResourceType;
  resourceId: string;
  level: PermissionLevel;
  source: 'direct' | 'inherited' | 'role';
  sourceId?: string;
}

// ----- Recherche -----

export interface SearchRequest {
  query: string;
  folderId?: string;
  authorId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  noteId: string;
  title: string;
  slug: string;
  folderPath: string;
  snippet: string;
  rank: number;
  authorName: string;
  updatedAt: string;
  tags: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// ----- Collaboration temps réel -----

export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}

export interface CursorPosition {
  index: number;
  length: number;
}

export interface SelectionRange {
  start: number;
  end: number;
}

export interface PresenceInfo {
  noteId: string;
  users: AwarenessUser[];
}

// ----- Commentaires -----

export interface Comment {
  id: string;
  noteId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  anchorStart: number | null;
  anchorEnd: number | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  author?: User;
  replies?: Comment[];
}

export interface CreateCommentRequest {
  noteId: string;
  content: string;
  parentId?: string;
  anchorStart?: number;
  anchorEnd?: number;
}

// ----- Homepage et Widgets -----

export interface HomepageConfig {
  widgets: Widget[];
  pinnedNotes: string[];
  importantMessage: string | null;
  messageExpiresAt: string | null;
}

export interface Widget {
  id: string;
  type: WidgetType;
  position: number;
  config: Record<string, unknown>;
  enabled: boolean;
}

export type WidgetType = 'recent_notes' | 'calendar' | 'pinned_docs' | 'important_message' | 'tags_cloud';

// ----- Audit -----

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: User;
}

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'ROLE_CHANGED'
  | 'NOTE_CREATED'
  | 'NOTE_UPDATED'
  | 'NOTE_DELETED'
  | 'NOTE_RESTORED'
  | 'FOLDER_CREATED'
  | 'FOLDER_UPDATED'
  | 'FOLDER_DELETED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'BACKUP_CREATED'
  | 'BACKUP_RESTORED';

// ----- API Responses -----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ----- WebSocket Messages -----

export type WSMessageType =
  | 'sync'
  | 'awareness'
  | 'cursor'
  | 'presence_join'
  | 'presence_leave'
  | 'note_updated'
  | 'permission_changed';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: number;
}
