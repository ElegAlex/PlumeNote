// ===========================================
// PlumeNote - Types partagés
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

// ----- Statistiques utilisateur (Admin) -----

export interface UserStats {
  notesCreated: number;
  notesModified: number;
}

export interface UserWithStats extends User {
  stats: UserStats;
}

export interface AdminUsersResponse {
  items: UserWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ----- Administration (Sprint 2) -----

/**
 * Payload pour créer un utilisateur
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  displayName: string;
  password?: string;
  roleId: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

/**
 * Payload pour modifier un utilisateur (admin)
 */
export interface UpdateUserAdminRequest {
  displayName?: string;
  email?: string;
  roleId?: string;
  isActive?: boolean;
}

/**
 * Payload pour réinitialiser un mot de passe
 */
export interface ResetPasswordRequest {
  generateTemporary?: boolean;
  newPassword?: string;
  mustChangePassword?: boolean;
}

/**
 * Réponse de création d'utilisateur
 */
export interface CreateUserResponse {
  user: User;
  temporaryPassword?: string;
}

/**
 * Réponse de réinitialisation de mot de passe
 */
export interface ResetPasswordResponse {
  temporaryPassword?: string;
}

/**
 * Filtres pour les logs d'audit
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Réponse paginée des logs d'audit
 */
export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

/**
 * Statistiques système (admin dashboard)
 */
export interface AdminStats {
  users: {
    total: number;
    activeDay: number;
    activeWeek: number;
    activeMonth: number;
  };
  content: {
    totalNotes: number;
    totalFolders: number;
    notesCreatedWeek: number;
    notesModifiedWeek: number;
  };
  topNotes: Array<{
    id: string;
    title: string;
    versionsCount: number;
    updatedAt: string;
  }>;
  generated: string;
}

/**
 * Configuration système
 */
export interface SystemConfig {
  [key: string]: unknown;
}

/**
 * Note dans la corbeille
 */
export interface TrashedNote {
  id: string;
  title: string;
  folderPath: string;
  authorName: string;
  deletedBy?: string;
  deletedAt?: string;
}

// ----- Préférences utilisateur (Sprint 3) -----

export type Theme = 'light' | 'dark' | 'system';
export type EditorMode = 'wysiwyg' | 'markdown' | 'split';
export type EditorWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type Language = 'fr' | 'en';
export type TimeFormat = '12h' | '24h';
export type StartOfWeek = 'monday' | 'sunday';

/**
 * Préférences d'affichage
 */
export interface DisplayPreferences {
  theme: Theme;
  language: Language;
  dateFormat: string;
  timeFormat: TimeFormat;
  startOfWeek: StartOfWeek;
}

/**
 * Préférences de l'éditeur
 */
export interface EditorPreferences {
  defaultMode: EditorMode;
  width: EditorWidth;
  showLineNumbers: boolean;
  spellCheck: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

/**
 * Préférences de la sidebar
 */
export interface SidebarPreferences {
  collapsed: boolean;
  width: number;
  showFavorites: boolean;
  showRecent: boolean;
}

/**
 * Préférences de notification
 */
export interface NotificationPreferences {
  emailDigest: boolean;
  browserNotifications: boolean;
  mentionNotifications: boolean;
}

/**
 * Préférences d'onboarding/tutoriel
 */
export interface OnboardingPreferences {
  tutorialCompleted: boolean;
  tutorialVersion: number;
}

/**
 * Préférences utilisateur complètes
 */
export interface UserPreferences {
  display: DisplayPreferences;
  editor: EditorPreferences;
  sidebar: SidebarPreferences;
  notifications: NotificationPreferences;
  onboarding: OnboardingPreferences;
}

/**
 * Payload pour mise à jour partielle des préférences
 */
export interface UpdatePreferencesRequest {
  display?: Partial<DisplayPreferences>;
  editor?: Partial<EditorPreferences>;
  sidebar?: Partial<SidebarPreferences>;
  notifications?: Partial<NotificationPreferences>;
  onboarding?: Partial<OnboardingPreferences>;
}

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

export type FolderAccessType = 'OPEN' | 'RESTRICTED';

export interface FolderAccessUser {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
  canRead: boolean;
  canWrite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FolderAccess {
  accessType: FolderAccessType;
  accessList: FolderAccessUser[];
}

export interface UpdateFolderAccessRequest {
  accessType: FolderAccessType;
  accessList?: Array<{
    userId: string;
    canRead: boolean;
    canWrite: boolean;
  }>;
}

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
  accessType: FolderAccessType;
  createdAt: string;
  updatedAt: string;
  // Relations chargées conditionnellement
  children?: Folder[];
  notes?: Note[];
  permissions?: Permission[];
  accessList?: FolderAccessUser[];
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

// ----- P0: Sidebar Lazy Loading Types -----

/**
 * Prévisualisation d'un sous-dossier pour le lazy loading
 */
export interface FolderChildPreview {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  position: number;
  hasChildren: boolean;
  notesCount: number;
}

/**
 * Prévisualisation d'une note pour l'affichage sidebar
 */
export interface NotePreview {
  id: string;
  title: string;
  slug: string;
  position: number;
  updatedAt: string;
  createdAt: string;
}

/**
 * Contenu d'un dossier pour le lazy loading
 * Retourné par GET /folders/:id/content
 * Utilisé par la sidebar et par FolderPage
 */
export interface FolderContent {
  // Format page (avec infos complètes du dossier et breadcrumb)
  folder?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    icon?: string | null;
    parentId?: string | null;
    path?: string;
  };
  breadcrumb?: Array<{ id: string; name: string; slug: string }>;
  // Contenu (toujours présent)
  children: FolderChildPreview[];
  notes: NotePreview[];
}

/**
 * Noeud de l'arbre sidebar avec état d'expansion
 */
export interface SidebarFolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  hasChildren: boolean;
  notesCount: number;
  children: SidebarFolderNode[];
  notes: NotePreview[];
  isLoaded: boolean;
  accessType?: FolderAccessType;
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
  folderPath?: string; // US-042: Chemin du dossier pour affichage
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
  folderId?: string | null; // Optional, null for root folder
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
  targetName: string | null; // Nom/titre de la cible (utile si supprimée)
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: User;
}

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'ROLE_CHANGED'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
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

// ----- Real-time Sync Events -----

/**
 * Types d'événements de synchronisation temps réel
 * Utilisés pour propager les changements de structure (dossiers/notes)
 * entre tous les utilisateurs connectés
 */
export enum SyncEventType {
  // Notes
  NOTE_CREATED = 'note:created',
  NOTE_UPDATED = 'note:updated',
  NOTE_DELETED = 'note:deleted',
  NOTE_MOVED = 'note:moved',

  // Folders
  FOLDER_CREATED = 'folder:created',
  FOLDER_UPDATED = 'folder:updated',
  FOLDER_DELETED = 'folder:deleted',
  FOLDER_MOVED = 'folder:moved',

  // Permissions
  PERMISSION_CHANGED = 'permission:changed',
}

/**
 * Événement de synchronisation générique
 */
export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  payload: T;
  userId: string;
  timestamp: number;
  correlationId: string;
}

/**
 * Payload pour les événements de notes
 */
export interface NoteEventPayload {
  noteId: string;
  folderId: string | null;
  title: string;
  slug: string;
}

/**
 * Payload pour les événements de dossiers
 */
export interface FolderEventPayload {
  folderId: string;
  parentId: string | null;
  name: string;
  slug: string;
}

/**
 * Payload pour les événements de permissions
 */
export interface PermissionEventPayload {
  resourceType: 'note' | 'folder';
  resourceId: string;
}

/**
 * Statut de connexion WebSocket de synchronisation
 */
export interface SyncConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  lastConnectedAt: Date | null;
  error: string | null;
}

/**
 * Message WebSocket de synchronisation (client <-> serveur)
 */
export interface SyncWebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'sync_event' | 'pong' | 'error';
  event?: SyncEvent;
  userId?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Message client vers serveur pour souscription
 */
export interface SyncClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
}

// ----- P2: MÉTADONNÉES -----

/**
 * Types de propriétés supportés pour les métadonnées des notes
 */
export type PropertyType =
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'tags'
  | 'select'
  | 'multiselect'
  | 'link';

/**
 * Définition d'une propriété (schéma)
 */
export interface PropertyDefinition {
  id: string;
  name: string;
  displayName: string;
  type: PropertyType;
  description?: string;
  options: string[];
  isDefault: boolean;
  defaultValue?: string;
  icon?: string;
  color?: string;
  position: number;
  isSystem: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Métadonnées d'une note (valeurs)
 */
export interface NoteMetadata {
  [key: string]: unknown;
}

/**
 * Requête de création d'une définition de propriété
 */
export interface CreatePropertyRequest {
  name: string;
  displayName: string;
  type: PropertyType;
  description?: string;
  options?: string[];
  isDefault?: boolean;
  defaultValue?: string;
  icon?: string;
  color?: string;
}

/**
 * Requête de mise à jour d'une définition de propriété
 */
export interface UpdatePropertyRequest {
  name?: string;
  displayName?: string;
  type?: PropertyType;
  description?: string | null;
  options?: string[];
  isDefault?: boolean;
  defaultValue?: string | null;
  icon?: string | null;
  color?: string | null;
  position?: number;
}

/**
 * Requête de mise à jour des métadonnées d'une note
 */
export interface UpdateNoteMetadataRequest {
  metadata: NoteMetadata;
}

/**
 * Résultat de validation des métadonnées
 */
export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedMetadata: NoteMetadata;
}

/**
 * Filtre sur les métadonnées pour la recherche
 */
export interface MetadataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'hasAny' | 'isEmpty' | 'isNotEmpty';
  value?: unknown;
}

/**
 * Configuration du calendrier (champs de dates utilisés)
 */
export interface CalendarConfig {
  id: string;
  eventDateField: string;
  dueDateField: string;
  startDateField: string;
  endDateField: string;
}

// CalendarEvent défini dans la section P3 Calendrier ci-dessous

/**
 * Plage de dates pour les requêtes calendrier
 */
export interface DateRange {
  start: string;
  end: string;
}

// ----- P3: RACCOURCIS CLAVIER -----

/**
 * Touches modificatrices
 */
export type ModifierKey = 'cmd' | 'ctrl' | 'alt' | 'shift';

/**
 * Touches spéciales
 */
export type SpecialKey =
  | 'enter'
  | 'backspace'
  | 'delete'
  | 'escape'
  | 'tab'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'space';

/**
 * Combinaison de touches
 */
export interface ShortcutKeys {
  modifiers: ModifierKey[];
  key: string | SpecialKey;
}

/**
 * Catégories de raccourcis
 */
export type ShortcutCategory =
  | 'navigation'
  | 'editor-actions'
  | 'editor-formatting'
  | 'editor-headings'
  | 'editor-lists'
  | 'editor-blocks'
  | 'selection'
  | 'panels';

/**
 * Contexte d'application du raccourci
 */
export type ShortcutContext = 'global' | 'editor' | 'sidebar' | 'modal';

/**
 * Définition d'un raccourci clavier
 */
export interface ShortcutDefinition {
  id: string;
  action: string;
  description: string;
  keys: ShortcutKeys;
  category: ShortcutCategory;
  context: ShortcutContext;
  enabled?: boolean;
}

/**
 * Informations sur une catégorie de raccourcis
 */
export interface ShortcutCategoryInfo {
  id: ShortcutCategory;
  label: string;
  icon: string;
}

/**
 * Liste des catégories avec métadonnées
 */
export const SHORTCUT_CATEGORIES: ShortcutCategoryInfo[] = [
  { id: 'navigation', label: 'Navigation', icon: 'Compass' },
  { id: 'editor-actions', label: 'Éditeur - Actions', icon: 'MousePointer' },
  { id: 'editor-formatting', label: 'Éditeur - Formatage', icon: 'Type' },
  { id: 'editor-headings', label: 'Éditeur - Titres', icon: 'Heading' },
  { id: 'editor-lists', label: 'Éditeur - Listes', icon: 'List' },
  { id: 'editor-blocks', label: 'Éditeur - Blocs', icon: 'Square' },
  { id: 'selection', label: 'Sélection et déplacement', icon: 'Move' },
  { id: 'panels', label: 'Panneaux', icon: 'PanelLeft' },
];

// ----- P3: DASHBOARD ANALYTICS -----

/**
 * Statistiques globales du workspace
 */
export interface OverviewStats {
  totalNotes: number;
  totalFolders: number;
  activeUsers: number;
  notesCreatedThisWeek: number;
  notesModifiedThisWeek: number;
  totalViews: number;
}

/**
 * Point de données pour les graphiques d'activité
 */
export interface ActivityDataPoint {
  date: string;
  count: number;
}

/**
 * Timeline d'activité (créations et modifications)
 */
export interface ActivityTimeline {
  creations: ActivityDataPoint[];
  modifications: ActivityDataPoint[];
}

/**
 * Item de distribution (pour graphiques donut/bar)
 */
export interface DistributionItem {
  label: string;
  count: number;
}

/**
 * Note populaire (top notes par vues)
 */
export interface TopNote {
  id: string;
  title: string;
  viewCount: number;
  updatedAt: string;
  folderPath: string;
}

/**
 * Contribution d'un utilisateur
 */
export interface UserContribution {
  userId: string;
  userName: string;
  userEmail: string;
  notesCreated: number;
  notesModified: number;
  lastActivity: string;
}

/**
 * Champs de distribution supportés
 */
export type DistributionField = 'status' | 'priority' | 'tags';

// ----- P3: CALENDRIER COMPLET -----

/**
 * Type d'événement calendrier
 */
export type CalendarEventType = 'deadline' | 'event' | 'task' | 'period-start' | 'period-end';

/**
 * Mode de vue du calendrier
 */
export type CalendarViewMode = 'month' | 'week' | 'agenda';

/**
 * Événement calendrier (extrait des métadonnées)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endDate?: string;
  noteId: string;
  noteTitle: string;
  noteSlug?: string;
  type: CalendarEventType;
  status?: string;
  priority?: string;
  color?: string;
  tags?: string[];
  folderId?: string;
  folderName?: string;
}

/**
 * Détail complet d'un événement
 */
export interface CalendarEventDetail extends CalendarEvent {
  description?: string;
  folder: {
    id: string;
    name: string;
    path: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Options de requête pour les événements
 */
export interface GetEventsOptions {
  start: string;
  end: string;
  types?: string[];
  statuses?: string[];
  tags?: string[];
  folderId?: string;
}

/**
 * Données pour création rapide d'événement
 */
export interface CreateQuickEventData {
  title: string;
  date: string;
  type: CalendarEventType;
  folderId?: string;
}

/**
 * Filtres du calendrier
 */
export interface CalendarFilters {
  types: CalendarEventType[];
  statuses: string[];
  tags: string[];
  folderId: string | null;
  search: string;
}

/**
 * Jour dans le calendrier
 */
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

/**
 * Semaine dans le calendrier
 */
export interface CalendarWeek {
  days: CalendarDay[];
}

/**
 * Mois complet du calendrier
 */
export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarWeek[];
}

// ----- ÉVÉNEMENTS AUTONOMES -----

/**
 * Type d'événement autonome (entité séparée des notes)
 */
export type AutonomousEventType = 'deadline' | 'event' | 'period';

/**
 * Note liée à un événement autonome
 */
export interface LinkedNote {
  id: string;
  noteId: string;
  linkedAt: string;
  note: {
    id: string;
    title: string;
    slug: string;
    updatedAt: string;
  };
}

/**
 * Événement autonome (entité first-class découplée des notes)
 */
export interface AutonomousEvent {
  id: string;
  title: string;
  description?: string | null;
  type: AutonomousEventType;
  startDate: string; // ISO datetime
  endDate?: string | null; // ISO datetime
  color?: string | null;
  allDay: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  linkedNotes?: LinkedNote[];
}

/**
 * Payload pour créer un événement autonome
 */
export interface CreateAutonomousEventPayload {
  title: string;
  description?: string;
  type: 'DEADLINE' | 'EVENT' | 'PERIOD';
  startDate: string;
  endDate?: string;
  color?: string;
  allDay?: boolean;
}

/**
 * Payload pour modifier un événement autonome
 */
export interface UpdateAutonomousEventPayload {
  title?: string;
  description?: string | null;
  type?: 'DEADLINE' | 'EVENT' | 'PERIOD';
  startDate?: string;
  endDate?: string | null;
  color?: string | null;
  allDay?: boolean;
}

/**
 * Payload pour lier une note à un événement
 */
export interface LinkNotePayload {
  noteId: string;
}

// ----- NOTES PERSONNELLES -----

/**
 * Dossier personnel (isolé par utilisateur)
 */
export interface PersonalFolder {
  id: string;
  name: string;
  slug: string;
  path: string;
  color: string | null;
  icon: string | null;
  position: number;
  hasChildren: boolean;
  notesCount: number;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Détail d'un dossier personnel avec son contenu
 */
export interface PersonalFolderDetail {
  folder: PersonalFolder;
  children: PersonalFolderPreview[];
  notes: PersonalNotePreview[];
}

/**
 * Prévisualisation d'un sous-dossier personnel
 */
export interface PersonalFolderPreview {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  position: number;
  hasChildren: boolean;
  notesCount: number;
}

/**
 * Note personnelle
 */
export interface PersonalNote {
  id: string;
  title: string;
  slug: string;
  content: string;
  frontmatter: NoteFrontmatter;
  folderId: string | null;
  folder: {
    id: string;
    name: string;
    slug: string;
    path: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Prévisualisation d'une note personnelle
 */
export interface PersonalNotePreview {
  id: string;
  title: string;
  slug: string;
  folderId?: string | null;
  folderName?: string | null;
  folderPath?: string | null;
  updatedAt: string;
  createdAt: string;
}

/**
 * Résultat de recherche dans l'espace personnel
 */
export interface PersonalSearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  folderPath: string | null;
  updatedAt: string;
}

/**
 * Requête de création d'un dossier personnel
 */
export interface CreatePersonalFolderRequest {
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

/**
 * Requête de mise à jour d'un dossier personnel
 */
export interface UpdatePersonalFolderRequest {
  name?: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
}

/**
 * Requête de création d'une note personnelle
 */
export interface CreatePersonalNoteRequest {
  title: string;
  content?: string;
  folderId?: string;
}

/**
 * Requête de mise à jour d'une note personnelle
 */
export interface UpdatePersonalNoteRequest {
  title?: string;
  content?: string;
  folderId?: string | null;
}

/**
 * Arborescence de l'espace personnel
 */
export interface PersonalTreeNode {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  hasChildren: boolean;
  children: PersonalTreeNode[];
  notes: PersonalNotePreview[];
}

/**
 * Réponse de l'arborescence personnelle
 */
export interface PersonalTreeResponse {
  tree: PersonalTreeNode[];
  rootNotes: PersonalNotePreview[];
}

// ----- IMPORT MARKDOWN (EP-008) -----

/**
 * Statut d'un job d'import
 */
export type ImportStatus =
  | 'PENDING'
  | 'EXTRACTING'
  | 'PARSING'
  | 'CREATING'
  | 'RESOLVING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Stratégie de gestion des conflits
 */
export type ConflictStrategy = 'RENAME' | 'SKIP' | 'OVERWRITE';

/**
 * Résultat d'import pour un fichier
 */
export interface ImportFileResult {
  file: string;
  status: 'success' | 'error' | 'skipped' | 'renamed';
  noteId?: string;
  noteTitle?: string;
  error?: string;
  renamedTo?: string;
}

/**
 * Analyse d'un fichier ZIP
 */
export interface ZipAnalysis {
  markdownFiles: string[];
  directories: string[];
  assetFiles: string[];
  totalFiles: number;
}

/**
 * Prévisualisation d'un import
 */
export interface ImportPreview {
  id: string;
  fileName: string;
  totalFiles: number;
  markdownFiles: string[];
  directories: string[];
  assetFiles: string[];
}

/**
 * Résumé d'un job d'import
 */
export interface ImportJobSummary {
  id: string;
  fileName: string;
  status: ImportStatus;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Détail complet d'un job d'import
 */
export interface ImportJobDetail extends ImportJobSummary {
  results: ImportFileResult[] | null;
  errors: string[] | null;
  targetFolderId: string | null;
  preview: ZipAnalysis | null;
}

/**
 * Options pour démarrer un import
 */
export interface StartImportOptions {
  targetFolderId?: string;
  conflictStrategy: ConflictStrategy;
}
