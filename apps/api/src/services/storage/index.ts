// ===========================================
// Storage Module - Exports
// US-028: Module de stockage centralisé
// ===========================================

// Providers
export type {
  IStorageProvider,
  StorageMetadata,
  UploadResult,
} from './providers/storage.provider.js';
export { LocalStorageProvider } from './providers/local.provider.js';

// Processors
export type {
  ImageProcessingOptions,
  ImageProcessingResult,
  ImageMetadata,
} from './processors/image.processor.js';
export { ImageProcessor } from './processors/image.processor.js';

// Validators
export type {
  FileValidationOptions,
  FileValidationResult,
} from './validators/file.validator.js';
export {
  FileValidator,
  FileValidationError,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  MIME_TO_EXTENSION,
} from './validators/file.validator.js';

// Temporary Storage (EP-008: Import)
export { TempStorageService, tempStorageService } from './temp-storage.service.js';
