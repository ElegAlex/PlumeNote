// ===========================================
// Hooks Index
// ===========================================

export { useCollaboration, type CollaboratorInfo } from './useCollaboration';
export { useAutoSave } from './useAutoSave';
export {
  useImageUpload,
  type UploadResult,
  type UploadStatus,
  type UploadError,
  type UseImageUploadOptions,
  type UseImageUploadReturn,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
} from './useImageUpload';
export { useNoteView } from './useNoteView';
export { useSyncEvents } from './useSyncEvents';
export { useSyncStatus } from './useSyncStatus';
export { useNoteRealtimeSync } from './useNoteRealtimeSync';
