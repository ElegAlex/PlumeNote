// ===========================================
// Hook useImageUpload
// US-023: Upload d'images vers l'API
// ===========================================

import { useState, useCallback, useRef } from 'react';

const API_BASE = '/api/v1';

/**
 * Types MIME d'images acceptés
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/**
 * Taille maximum en bytes (10 Mo)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Résultat d'un upload réussi
 */
export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * État de l'upload
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Erreur d'upload
 */
export interface UploadError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Options du hook
 */
export interface UseImageUploadOptions {
  noteId: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: UploadError) => void;
  onProgress?: (progress: number) => void;
}

/**
 * Retour du hook
 */
export interface UseImageUploadReturn {
  upload: (file: File) => Promise<UploadResult | null>;
  uploadMultiple: (files: File[]) => Promise<UploadResult[]>;
  status: UploadStatus;
  progress: number;
  error: UploadError | null;
  isUploading: boolean;
  reset: () => void;
}

/**
 * Valide un fichier image avant upload
 */
function validateImage(file: File): UploadError | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_TYPE',
      message: `Type de fichier non accepté: ${file.type}`,
      details: { accepted: ACCEPTED_IMAGE_TYPES },
    };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      code: 'FILE_TOO_LARGE',
      message: `Fichier trop volumineux: ${sizeMb} Mo (max: 10 Mo)`,
      details: { size: file.size, max: MAX_IMAGE_SIZE },
    };
  }

  return null;
}

/**
 * Hook pour gérer l'upload d'images vers une note
 */
export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const { noteId, onSuccess, onError, onProgress } = options;

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Upload un fichier unique
   */
  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    // Validation côté client
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      onError?.(validationError);
      return null;
    }

    // Préparer l'upload
    setStatus('uploading');
    setProgress(0);
    setError(null);

    // Créer le FormData
    const formData = new FormData();
    formData.append('file', file);

    // Créer AbortController pour annulation potentielle
    abortControllerRef.current = new AbortController();

    try {
      // Utiliser XMLHttpRequest pour le suivi de progression
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            onProgress?.(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              reject({
                code: response.error?.code || 'UPLOAD_FAILED',
                message: response.error?.message || 'Upload failed',
              });
            }
          } else {
            const errorResponse = JSON.parse(xhr.responseText || '{}');
            reject({
              code: errorResponse.error?.code || 'HTTP_ERROR',
              message: errorResponse.error?.message || `HTTP Error ${xhr.status}`,
            });
          }
        });

        xhr.addEventListener('error', () => {
          reject({
            code: 'NETWORK_ERROR',
            message: 'Erreur réseau lors de l\'upload',
          });
        });

        xhr.addEventListener('abort', () => {
          reject({
            code: 'ABORTED',
            message: 'Upload annulé',
          });
        });

        xhr.open('POST', `${API_BASE}/attachments/upload?noteId=${noteId}`);
        xhr.withCredentials = true;
        xhr.send(formData);

        // Lier l'annulation
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      });

      setStatus('success');
      setProgress(100);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const uploadError = err as UploadError;
      setError(uploadError);
      setStatus('error');
      onError?.(uploadError);
      return null;
    }
  }, [noteId, onSuccess, onError, onProgress]);

  /**
   * Upload plusieurs fichiers séquentiellement
   */
  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await upload(file);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }, [upload]);

  /**
   * Réinitialise l'état
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return {
    upload,
    uploadMultiple,
    status,
    progress,
    error,
    isUploading: status === 'uploading',
    reset,
  };
}
