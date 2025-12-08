// ===========================================
// API Client Templates (Sprint 8)
// ===========================================

import { api } from '../lib/api';

export interface NoteTemplate {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  icon?: string | null;
  category: string;
  isBuiltIn: boolean;
  isPublic: boolean;
  isOwner?: boolean;
  createdBy?: string | null;
  properties?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplatesResponse {
  templates: NoteTemplate[];
  grouped: Record<string, NoteTemplate[]>;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  content: string;
  icon?: string;
  category?: string;
  isPublic?: boolean;
  properties?: Record<string, unknown>;
}

/**
 * Récupérer tous les templates accessibles
 */
export async function getTemplates(): Promise<TemplatesResponse> {
  const response = await api.get<TemplatesResponse>('/templates');
  return response.data;
}

/**
 * Récupérer un template par ID
 */
export async function getTemplate(id: string): Promise<NoteTemplate> {
  const response = await api.get<NoteTemplate>(`/templates/${id}`);
  return response.data;
}

/**
 * Créer un nouveau template
 */
export async function createTemplate(input: CreateTemplateInput): Promise<NoteTemplate> {
  const response = await api.post<NoteTemplate>('/templates', input);
  return response.data;
}

/**
 * Modifier un template
 */
export async function updateTemplate(
  id: string,
  input: Partial<CreateTemplateInput>
): Promise<NoteTemplate> {
  const response = await api.patch<NoteTemplate>(`/templates/${id}`, input);
  return response.data;
}

/**
 * Supprimer un template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

/**
 * Templates par défaut intégrés
 */
export const BUILT_IN_TEMPLATES: Omit<NoteTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Note vide',
    description: 'Une note vierge',
    content: '',
    icon: 'FileText',
    category: 'general',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Réunion',
    description: 'Notes de réunion avec participants et actions',
    content: `# Réunion - {{date}}

## Participants
-

## Ordre du jour
1.

## Notes


## Actions
- [ ]

## Prochaine réunion
`,
    icon: 'Users',
    category: 'work',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Journal quotidien',
    description: 'Template pour journal personnel',
    content: `# {{date}}

## Gratitude
-

## Objectifs du jour
- [ ]

## Notes


## Réflexion
`,
    icon: 'BookOpen',
    category: 'personal',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Projet',
    description: 'Fiche projet avec objectifs et étapes',
    content: `# Projet :

## Objectif


## Contexte


## Étapes
- [ ]
- [ ]
- [ ]

## Ressources
-

## Notes


## Statut
- **Début :**
- **Deadline :**
- **Avancement :** 0%
`,
    icon: 'Briefcase',
    category: 'work',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Documentation',
    description: 'Template pour documentation technique',
    content: `# Titre

## Description


## Installation

\`\`\`bash

\`\`\`

## Utilisation

\`\`\`

\`\`\`

## Configuration

| Option | Description | Défaut |
|--------|-------------|--------|
|        |             |        |

## Exemples


## Voir aussi
-
`,
    icon: 'FileCode',
    category: 'technical',
    isBuiltIn: true,
    isPublic: true,
  },
];
