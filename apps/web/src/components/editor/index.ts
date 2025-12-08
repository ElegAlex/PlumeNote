// ===========================================
// Editor Components Index (Sprint 5)
// ===========================================

// Éditeurs
export { NoteEditor, NoteEditorLegacy } from './NoteEditor';
export { CollaborativeEditor } from './CollaborativeEditor';
export type { CollaboratorInfo } from '../../hooks/useCollaboration';
export { EditorToolbar } from './EditorToolbar';
export { SaveIndicator } from './SaveIndicator';

// Composants legacy (déprécié, utiliser CollaborationBar)
export { CollaboratorList, CollaboratorCursor } from './CollaboratorList';

// Configuration de l'éditeur (US-022)
export {
  createEditorExtensions,
  createEditorProps,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_EDITOR_OPTIONS,
  DEFAULT_EDITOR_PROPS,
  // Presets
  MINIMAL_PRESET,
  STANDARD_PRESET,
  TECHNICAL_PRESET,
  DOCUMENTATION_PRESET,
  // Types
  type EditorFeatureFlags,
  type EditorConfigOptions,
  type EditorViewProps,
} from './EditorConfig';
