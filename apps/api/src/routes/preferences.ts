// ===========================================
// Routes Préférences Utilisateur
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  updatePreferenceSection,
} from '../services/preferences.js';
import { updatePreferencesSchema } from '../schemas/preferences.schema.js';

export const preferencesRoutes: FastifyPluginAsync = async (app) => {
  // Toutes les routes nécessitent authentification
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/preferences - Récupérer les préférences
  app.get('/', {
    schema: {
      tags: ['Preferences'],
      summary: 'Get current user preferences',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const preferences = await getUserPreferences(request.user.userId);
    return preferences;
  });

  // PUT /api/v1/preferences - Mettre à jour toutes les préférences
  app.put('/', {
    schema: {
      tags: ['Preferences'],
      summary: 'Update all user preferences',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const body = updatePreferencesSchema.parse(request.body);
      const preferences = await updateUserPreferences(request.user.userId, body);
      return preferences;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid preferences data',
          details: error,
        });
      }
      throw error;
    }
  });

  // PATCH /api/v1/preferences/:section - Mettre à jour une section
  app.patch<{
    Params: { section: string };
  }>('/:section', {
    schema: {
      tags: ['Preferences'],
      summary: 'Update a specific preference section',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { section } = request.params;
    const validSections = ['display', 'editor', 'sidebar', 'notifications'];

    if (!validSections.includes(section)) {
      return reply.status(400).send({
        error: 'INVALID_SECTION',
        message: `Invalid section. Must be one of: ${validSections.join(', ')}`,
      });
    }

    try {
      const body = request.body as Record<string, unknown>;
      const preferences = await updatePreferenceSection(
        request.user.userId,
        section as 'display' | 'editor' | 'sidebar' | 'notifications',
        body
      );
      return preferences;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid preferences data',
          details: error,
        });
      }
      throw error;
    }
  });

  // DELETE /api/v1/preferences - Réinitialiser aux valeurs par défaut
  app.delete('/', {
    schema: {
      tags: ['Preferences'],
      summary: 'Reset preferences to defaults',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const preferences = await resetUserPreferences(request.user.userId);
    return preferences;
  });

  // GET /api/v1/preferences/theme - Raccourci pour le thème uniquement
  app.get('/theme', {
    schema: {
      tags: ['Preferences'],
      summary: 'Get current theme preference',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const preferences = await getUserPreferences(request.user.userId);
    return { theme: preferences.display.theme };
  });

  // PUT /api/v1/preferences/theme - Modifier le thème rapidement
  app.put<{
    Body: { theme: 'light' | 'dark' | 'system' };
  }>('/theme', {
    schema: {
      tags: ['Preferences'],
      summary: 'Update theme preference',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { theme } = request.body;

    if (!['light', 'dark', 'system'].includes(theme)) {
      return reply.status(400).send({
        error: 'INVALID_THEME',
        message: 'Theme must be light, dark, or system',
      });
    }

    const preferences = await updatePreferenceSection(
      request.user.userId,
      'display',
      { theme }
    );
    return { theme: preferences.display.theme };
  });
};
