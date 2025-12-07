# MODULE P2 : Système de Métadonnées

## 1. Résumé

|Attribut|Valeur|
|---|---|
|Type|Feature|
|Priorité|**P2-Moyenne** (mais prérequis pour Calendrier et Dashboard)|
|Complexité|XL|
|Modules impactés|Database, Backend (notes, metadata), Frontend (editor, sidebar), CRDT|
|Estimation|8 jours-homme|

### Description

Implémentation d'un système de métadonnées inspiré d'Obsidian, permettant d'associer des propriétés structurées aux notes. Ce système est le fondement pour :

- Le calendrier (dates d'événements, deadlines)
- Le futur dashboard (statistiques par type de note, tags)
- Les requêtes type Dataview (filtrage, agrégation)

Le système propose deux modes d'interaction :

1. **Frontmatter YAML** : Édition directe dans le contenu Markdown (pour utilisateurs avancés)
2. **Panneau Properties** : Interface graphique pour éditer les métadonnées (pour tous)

### Critères d'acceptation

**Fonctionnalités de base :**

- [ ] Une note peut avoir des métadonnées sous forme de paires clé-valeur
- [ ] Les métadonnées sont stockées en YAML frontmatter ET en base de données (dual storage)
- [ ] Le frontmatter est synchronisé avec la BDD à chaque sauvegarde
- [ ] Les métadonnées sont synchronisées en temps réel via CRDT

**Types de propriétés supportés :**

- [ ] `text` : Chaîne de caractères libre
- [ ] `number` : Valeur numérique
- [ ] `date` : Date (YYYY-MM-DD)
- [ ] `datetime` : Date et heure (YYYY-MM-DDTHH:mm)
- [ ] `checkbox` : Booléen (true/false)
- [ ] `tags` : Liste de tags
- [ ] `select` : Valeur parmi une liste prédéfinie
- [ ] `multiselect` : Plusieurs valeurs parmi une liste
- [ ] `link` : Lien vers une autre note (wikilink)

**Interface utilisateur :**

- [ ] Panneau "Properties" dans la sidebar de l'éditeur
- [ ] Ajout/suppression de propriétés via UI
- [ ] Édition inline des valeurs avec composants adaptés au type
- [ ] Auto-complétion des noms de propriétés existants
- [ ] Auto-complétion des valeurs pour `select`/`tags`

**Intégration Calendrier :**

- [ ] Les propriétés de type `date`/`datetime` alimentent le calendrier
- [ ] Configuration du champ utilisé comme "date d'événement"
- [ ] Support des propriétés `due_date`, `event_date`, `start_date`, `end_date`

**Recherche et filtrage :**

- [ ] Recherche sur les valeurs de métadonnées
- [ ] Filtrage des notes par propriété dans l'API
- [ ] Index GIN sur les métadonnées JSONB

---

## 2. Analyse technique

### 2.1 Contexte et inspiration

#### Modèle Obsidian (référence)

```yaml
---
title: Réunion d'équipe
date: 2024-12-15
due_date: 2024-12-20
status: in-progress
tags:
  - meeting
  - projet-alpha
priority: high
assignee: "[[John Doe]]"
---

# Contenu de la note...
```

#### Approche PlumeNote

Nous adoptons une approche **hybride** :

1. **Stockage dual** :
    
    - Frontmatter YAML dans le contenu Markdown (compatibilité, export)
    - Colonnes JSONB en BDD (performance requêtes, indexation)
2. **Schéma flexible** :
    
    - Pas de schéma rigide imposé
    - Propriétés définies au niveau workspace (suggestions)
    - Validation optionnelle par type
3. **Synchronisation bidirectionnelle** :
    
    - Édition YAML → mise à jour BDD
    - Édition panneau UI → mise à jour YAML + BDD

### 2.2 Architecture de la solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NOTE EDITOR                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐│
│  │                                 │    │     PROPERTIES PANEL            ││
│  │      MARKDOWN EDITOR            │    │                                 ││
│  │                                 │    │  ┌───────────────────────────┐  ││
│  │  ---                            │    │  │ + Add property            │  ││
│  │  title: Ma note                 │◄──►│  ├───────────────────────────┤  ││
│  │  date: 2024-12-15               │    │  │ title     [Ma note      ] │  ││
│  │  tags:                          │    │  │ date      [📅 15/12/2024] │  ││
│  │    - meeting                    │    │  │ tags      [meeting] [x]   │  ││
│  │  ---                            │    │  │ status    [▼ In Progress] │  ││
│  │                                 │    │  └───────────────────────────┘  ││
│  │  # Contenu...                   │    │                                 ││
│  │                                 │    │                                 ││
│  └─────────────────────────────────┘    └─────────────────────────────────┘│
│           │                                          │                      │
│           ▼                                          ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        METADATA SYNC SERVICE                            ││
│  │   • Parse YAML frontmatter                                              ││
│  │   • Validate types                                                      ││
│  │   • Sync to Y.Doc (CRDT)                                                ││
│  │   • Sync to API                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐ │
│  │   Note Table        │    │ PropertyDefinition  │    │   Calendar      │ │
│  │                     │    │                     │    │   Service       │ │
│  │ • metadata (JSONB)  │◄──►│ • name              │    │                 │ │
│  │ • metadata_schema   │    │ • type              │───►│ • getUpcoming() │ │
│  │                     │    │ • options           │    │ • byDateRange() │ │
│  └─────────────────────┘    │ • workspaceId       │    └─────────────────┘ │
│           │                 └─────────────────────┘                         │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  PostgreSQL avec index GIN sur metadata JSONB                           ││
│  │  WHERE metadata->>'status' = 'done'                                     ││
│  │  WHERE metadata->>'due_date' < NOW()                                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Flux de synchronisation

```
┌──────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  User    │     │  TipTap     │     │  MetaSync   │     │   Backend    │
│  Action  │     │  Editor     │     │  Service    │     │   API        │
└────┬─────┘     └──────┬──────┘     └──────┬──────┘     └───────┬──────┘
     │                  │                   │                    │
     │ Edit frontmatter │                   │                    │
     │─────────────────>│                   │                    │
     │                  │                   │                    │
     │                  │ onUpdate()        │                    │
     │                  │──────────────────>│                    │
     │                  │                   │                    │
     │                  │                   │ Parse YAML         │
     │                  │                   │────────┐           │
     │                  │                   │        │           │
     │                  │                   │<───────┘           │
     │                  │                   │                    │
     │                  │                   │ Validate types     │
     │                  │                   │────────┐           │
     │                  │                   │        │           │
     │                  │                   │<───────┘           │
     │                  │                   │                    │
     │                  │   Update Y.Map    │                    │
     │                  │   (metadata)      │                    │
     │                  │<──────────────────│                    │
     │                  │                   │                    │
     │                  │                   │ PATCH /notes/:id   │
     │                  │                   │ { metadata: {...} }│
     │                  │                   │───────────────────>│
     │                  │                   │                    │
     │                  │                   │       200 OK       │
     │                  │                   │<───────────────────│
     │                  │                   │                    │
```

---

## 3. Spécifications détaillées

### 3.1 Modifications Base de données

#### Schema Prisma

```prisma
// prisma/schema.prisma

// Types de propriétés supportés
enum PropertyType {
  TEXT
  NUMBER
  DATE
  DATETIME
  CHECKBOX
  TAGS
  SELECT
  MULTISELECT
  LINK
}

// Définition d'une propriété au niveau workspace (suggestions)
model PropertyDefinition {
  id          String       @id @default(cuid())
  name        String       // Nom de la propriété (ex: "status", "due_date")
  type        PropertyType
  description String?
  
  // Options pour SELECT/MULTISELECT
  options     String[]     @default([])
  
  // Propriété par défaut pour les nouvelles notes
  isDefault   Boolean      @default(false)
  defaultValue String?     @map("default_value")
  
  // Scope
  workspaceId String?      @map("workspace_id")
  workspace   Workspace?   @relation(fields: [workspaceId], references: [id])
  
  // Métadonnées
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  createdBy   String       @map("created_by")
  
  @@unique([workspaceId, name])
  @@index([workspaceId])
  @@map("property_definitions")
}

// Workspace (si pas déjà existant)
model Workspace {
  id          String   @id @default(cuid())
  name        String
  
  properties  PropertyDefinition[]
  calendarConfig CalendarConfig?
  
  @@map("workspaces")
}

// Configuration calendrier par workspace
model CalendarConfig {
  id              String    @id @default(cuid())
  workspaceId     String    @unique @map("workspace_id")
  workspace       Workspace @relation(fields: [workspaceId], references: [id])
  
  // Champs utilisés pour le calendrier
  eventDateField  String    @default("event_date") @map("event_date_field")
  dueDateField    String    @default("due_date") @map("due_date_field")
  startDateField  String    @default("start_date") @map("start_date_field")
  endDateField    String    @default("end_date") @map("end_date_field")
  
  @@map("calendar_configs")
}

// MODIFICATION : Ajouter metadata JSONB sur Note
model Note {
  id          String    @id @default(cuid())
  title       String
  content     Bytes?    // Y.Doc serialized
  folderId    String    @map("folder_id")
  ownerId     String    @map("owner_id")
  viewCount   Int       @default(0) @map("view_count")
  
  // NOUVEAU : Métadonnées structurées
  metadata    Json      @default("{}") @db.JsonB
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  folder      Folder    @relation(fields: [folderId], references: [id])
  owner       User      @relation(fields: [ownerId], references: [id])
  pinnedBy    UserPinnedNote[]
  
  @@index([metadata], type: Gin) // Index GIN pour requêtes JSONB
  @@map("notes")
}
```

#### Migration SQL

```sql
-- Migration: add_metadata_system
-- Description: Ajoute le système de métadonnées avec JSONB et définitions de propriétés

-- 1. Créer l'enum pour les types de propriétés
CREATE TYPE property_type AS ENUM (
  'TEXT', 'NUMBER', 'DATE', 'DATETIME', 
  'CHECKBOX', 'TAGS', 'SELECT', 'MULTISELECT', 'LINK'
);

-- 2. Créer la table workspace si elle n'existe pas
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Créer la table des définitions de propriétés
CREATE TABLE property_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type property_type NOT NULL,
  description TEXT,
  options TEXT[] DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  default_value TEXT,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  UNIQUE(workspace_id, name)
);

-- 4. Créer la table de configuration calendrier
CREATE TABLE calendar_configs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_date_field TEXT NOT NULL DEFAULT 'event_date',
  due_date_field TEXT NOT NULL DEFAULT 'due_date',
  start_date_field TEXT NOT NULL DEFAULT 'start_date',
  end_date_field TEXT NOT NULL DEFAULT 'end_date'
);

-- 5. Ajouter la colonne metadata sur notes
ALTER TABLE notes 
ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';

-- 6. Créer l'index GIN pour les requêtes sur metadata
CREATE INDEX idx_notes_metadata ON notes USING GIN (metadata);

-- 7. Index spécifiques pour les requêtes calendrier fréquentes
CREATE INDEX idx_notes_metadata_due_date 
ON notes ((metadata->>'due_date')) 
WHERE metadata->>'due_date' IS NOT NULL;

CREATE INDEX idx_notes_metadata_event_date 
ON notes ((metadata->>'event_date')) 
WHERE metadata->>'event_date' IS NOT NULL;

-- 8. Index sur property_definitions
CREATE INDEX idx_property_definitions_workspace 
ON property_definitions(workspace_id);

-- 9. Insérer les propriétés par défaut communes
INSERT INTO property_definitions (id, name, type, description, is_default, workspace_id, created_by) VALUES
  (gen_random_uuid()::text, 'status', 'SELECT', 'État de la note', true, NULL, 'system'),
  (gen_random_uuid()::text, 'due_date', 'DATE', 'Date d''échéance', true, NULL, 'system'),
  (gen_random_uuid()::text, 'tags', 'TAGS', 'Tags de la note', true, NULL, 'system'),
  (gen_random_uuid()::text, 'priority', 'SELECT', 'Niveau de priorité', true, NULL, 'system');

-- 10. Options par défaut pour status et priority
UPDATE property_definitions 
SET options = ARRAY['todo', 'in-progress', 'done', 'archived']
WHERE name = 'status' AND workspace_id IS NULL;

UPDATE property_definitions 
SET options = ARRAY['low', 'medium', 'high', 'urgent']
WHERE name = 'priority' AND workspace_id IS NULL;
```

### 3.2 Backend (API Fastify)

#### Endpoints

|Méthode|Route|Description|Auth|
|---|---|---|---|
|GET|`/api/v1/properties`|Liste des définitions de propriétés|Oui|
|POST|`/api/v1/properties`|Créer une définition de propriété|Oui|
|PATCH|`/api/v1/properties/:id`|Modifier une définition|Oui|
|DELETE|`/api/v1/properties/:id`|Supprimer une définition|Oui|
|PATCH|`/api/v1/notes/:id/metadata`|Mettre à jour les métadonnées d'une note|Oui|
|GET|`/api/v1/notes/search`|Rechercher avec filtres sur métadonnées|Oui|
|GET|`/api/v1/calendar/events`|Événements basés sur les métadonnées date|Oui|

#### metadata.controller.ts

```typescript
// apps/api/src/modules/metadata/metadata.controller.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MetadataService } from './metadata.service';
import {
  CreatePropertyInput,
  CreatePropertyInputSchema,
  UpdatePropertyInput,
  UpdatePropertyInputSchema,
  PropertyIdParams,
  PropertyIdParamsSchema,
  GetPropertiesQuery,
  GetPropertiesQuerySchema
} from './metadata.schema';

export async function metadataController(fastify: FastifyInstance): Promise<void> {
  const metadataService = new MetadataService(fastify.prisma);

  // GET /api/v1/properties - Liste des définitions de propriétés
  fastify.get<{ Querystring: GetPropertiesQuery }>(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: { querystring: GetPropertiesQuerySchema },
      handler: async (request, reply) => {
        const { workspaceId, includeGlobal = true } = request.query;
        
        const properties = await metadataService.getPropertyDefinitions({
          workspaceId,
          includeGlobal
        });
        
        return reply.send(properties);
      }
    }
  );

  // POST /api/v1/properties - Créer une définition
  fastify.post<{ Body: CreatePropertyInput }>(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: { body: CreatePropertyInputSchema },
      handler: async (request, reply) => {
        const userId = request.user.id;
        const property = await metadataService.createPropertyDefinition({
          ...request.body,
          createdBy: userId
        });
        
        return reply.status(201).send(property);
      }
    }
  );

  // PATCH /api/v1/properties/:id - Modifier une définition
  fastify.patch<{ Params: PropertyIdParams; Body: UpdatePropertyInput }>(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: PropertyIdParamsSchema,
        body: UpdatePropertyInputSchema
      },
      handler: async (request, reply) => {
        const { id } = request.params;
        
        const property = await metadataService.updatePropertyDefinition(id, request.body);
        
        if (!property) {
          return reply.status(404).send({ error: 'Property not found' });
        }
        
        return reply.send(property);
      }
    }
  );

  // DELETE /api/v1/properties/:id - Supprimer une définition
  fastify.delete<{ Params: PropertyIdParams }>(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: { params: PropertyIdParamsSchema },
      handler: async (request, reply) => {
        const { id } = request.params;
        
        await metadataService.deletePropertyDefinition(id);
        
        return reply.status(204).send();
      }
    }
  );
}
```

#### metadata.service.ts

```typescript
// apps/api/src/modules/metadata/metadata.service.ts

import { PrismaClient, PropertyType } from '@prisma/client';
import {
  PropertyDefinition,
  CreatePropertyData,
  UpdatePropertyData,
  GetPropertiesOptions,
  NoteMetadata,
  MetadataValidationResult
} from '@plumenote/shared-types';

export class MetadataService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère les définitions de propriétés
   */
  async getPropertyDefinitions(options: GetPropertiesOptions): Promise<PropertyDefinition[]> {
    const { workspaceId, includeGlobal = true } = options;

    const whereConditions = [];
    
    if (workspaceId) {
      whereConditions.push({ workspaceId });
    }
    
    if (includeGlobal) {
      whereConditions.push({ workspaceId: null });
    }

    const definitions = await this.prisma.propertyDefinition.findMany({
      where: { OR: whereConditions },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return definitions.map(this.mapPropertyDefinition);
  }

  /**
   * Crée une nouvelle définition de propriété
   */
  async createPropertyDefinition(data: CreatePropertyData): Promise<PropertyDefinition> {
    const definition = await this.prisma.propertyDefinition.create({
      data: {
        name: data.name,
        type: data.type as PropertyType,
        description: data.description,
        options: data.options ?? [],
        isDefault: data.isDefault ?? false,
        defaultValue: data.defaultValue,
        workspaceId: data.workspaceId,
        createdBy: data.createdBy
      }
    });

    return this.mapPropertyDefinition(definition);
  }

  /**
   * Met à jour une définition de propriété
   */
  async updatePropertyDefinition(
    id: string, 
    data: UpdatePropertyData
  ): Promise<PropertyDefinition | null> {
    const existing = await this.prisma.propertyDefinition.findUnique({
      where: { id }
    });

    if (!existing) return null;

    const updated = await this.prisma.propertyDefinition.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type as PropertyType | undefined,
        description: data.description,
        options: data.options,
        isDefault: data.isDefault,
        defaultValue: data.defaultValue
      }
    });

    return this.mapPropertyDefinition(updated);
  }

  /**
   * Supprime une définition de propriété
   */
  async deletePropertyDefinition(id: string): Promise<void> {
    await this.prisma.propertyDefinition.delete({
      where: { id }
    });
  }

  /**
   * Valide les métadonnées selon les définitions
   */
  async validateMetadata(
    metadata: NoteMetadata,
    workspaceId?: string
  ): Promise<MetadataValidationResult> {
    const definitions = await this.getPropertyDefinitions({
      workspaceId,
      includeGlobal: true
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const validatedMetadata: NoteMetadata = {};

    for (const [key, value] of Object.entries(metadata)) {
      const definition = definitions.find(d => d.name === key);

      if (!definition) {
        // Propriété non définie - on la garde mais avec warning
        warnings.push(`Property "${key}" is not defined`);
        validatedMetadata[key] = value;
        continue;
      }

      const validation = this.validateValue(value, definition);
      
      if (!validation.valid) {
        errors.push(`Property "${key}": ${validation.error}`);
      } else {
        validatedMetadata[key] = validation.normalizedValue ?? value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: validatedMetadata
    };
  }

  /**
   * Valide une valeur selon son type
   */
  private validateValue(
    value: unknown,
    definition: PropertyDefinition
  ): { valid: boolean; error?: string; normalizedValue?: unknown } {
    switch (definition.type) {
      case 'TEXT':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Expected string' };
        }
        return { valid: true };

      case 'NUMBER':
        const num = Number(value);
        if (isNaN(num)) {
          return { valid: false, error: 'Expected number' };
        }
        return { valid: true, normalizedValue: num };

      case 'DATE':
        if (!this.isValidDate(value as string)) {
          return { valid: false, error: 'Expected date (YYYY-MM-DD)' };
        }
        return { valid: true };

      case 'DATETIME':
        if (!this.isValidDateTime(value as string)) {
          return { valid: false, error: 'Expected datetime (ISO 8601)' };
        }
        return { valid: true };

      case 'CHECKBOX':
        if (typeof value !== 'boolean') {
          // Accepter "true"/"false" strings
          if (value === 'true') return { valid: true, normalizedValue: true };
          if (value === 'false') return { valid: true, normalizedValue: false };
          return { valid: false, error: 'Expected boolean' };
        }
        return { valid: true };

      case 'TAGS':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Expected array of strings' };
        }
        if (!value.every(v => typeof v === 'string')) {
          return { valid: false, error: 'All tags must be strings' };
        }
        return { valid: true };

      case 'SELECT':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Expected string' };
        }
        if (definition.options.length > 0 && !definition.options.includes(value)) {
          return { 
            valid: false, 
            error: `Value must be one of: ${definition.options.join(', ')}` 
          };
        }
        return { valid: true };

      case 'MULTISELECT':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Expected array' };
        }
        if (definition.options.length > 0) {
          const invalid = value.filter(v => !definition.options.includes(v as string));
          if (invalid.length > 0) {
            return { 
              valid: false, 
              error: `Invalid values: ${invalid.join(', ')}` 
            };
          }
        }
        return { valid: true };

      case 'LINK':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Expected string (note ID or wikilink)' };
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  }

  private isValidDate(value: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private isValidDateTime(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private mapPropertyDefinition(def: {
    id: string;
    name: string;
    type: PropertyType;
    description: string | null;
    options: string[];
    isDefault: boolean;
    defaultValue: string | null;
    workspaceId: string | null;
  }): PropertyDefinition {
    return {
      id: def.id,
      name: def.name,
      type: def.type.toLowerCase() as PropertyDefinition['type'],
      description: def.description ?? undefined,
      options: def.options,
      isDefault: def.isDefault,
      defaultValue: def.defaultValue ?? undefined,
      workspaceId: def.workspaceId ?? undefined
    };
  }
}
```

#### notes.service.ts (ajouts pour metadata)

```typescript
// apps/api/src/modules/notes/notes.service.ts (ajouts)

import { MetadataService } from '../metadata/metadata.service';

export class NotesService {
  private metadataService: MetadataService;

  constructor(private readonly prisma: PrismaClient) {
    this.metadataService = new MetadataService(prisma);
  }

  /**
   * Met à jour les métadonnées d'une note
   */
  async updateNoteMetadata(
    noteId: string,
    userId: string,
    metadata: NoteMetadata
  ): Promise<{ success: boolean; note?: NoteWithMetadata; errors?: string[] }> {
    // Vérifier l'accès à la note
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { ownerId: userId },
          { folder: { permissions: { some: { userId, level: { in: ['write', 'admin'] } } } } }
        ]
      },
      include: { folder: true }
    });

    if (!note) {
      return { success: false, errors: ['Note not found or access denied'] };
    }

    // Valider les métadonnées
    const validation = await this.metadataService.validateMetadata(
      metadata,
      note.folder.workspaceId ?? undefined
    );

    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Mettre à jour la note
    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: { metadata: validation.metadata },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            parent: { select: { id: true, name: true } }
          }
        },
        pinnedBy: { where: { userId }, select: { id: true } }
      }
    });

    return {
      success: true,
      note: this.mapNoteToMetadata(updated, updated.pinnedBy.length > 0)
    };
  }

  /**
   * Recherche des notes avec filtres sur métadonnées
   */
  async searchNotesWithMetadata(
    userId: string,
    filters: MetadataFilters,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ notes: NoteWithMetadata[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    // Construire les conditions de filtrage JSONB
    const metadataConditions = this.buildMetadataConditions(filters);

    const [notes, total] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          AND: [
            // Accès utilisateur
            {
              OR: [
                { ownerId: userId },
                { folder: { permissions: { some: { userId, level: { in: ['read', 'write', 'admin'] } } } } }
              ]
            },
            // Filtres metadata
            ...metadataConditions
          ]
        },
        include: {
          folder: {
            select: {
              id: true,
              name: true,
              parent: { select: { id: true, name: true } }
            }
          },
          pinnedBy: { where: { userId }, select: { id: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      this.prisma.note.count({
        where: {
          AND: [
            {
              OR: [
                { ownerId: userId },
                { folder: { permissions: { some: { userId } } } }
              ]
            },
            ...metadataConditions
          ]
        }
      })
    ]);

    return {
      notes: notes.map(note => this.mapNoteToMetadata(note, note.pinnedBy.length > 0)),
      total
    };
  }

  /**
   * Construit les conditions Prisma pour les filtres metadata
   */
  private buildMetadataConditions(filters: MetadataFilters): object[] {
    const conditions: object[] = [];

    for (const [key, filter] of Object.entries(filters)) {
      switch (filter.operator) {
        case 'equals':
          conditions.push({
            metadata: { path: [key], equals: filter.value }
          });
          break;
        case 'contains':
          conditions.push({
            metadata: { path: [key], string_contains: filter.value }
          });
          break;
        case 'gt':
          conditions.push({
            metadata: { path: [key], gt: filter.value }
          });
          break;
        case 'gte':
          conditions.push({
            metadata: { path: [key], gte: filter.value }
          });
          break;
        case 'lt':
          conditions.push({
            metadata: { path: [key], lt: filter.value }
          });
          break;
        case 'lte':
          conditions.push({
            metadata: { path: [key], lte: filter.value }
          });
          break;
        case 'in':
          conditions.push({
            metadata: { path: [key], array_contains: filter.value }
          });
          break;
        case 'hasAny':
          // Pour les tags : note contient au moins un des tags spécifiés
          conditions.push({
            OR: (filter.value as string[]).map(v => ({
              metadata: { path: [key], array_contains: [v] }
            }))
          });
          break;
      }
    }

    return conditions;
  }
}
```

#### calendar.service.ts (implémentation complète)

```typescript
// apps/api/src/modules/calendar/calendar.service.ts

import { PrismaClient } from '@prisma/client';
import { CalendarEvent, DateRange } from '@plumenote/shared-types';

export class CalendarService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Récupère les événements à venir basés sur les métadonnées des notes
   */
  async getUpcomingEvents(
    userId: string,
    limit: number = 5
  ): Promise<CalendarEvent[]> {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Chercher les notes avec des dates futures
    const notes = await this.prisma.$queryRaw<Array<{
      id: string;
      title: string;
      metadata: Record<string, unknown>;
    }>>`
      SELECT id, title, metadata
      FROM notes n
      WHERE (
        n.owner_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM folder_permissions fp
          WHERE fp.folder_id = n.folder_id
          AND fp.user_id = ${userId}
        )
      )
      AND (
        (metadata->>'due_date')::date >= ${now}::date
        OR (metadata->>'event_date')::date >= ${now}::date
        OR (metadata->>'start_date')::date >= ${now}::date
      )
      ORDER BY LEAST(
        COALESCE((metadata->>'due_date')::date, '9999-12-31'::date),
        COALESCE((metadata->>'event_date')::date, '9999-12-31'::date),
        COALESCE((metadata->>'start_date')::date, '9999-12-31'::date)
      ) ASC
      LIMIT ${limit}
    `;

    return notes.flatMap(note => this.extractEventsFromNote(note));
  }

  /**
   * Récupère les événements dans une plage de dates
   */
  async getEventsByDateRange(
    userId: string,
    range: DateRange
  ): Promise<CalendarEvent[]> {
    const { start, end } = range;

    const notes = await this.prisma.$queryRaw<Array<{
      id: string;
      title: string;
      metadata: Record<string, unknown>;
    }>>`
      SELECT id, title, metadata
      FROM notes n
      WHERE (
        n.owner_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM folder_permissions fp
          WHERE fp.folder_id = n.folder_id
          AND fp.user_id = ${userId}
        )
      )
      AND (
        ((metadata->>'due_date')::date BETWEEN ${start}::date AND ${end}::date)
        OR ((metadata->>'event_date')::date BETWEEN ${start}::date AND ${end}::date)
        OR ((metadata->>'start_date')::date BETWEEN ${start}::date AND ${end}::date)
      )
      ORDER BY LEAST(
        COALESCE((metadata->>'due_date')::date, '9999-12-31'::date),
        COALESCE((metadata->>'event_date')::date, '9999-12-31'::date),
        COALESCE((metadata->>'start_date')::date, '9999-12-31'::date)
      ) ASC
    `;

    return notes.flatMap(note => this.extractEventsFromNote(note));
  }

  /**
   * Extrait les événements d'une note selon ses métadonnées
   */
  private extractEventsFromNote(note: {
    id: string;
    title: string;
    metadata: Record<string, unknown>;
  }): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const meta = note.metadata;

    // Due date → type deadline
    if (meta.due_date && typeof meta.due_date === 'string') {
      events.push({
        id: `${note.id}-due`,
        title: meta.event_title as string || note.title,
        date: meta.due_date,
        time: this.extractTime(meta.due_date),
        noteId: note.id,
        noteTitle: note.title,
        type: 'deadline'
      });
    }

    // Event date → type event
    if (meta.event_date && typeof meta.event_date === 'string') {
      events.push({
        id: `${note.id}-event`,
        title: meta.event_title as string || note.title,
        date: meta.event_date,
        time: this.extractTime(meta.event_date),
        noteId: note.id,
        noteTitle: note.title,
        type: 'event'
      });
    }

    // Start date (pour les événements avec durée)
    if (meta.start_date && typeof meta.start_date === 'string') {
      events.push({
        id: `${note.id}-start`,
        title: meta.event_title as string || note.title,
        date: meta.start_date,
        time: this.extractTime(meta.start_date),
        noteId: note.id,
        noteTitle: note.title,
        type: 'event'
      });
    }

    return events;
  }

  /**
   * Extrait l'heure d'une date ISO si présente
   */
  private extractTime(dateString: string): string | undefined {
    if (dateString.includes('T')) {
      const timePart = dateString.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 5); // HH:mm
      }
    }
    return undefined;
  }
}
```

#### metadata.schema.ts

```typescript
// apps/api/src/modules/metadata/metadata.schema.ts

import { z } from 'zod';

export const PropertyTypeEnum = z.enum([
  'text', 'number', 'date', 'datetime', 
  'checkbox', 'tags', 'select', 'multiselect', 'link'
]);

export const CreatePropertyInputSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Name must start with lowercase letter and contain only lowercase letters, numbers, and underscores'
  }),
  type: PropertyTypeEnum,
  description: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  defaultValue: z.string().optional(),
  workspaceId: z.string().cuid().optional()
});

export type CreatePropertyInput = z.infer<typeof CreatePropertyInputSchema>;

export const UpdatePropertyInputSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: PropertyTypeEnum.optional(),
  description: z.string().max(200).optional().nullable(),
  options: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  defaultValue: z.string().optional().nullable()
});

export type UpdatePropertyInput = z.infer<typeof UpdatePropertyInputSchema>;

export const PropertyIdParamsSchema = z.object({
  id: z.string().cuid()
});

export type PropertyIdParams = z.infer<typeof PropertyIdParamsSchema>;

export const GetPropertiesQuerySchema = z.object({
  workspaceId: z.string().cuid().optional(),
  includeGlobal: z.coerce.boolean().optional().default(true)
});

export type GetPropertiesQuery = z.infer<typeof GetPropertiesQuerySchema>;

export const UpdateNoteMetadataSchema = z.object({
  metadata: z.record(z.unknown())
});

export type UpdateNoteMetadataInput = z.infer<typeof UpdateNoteMetadataSchema>;

// Filtres pour la recherche
export const MetadataFilterSchema = z.object({
  operator: z.enum(['equals', 'contains', 'gt', 'gte', 'lt', 'lte', 'in', 'hasAny']),
  value: z.unknown()
});

export const MetadataFiltersSchema = z.record(MetadataFilterSchema);

export type MetadataFilters = z.infer<typeof MetadataFiltersSchema>;
```

### 3.3 Frontend (React)

#### Types/Interfaces

```typescript
// packages/shared-types/src/metadata.ts

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

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  description?: string;
  options: string[];
  isDefault: boolean;
  defaultValue?: string;
  workspaceId?: string;
}

export interface NoteMetadata {
  [key: string]: unknown;
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: NoteMetadata;
}

export interface CreatePropertyData {
  name: string;
  type: PropertyType;
  description?: string;
  options?: string[];
  isDefault?: boolean;
  defaultValue?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdatePropertyData {
  name?: string;
  type?: PropertyType;
  description?: string | null;
  options?: string[];
  isDefault?: boolean;
  defaultValue?: string | null;
}

export interface GetPropertiesOptions {
  workspaceId?: string;
  includeGlobal?: boolean;
}

export interface MetadataFilter {
  operator: 'equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'hasAny';
  value: unknown;
}

export interface MetadataFilters {
  [key: string]: MetadataFilter;
}

export interface DateRange {
  start: string;
  end: string;
}
```

#### Store Zustand - Metadata

```typescript
// apps/web/src/stores/metadataStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { PropertyDefinition, NoteMetadata } from '@plumenote/shared-types';
import { metadataApi } from '@/services/metadataApi';

interface MetadataState {
  // Définitions de propriétés
  propertyDefinitions: PropertyDefinition[];
  isLoadingDefinitions: boolean;
  
  // Métadonnées de la note courante
  currentNoteMetadata: NoteMetadata;
  isDirty: boolean;
  isSaving: boolean;
  
  // Erreurs
  error: string | null;

  // Actions - Définitions
  loadPropertyDefinitions: (workspaceId?: string) => Promise<void>;
  createPropertyDefinition: (data: Omit<PropertyDefinition, 'id'>) => Promise<void>;
  updatePropertyDefinition: (id: string, data: Partial<PropertyDefinition>) => Promise<void>;
  deletePropertyDefinition: (id: string) => Promise<void>;

  // Actions - Métadonnées note
  setCurrentNoteMetadata: (metadata: NoteMetadata) => void;
  updateMetadataField: (key: string, value: unknown) => void;
  removeMetadataField: (key: string) => void;
  saveMetadata: (noteId: string) => Promise<void>;
  resetMetadata: () => void;

  // Helpers
  getPropertyByName: (name: string) => PropertyDefinition | undefined;
  getSuggestedProperties: () => PropertyDefinition[];
}

export const useMetadataStore = create<MetadataState>()(
  devtools(
    (set, get) => ({
      propertyDefinitions: [],
      isLoadingDefinitions: false,
      currentNoteMetadata: {},
      isDirty: false,
      isSaving: false,
      error: null,

      loadPropertyDefinitions: async (workspaceId?: string) => {
        set({ isLoadingDefinitions: true, error: null });
        try {
          const definitions = await metadataApi.getPropertyDefinitions(workspaceId);
          set({ propertyDefinitions: definitions, isLoadingDefinitions: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load properties',
            isLoadingDefinitions: false
          });
        }
      },

      createPropertyDefinition: async (data) => {
        try {
          const newDefinition = await metadataApi.createPropertyDefinition(data);
          set(state => ({
            propertyDefinitions: [...state.propertyDefinitions, newDefinition]
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create property' });
        }
      },

      updatePropertyDefinition: async (id, data) => {
        try {
          const updated = await metadataApi.updatePropertyDefinition(id, data);
          set(state => ({
            propertyDefinitions: state.propertyDefinitions.map(p =>
              p.id === id ? updated : p
            )
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update property' });
        }
      },

      deletePropertyDefinition: async (id) => {
        try {
          await metadataApi.deletePropertyDefinition(id);
          set(state => ({
            propertyDefinitions: state.propertyDefinitions.filter(p => p.id !== id)
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete property' });
        }
      },

      setCurrentNoteMetadata: (metadata) => {
        set({ currentNoteMetadata: metadata, isDirty: false });
      },

      updateMetadataField: (key, value) => {
        set(state => ({
          currentNoteMetadata: { ...state.currentNoteMetadata, [key]: value },
          isDirty: true
        }));
      },

      removeMetadataField: (key) => {
        set(state => {
          const { [key]: _, ...rest } = state.currentNoteMetadata;
          return { currentNoteMetadata: rest, isDirty: true };
        });
      },

      saveMetadata: async (noteId) => {
        const { currentNoteMetadata, isDirty } = get();
        if (!isDirty) return;

        set({ isSaving: true, error: null });
        try {
          await metadataApi.updateNoteMetadata(noteId, currentNoteMetadata);
          set({ isSaving: false, isDirty: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save metadata',
            isSaving: false
          });
        }
      },

      resetMetadata: () => {
        set({ currentNoteMetadata: {}, isDirty: false, error: null });
      },

      getPropertyByName: (name) => {
        return get().propertyDefinitions.find(p => p.name === name);
      },

      getSuggestedProperties: () => {
        const { propertyDefinitions, currentNoteMetadata } = get();
        const existingKeys = Object.keys(currentNoteMetadata);
        return propertyDefinitions.filter(p => !existingKeys.includes(p.name));
      }
    }),
    { name: 'metadata-store' }
  )
);
```

#### API Client

```typescript
// apps/web/src/services/metadataApi.ts

import { api } from './api';
import { PropertyDefinition, NoteMetadata } from '@plumenote/shared-types';

export const metadataApi = {
  async getPropertyDefinitions(workspaceId?: string): Promise<PropertyDefinition[]> {
    const response = await api.get<PropertyDefinition[]>('/properties', {
      params: { workspaceId, includeGlobal: true }
    });
    return response.data;
  },

  async createPropertyDefinition(
    data: Omit<PropertyDefinition, 'id'>
  ): Promise<PropertyDefinition> {
    const response = await api.post<PropertyDefinition>('/properties', data);
    return response.data;
  },

  async updatePropertyDefinition(
    id: string,
    data: Partial<PropertyDefinition>
  ): Promise<PropertyDefinition> {
    const response = await api.patch<PropertyDefinition>(`/properties/${id}`, data);
    return response.data;
  },

  async deletePropertyDefinition(id: string): Promise<void> {
    await api.delete(`/properties/${id}`);
  },

  async updateNoteMetadata(noteId: string, metadata: NoteMetadata): Promise<void> {
    await api.patch(`/notes/${noteId}/metadata`, { metadata });
  }
};
```

#### Composants

##### PropertiesPanel.tsx

```typescript
// apps/web/src/components/editor/PropertiesPanel.tsx

import { useEffect, useCallback } from 'react';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useMetadataStore } from '@/stores/metadataStore';
import { useNoteStore } from '@/stores/noteStore';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PropertyField } from './PropertyField';
import { AddPropertyPopover } from './AddPropertyPopover';
import { cn } from '@/lib/utils';

interface PropertiesPanelProps {
  noteId: string;
  className?: string;
}

export function PropertiesPanel({ noteId, className }: PropertiesPanelProps) {
  const { currentNote } = useNoteStore();
  const {
    currentNoteMetadata,
    propertyDefinitions,
    isDirty,
    isSaving,
    setCurrentNoteMetadata,
    updateMetadataField,
    removeMetadataField,
    saveMetadata,
    loadPropertyDefinitions,
    getSuggestedProperties
  } = useMetadataStore();

  const [isOpen, setIsOpen] = useState(true);

  // Charger les définitions au mount
  useEffect(() => {
    loadPropertyDefinitions();
  }, [loadPropertyDefinitions]);

  // Initialiser avec les métadonnées de la note
  useEffect(() => {
    if (currentNote?.metadata) {
      setCurrentNoteMetadata(currentNote.metadata as NoteMetadata);
    }
  }, [currentNote?.id, currentNote?.metadata, setCurrentNoteMetadata]);

  // Auto-save avec debounce
  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = setTimeout(() => {
      saveMetadata(noteId);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isDirty, noteId, saveMetadata, currentNoteMetadata]);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    updateMetadataField(key, value);
  }, [updateMetadataField]);

  const handleRemoveField = useCallback((key: string) => {
    removeMetadataField(key);
  }, [removeMetadataField]);

  const metadataEntries = Object.entries(currentNoteMetadata);
  const suggestedProperties = getSuggestedProperties();

  return (
    <div className={cn("properties-panel border-b", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Properties
              {metadataEntries.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({metadataEntries.length})
                </span>
              )}
            </span>
            {isSaving && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {/* Liste des propriétés */}
            {metadataEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No properties yet. Add one below.
              </p>
            ) : (
              <div className="space-y-1">
                {metadataEntries.map(([key, value]) => {
                  const definition = propertyDefinitions.find(p => p.name === key);
                  
                  return (
                    <PropertyField
                      key={key}
                      name={key}
                      value={value}
                      definition={definition}
                      onChange={(newValue) => handleFieldChange(key, newValue)}
                      onRemove={() => handleRemoveField(key)}
                    />
                  );
                })}
              </div>
            )}

            {/* Bouton ajouter */}
            <AddPropertyPopover
              suggestedProperties={suggestedProperties}
              onAddProperty={(name, type, defaultValue) => {
                updateMetadataField(name, defaultValue ?? getDefaultValueForType(type));
              }}
              onCreateProperty={(name, type) => {
                // Créer une nouvelle définition puis l'ajouter à la note
                updateMetadataField(name, getDefaultValueForType(type));
              }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function getDefaultValueForType(type: string): unknown {
  switch (type) {
    case 'text': return '';
    case 'number': return 0;
    case 'date': return new Date().toISOString().split('T')[0];
    case 'datetime': return new Date().toISOString();
    case 'checkbox': return false;
    case 'tags': return [];
    case 'select': return '';
    case 'multiselect': return [];
    case 'link': return '';
    default: return '';
  }
}
```

##### PropertyField.tsx

```typescript
// apps/web/src/components/editor/PropertyField.tsx

import { memo, useState, useCallback } from 'react';
import { X, Calendar, Link, Hash, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { PropertyDefinition } from '@plumenote/shared-types';

interface PropertyFieldProps {
  name: string;
  value: unknown;
  definition?: PropertyDefinition;
  onChange: (value: unknown) => void;
  onRemove: () => void;
}

export const PropertyField = memo(function PropertyField({
  name,
  value,
  definition,
  onChange,
  onRemove
}: PropertyFieldProps) {
  const type = definition?.type ?? inferType(value);

  return (
    <div className="flex items-center gap-2 group">
      {/* Nom de la propriété */}
      <span className="text-sm text-muted-foreground w-24 truncate flex-shrink-0">
        {name}
      </span>

      {/* Éditeur selon le type */}
      <div className="flex-1 min-w-0">
        <PropertyValueEditor
          type={type}
          value={value}
          options={definition?.options ?? []}
          onChange={onChange}
        />
      </div>

      {/* Bouton supprimer */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
});

interface PropertyValueEditorProps {
  type: string;
  value: unknown;
  options: string[];
  onChange: (value: unknown) => void;
}

function PropertyValueEditor({ type, value, options, onChange }: PropertyValueEditorProps) {
  switch (type) {
    case 'text':
      return (
        <Input
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-sm"
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value as number ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 text-sm w-24"
        />
      );

    case 'date':
      return <DatePicker value={value as string} onChange={onChange} />;

    case 'datetime':
      return <DateTimePicker value={value as string} onChange={onChange} />;

    case 'checkbox':
      return (
        <Checkbox
          checked={value as boolean ?? false}
          onCheckedChange={onChange}
        />
      );

    case 'tags':
      return (
        <TagsEditor
          value={value as string[] ?? []}
          onChange={onChange}
        />
      );

    case 'select':
      return (
        <Select value={value as string ?? ''} onValueChange={onChange}>
          <SelectTrigger className="h-7 text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'multiselect':
      return (
        <MultiSelectEditor
          value={value as string[] ?? []}
          options={options}
          onChange={onChange}
        />
      );

    case 'link':
      return (
        <div className="flex items-center gap-1">
          <Link className="h-3 w-3 text-muted-foreground" />
          <Input
            value={value as string ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="[[Note title]]"
            className="h-7 text-sm"
          />
        </div>
      );

    default:
      return (
        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-sm"
        />
      );
  }
}

// Composants helper

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-sm justify-start">
          <Calendar className="h-3 w-3 mr-2" />
          {date ? date.toLocaleDateString('fr-FR') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(d.toISOString().split('T')[0]);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const [time, setTime] = useState(date ? date.toTimeString().slice(0, 5) : '12:00');

  const handleDateChange = (d: Date | undefined) => {
    if (d) {
      const [hours, minutes] = time.split(':');
      d.setHours(parseInt(hours), parseInt(minutes));
      onChange(d.toISOString());
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date) {
      const [hours, minutes] = newTime.split(':');
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(newDate.toISOString());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-sm">
            <Calendar className="h-3 w-3 mr-2" />
            {date ? date.toLocaleDateString('fr-FR') : 'Date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(d) => {
              handleDateChange(d);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time}
        onChange={(e) => handleTimeChange(e.target.value)}
        className="h-7 text-sm w-24"
      />
    </div>
  );
}

function TagsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map(tag => (
        <Badge key={tag} variant="secondary" className="text-xs">
          <Hash className="h-2 w-2 mr-1" />
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 hover:text-destructive"
          >
            <X className="h-2 w-2" />
          </button>
        </Badge>
      ))}
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder="Add tag..."
        className="h-6 text-xs w-20 border-0 shadow-none focus-visible:ring-0 p-0"
      />
    </div>
  );
}

function MultiSelectEditor({
  value,
  options,
  onChange
}: {
  value: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-sm justify-start">
          {value.length > 0 ? value.join(', ') : 'Select...'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        {options.map(option => (
          <div
            key={option}
            className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer"
            onClick={() => toggleOption(option)}
          >
            <div className={cn(
              "w-4 h-4 border rounded flex items-center justify-center",
              value.includes(option) && "bg-primary border-primary"
            )}>
              {value.includes(option) && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-sm">{option}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Helper pour inférer le type
function inferType(value: unknown): string {
  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'tags';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'datetime';
    if (value.startsWith('[[') && value.endsWith(']]')) return 'link';
  }
  return 'text';
}
```

##### AddPropertyPopover.tsx

```typescript
// apps/web/src/components/editor/AddPropertyPopover.tsx

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { PropertyDefinition, PropertyType } from '@plumenote/shared-types';

interface AddPropertyPopoverProps {
  suggestedProperties: PropertyDefinition[];
  onAddProperty: (name: string, type: PropertyType, defaultValue?: unknown) => void;
  onCreateProperty: (name: string, type: PropertyType) => void;
}

export function AddPropertyPopover({
  suggestedProperties,
  onAddProperty,
  onCreateProperty
}: AddPropertyPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<PropertyType>('text');

  const filteredSuggestions = suggestedProperties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddExisting = (prop: PropertyDefinition) => {
    onAddProperty(prop.name, prop.type, prop.defaultValue);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    if (newPropName.trim()) {
      onCreateProperty(newPropName.trim().toLowerCase().replace(/\s+/g, '_'), newPropType);
      setOpen(false);
      setNewPropName('');
      setNewPropType('text');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Add property
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-0" align="start">
        {/* Recherche */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search or create..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Suggestions existantes */}
        {filteredSuggestions.length > 0 && (
          <div className="p-2 border-b">
            <p className="text-xs text-muted-foreground mb-1 px-1">Suggested</p>
            <div className="space-y-0.5">
              {filteredSuggestions.slice(0, 5).map(prop => (
                <button
                  key={prop.id}
                  onClick={() => handleAddExisting(prop)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-muted"
                >
                  <span>{prop.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {prop.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Créer nouvelle propriété */}
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">Create new</p>
          <div className="space-y-2">
            <Input
              placeholder="Property name"
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              className="h-8"
            />
            <Select value={newPropType} onValueChange={(v) => setNewPropType(v as PropertyType)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="datetime">Date & Time</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="tags">Tags</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="multiselect">Multi-select</SelectItem>
                <SelectItem value="link">Link to note</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              disabled={!newPropName.trim()}
              onClick={handleCreateNew}
            >
              Create
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### 3.4 Synchronisation CRDT (Yjs)

```typescript
// apps/web/src/features/collaboration/metadataSync.ts

import * as Y from 'yjs';
import { NoteMetadata } from '@plumenote/shared-types';

/**
 * Gère la synchronisation des métadonnées via Y.Map
 * Les métadonnées sont stockées dans un Y.Map séparé du contenu
 */
export class MetadataSyncService {
  private metadataMap: Y.Map<unknown>;
  private onChangeCallback?: (metadata: NoteMetadata) => void;

  constructor(private doc: Y.Doc) {
    this.metadataMap = doc.getMap('metadata');
    this.setupObserver();
  }

  /**
   * Configure l'observer pour les changements
   */
  private setupObserver() {
    this.metadataMap.observe((event) => {
      if (this.onChangeCallback) {
        this.onChangeCallback(this.getMetadata());
      }
    });
  }

  /**
   * Définit le callback appelé lors des changements
   */
  onChange(callback: (metadata: NoteMetadata) => void) {
    this.onChangeCallback = callback;
  }

  /**
   * Récupère toutes les métadonnées
   */
  getMetadata(): NoteMetadata {
    const metadata: NoteMetadata = {};
    this.metadataMap.forEach((value, key) => {
      metadata[key] = this.deserializeValue(value);
    });
    return metadata;
  }

  /**
   * Met à jour une propriété
   */
  setProperty(key: string, value: unknown) {
    this.doc.transact(() => {
      this.metadataMap.set(key, this.serializeValue(value));
    });
  }

  /**
   * Supprime une propriété
   */
  deleteProperty(key: string) {
    this.doc.transact(() => {
      this.metadataMap.delete(key);
    });
  }

  /**
   * Remplace toutes les métadonnées
   */
  setAllMetadata(metadata: NoteMetadata) {
    this.doc.transact(() => {
      // Supprimer les clés qui n'existent plus
      const existingKeys = Array.from(this.metadataMap.keys());
      for (const key of existingKeys) {
        if (!(key in metadata)) {
          this.metadataMap.delete(key);
        }
      }
      // Ajouter/mettre à jour
      for (const [key, value] of Object.entries(metadata)) {
        this.metadataMap.set(key, this.serializeValue(value));
      }
    });
  }

  /**
   * Sérialise une valeur pour stockage dans Y.Map
   */
  private serializeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return { __type: 'array', value };
    }
    if (value instanceof Date) {
      return { __type: 'date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * Désérialise une valeur depuis Y.Map
   */
  private deserializeValue(value: unknown): unknown {
    if (value && typeof value === 'object' && '__type' in value) {
      const typed = value as { __type: string; value: unknown };
      if (typed.__type === 'array') return typed.value;
      if (typed.__type === 'date') return typed.value;
    }
    return value;
  }
}
```

### 3.5 Parser YAML Frontmatter

```typescript
// apps/web/src/lib/frontmatterParser.ts

import * as yaml from 'yaml';
import { NoteMetadata } from '@plumenote/shared-types';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface ParsedContent {
  metadata: NoteMetadata;
  content: string;
  hasFrontmatter: boolean;
}

/**
 * Parse le frontmatter YAML d'un contenu Markdown
 */
export function parseFrontmatter(rawContent: string): ParsedContent {
  const match = rawContent.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      metadata: {},
      content: rawContent,
      hasFrontmatter: false
    };
  }

  try {
    const yamlContent = match[1];
    const metadata = yaml.parse(yamlContent) as NoteMetadata ?? {};
    const content = rawContent.slice(match[0].length);

    return {
      metadata,
      content,
      hasFrontmatter: true
    };
  } catch (error) {
    console.error('Failed to parse frontmatter:', error);
    return {
      metadata: {},
      content: rawContent,
      hasFrontmatter: false
    };
  }
}

/**
 * Génère le frontmatter YAML à partir des métadonnées
 */
export function generateFrontmatter(metadata: NoteMetadata): string {
  if (Object.keys(metadata).length === 0) {
    return '';
  }

  // Trier les clés pour une sortie consistante
  const sortedMetadata: NoteMetadata = {};
  const keys = Object.keys(metadata).sort();
  
  for (const key of keys) {
    sortedMetadata[key] = metadata[key];
  }

  const yamlContent = yaml.stringify(sortedMetadata, {
    indent: 2,
    lineWidth: 0 // Pas de wrapping automatique
  }).trim();

  return `---\n${yamlContent}\n---\n\n`;
}

/**
 * Met à jour le frontmatter dans un contenu existant
 */
export function updateFrontmatter(rawContent: string, metadata: NoteMetadata): string {
  const { content, hasFrontmatter } = parseFrontmatter(rawContent);
  const newFrontmatter = generateFrontmatter(metadata);

  if (Object.keys(metadata).length === 0) {
    // Supprimer le frontmatter si metadata vide
    return content;
  }

  return newFrontmatter + content;
}

/**
 * Fusionne les métadonnées existantes avec de nouvelles
 */
export function mergeMetadata(
  existing: NoteMetadata,
  updates: Partial<NoteMetadata>
): NoteMetadata {
  return { ...existing, ...updates };
}
```

---

## 4. Tests

### 4.1 Tests unitaires Backend

```typescript
// apps/api/src/modules/metadata/__tests__/metadata.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetadataService } from '../metadata.service';
import { prismaMock } from '@/test/prisma-mock';

describe('MetadataService', () => {
  let service: MetadataService;

  beforeEach(() => {
    service = new MetadataService(prismaMock);
    vi.clearAllMocks();
  });

  describe('validateMetadata', () => {
    beforeEach(() => {
      prismaMock.propertyDefinition.findMany.mockResolvedValue([
        { id: '1', name: 'status', type: 'SELECT', options: ['todo', 'done'], workspaceId: null },
        { id: '2', name: 'due_date', type: 'DATE', options: [], workspaceId: null },
        { id: '3', name: 'priority', type: 'NUMBER', options: [], workspaceId: null },
        { id: '4', name: 'tags', type: 'TAGS', options: [], workspaceId: null }
      ]);
    });

    it('should validate correct metadata', async () => {
      const metadata = {
        status: 'todo',
        due_date: '2024-12-15',
        priority: 5,
        tags: ['important', 'work']
      };

      const result = await service.validateMetadata(metadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid select value', async () => {
      const metadata = { status: 'invalid' };

      const result = await service.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must be one of');
    });

    it('should reject invalid date format', async () => {
      const metadata = { due_date: 'not-a-date' };

      const result = await service.validateMetadata(metadata);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Expected date');
    });

    it('should normalize number from string', async () => {
      const metadata = { priority: '10' };

      const result = await service.validateMetadata(metadata);

      expect(result.valid).toBe(true);
      expect(result.metadata.priority).toBe(10);
    });

    it('should warn for undefined properties', async () => {
      const metadata = { unknown_prop: 'value' };

      const result = await service.validateMetadata(metadata);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Property "unknown_prop" is not defined');
    });
  });

  describe('createPropertyDefinition', () => {
    it('should create a property definition', async () => {
      const data = {
        name: 'test_prop',
        type: 'text' as const,
        description: 'Test property',
        createdBy: 'user-1'
      };

      prismaMock.propertyDefinition.create.mockResolvedValue({
        id: 'new-id',
        ...data,
        type: 'TEXT',
        options: [],
        isDefault: false,
        defaultValue: null,
        workspaceId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.createPropertyDefinition(data);

      expect(result.name).toBe('test_prop');
      expect(prismaMock.propertyDefinition.create).toHaveBeenCalled();
    });
  });
});

// apps/api/src/modules/calendar/__tests__/calendar.service.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarService } from '../calendar.service';
import { prismaMock } from '@/test/prisma-mock';

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    service = new CalendarService(prismaMock);
  });

  describe('getUpcomingEvents', () => {
    it('should extract events from notes with date metadata', async () => {
      // Ce test nécessite un mock de $queryRaw
      // Simuler des notes avec métadonnées
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Meeting',
          metadata: { event_date: '2024-12-20', event_title: 'Team sync' }
        },
        {
          id: 'note-2',
          title: 'Deadline',
          metadata: { due_date: '2024-12-25' }
        }
      ];

      prismaMock.$queryRaw.mockResolvedValue(mockNotes);

      const events = await service.getUpcomingEvents('user-1', 5);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('event');
      expect(events[0].title).toBe('Team sync');
      expect(events[1].type).toBe('deadline');
    });
  });
});
```

### 4.2 Tests unitaires Frontend

```typescript
// apps/web/src/lib/__tests__/frontmatterParser.test.ts

import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  generateFrontmatter,
  updateFrontmatter
} from '../frontmatterParser';

describe('frontmatterParser', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid frontmatter', () => {
      const content = `---
title: Test Note
date: 2024-12-15
tags:
  - important
  - work
---

# Content here`;

      const result = parseFrontmatter(content);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.metadata.title).toBe('Test Note');
      expect(result.metadata.date).toBe('2024-12-15');
      expect(result.metadata.tags).toEqual(['important', 'work']);
      expect(result.content).toBe('# Content here');
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just content\n\nNo frontmatter here.';

      const result = parseFrontmatter(content);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.metadata).toEqual({});
      expect(result.content).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

# Content`;

      const result = parseFrontmatter(content);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.metadata).toEqual({});
    });

    it('should handle malformed YAML gracefully', () => {
      const content = `---
invalid: yaml: here
---

# Content`;

      const result = parseFrontmatter(content);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.content).toBe(content);
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate valid YAML frontmatter', () => {
      const metadata = {
        title: 'Test',
        priority: 5,
        tags: ['a', 'b']
      };

      const result = generateFrontmatter(metadata);

      expect(result).toContain('---');
      expect(result).toContain('title: Test');
      expect(result).toContain('priority: 5');
    });

    it('should return empty string for empty metadata', () => {
      const result = generateFrontmatter({});
      expect(result).toBe('');
    });

    it('should sort keys alphabetically', () => {
      const metadata = { zebra: 1, alpha: 2 };
      const result = generateFrontmatter(metadata);

      const alphaIndex = result.indexOf('alpha');
      const zebraIndex = result.indexOf('zebra');
      expect(alphaIndex).toBeLessThan(zebraIndex);
    });
  });

  describe('updateFrontmatter', () => {
    it('should update existing frontmatter', () => {
      const content = `---
title: Old
---

# Content`;

      const result = updateFrontmatter(content, { title: 'New', status: 'done' });

      expect(result).toContain('title: New');
      expect(result).toContain('status: done');
      expect(result).toContain('# Content');
    });

    it('should add frontmatter if none exists', () => {
      const content = '# Just content';
      const result = updateFrontmatter(content, { title: 'Added' });

      expect(result).toContain('---');
      expect(result).toContain('title: Added');
      expect(result).toContain('# Just content');
    });

    it('should remove frontmatter if metadata is empty', () => {
      const content = `---
title: Test
---

# Content`;

      const result = updateFrontmatter(content, {});

      expect(result).not.toContain('---');
      expect(result).toBe('# Content');
    });
  });
});
```

### 4.3 Tests E2E (Playwright)

```typescript
// e2e/metadata.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Metadata System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });

  test('should display properties panel in editor', async ({ page }) => {
    // Ouvrir une note
    await page.goto('/notes/test-note-id');

    // Vérifier que le panneau Properties existe
    const propertiesPanel = page.getByText('Properties');
    await expect(propertiesPanel).toBeVisible();
  });

  test('should add a new text property', async ({ page }) => {
    await page.goto('/notes/test-note-id');

    // Ouvrir le popover d'ajout
    await page.click('text=Add property');

    // Créer une nouvelle propriété
    await page.fill('input[placeholder="Property name"]', 'author');
    await page.click('button:has-text("Create")');

    // Vérifier qu'elle apparaît
    await expect(page.getByText('author')).toBeVisible();
  });

  test('should add a date property and see it in calendar', async ({ page }) => {
    await page.goto('/notes/test-note-id');

    // Ajouter une propriété due_date
    await page.click('text=Add property');
    await page.click('text=due_date'); // Propriété suggérée

    // Sélectionner une date future
    await page.click('button:has-text("Pick a date")');
    // ... sélection de date dans le calendrier

    // Aller sur la homepage
    await page.goto('/');

    // Vérifier que l'événement apparaît dans le calendrier
    await expect(page.locator('.calendar-widget')).toContainText('test-note');
  });

  test('should edit tags property', async ({ page }) => {
    await page.goto('/notes/test-note-id');

    // Ajouter la propriété tags
    await page.click('text=Add property');
    await page.click('text=tags');

    // Ajouter des tags
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('important');
    await tagInput.press('Enter');
    await tagInput.fill('urgent');
    await tagInput.press('Enter');

    // Vérifier les badges
    await expect(page.getByText('#important')).toBeVisible();
    await expect(page.getByText('#urgent')).toBeVisible();
  });

  test('should persist metadata after page reload', async ({ page }) => {
    await page.goto('/notes/test-note-id');

    // Ajouter une propriété
    await page.click('text=Add property');
    await page.fill('input[placeholder="Property name"]', 'test_persist');
    await page.click('button:has-text("Create")');

    // Attendre la sauvegarde
    await page.waitForTimeout(1500);

    // Recharger
    await page.reload();

    // Vérifier la persistance
    await expect(page.getByText('test_persist')).toBeVisible();
  });

  test('should sync metadata between collaborators', async ({ browser }) => {
    // Ouvrir deux fenêtres avec des utilisateurs différents
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Login utilisateur 1
    await page1.goto('/login');
    await page1.fill('[data-testid="email"]', 'user1@example.com');
    await page1.fill('[data-testid="password"]', 'password123');
    await page1.click('[data-testid="login-button"]');

    // Login utilisateur 2
    await page2.goto('/login');
    await page2.fill('[data-testid="email"]', 'user2@example.com');
    await page2.fill('[data-testid="password"]', 'password123');
    await page2.click('[data-testid="login-button"]');

    // Les deux ouvrent la même note
    await page1.goto('/notes/shared-note-id');
    await page2.goto('/notes/shared-note-id');

    // User 1 ajoute une propriété
    await page1.click('text=Add property');
    await page1.fill('input[placeholder="Property name"]', 'collab_test');
    await page1.click('button:has-text("Create")');

    // User 2 devrait voir la propriété apparaître
    await expect(page2.getByText('collab_test')).toBeVisible({ timeout: 5000 });

    await context1.close();
    await context2.close();
  });
});
```

---

## 5. Plan d'implémentation

### Ordre des tâches

1. [ ] **Database : Créer les migrations**
    
    - Table `property_definitions`
    - Table `calendar_configs`
    - Colonne `metadata` JSONB sur `notes`
    - Index GIN
2. [ ] **Backend : Module metadata**
    
    - CRUD pour `PropertyDefinition`
    - Validation des métadonnées
    - Schemas Zod
3. [ ] **Backend : Enrichir le module notes**
    
    - `PATCH /notes/:id/metadata`
    - Recherche avec filtres JSONB
4. [ ] **Backend : Compléter le module calendar**
    
    - Requêtes SQL pour extraire les événements
    - Support des différents champs date
5. [ ] **Shared-types : Interfaces metadata**
    
    - `PropertyDefinition`, `NoteMetadata`
    - `MetadataFilter`, `DateRange`
6. [ ] **Frontend : Parser frontmatter**
    
    - Parse/generate YAML
    - Utilitaires de manipulation
7. [ ] **Frontend : Store metadataStore**
    
    - Gestion des définitions
    - Gestion des métadonnées de la note courante
8. [ ] **Frontend : PropertiesPanel**
    
    - Composant principal avec collapse
9. [ ] **Frontend : PropertyField**
    
    - Éditeurs par type (text, date, tags, select...)
10. [ ] **Frontend : AddPropertyPopover**
    
    - Suggestions et création
11. [ ] **Frontend : Synchronisation CRDT**
    
    - Y.Map pour métadonnées
    - Observer pour sync bidirectionnelle
12. [ ] **Frontend : Intégration éditeur**
    
    - Afficher PropertiesPanel dans la sidebar de l'éditeur
    - Sync frontmatter ↔ panneau
13. [ ] **Tests : Suite complète**
    
    - Backend : validation, CRUD
    - Frontend : parser, composants
    - E2E : workflow complet
14. [ ] **Documentation**
    
    - Guide utilisateur pour les propriétés
    - API documentation

### Risques et mitigations

|Risque|Probabilité|Impact|Mitigation|
|---|---|---|---|
|Conflits de sync frontmatter/CRDT|Moyenne|Élevé|Priorité au CRDT, frontmatter régénéré à la save|
|Performance requêtes JSONB|Faible|Moyen|Index GIN + requêtes optimisées|
|UX complexe pour débutants|Moyenne|Moyen|Propriétés suggérées par défaut|
|YAML invalide saisi manuellement|Moyenne|Faible|Validation + feedback visuel|

---

## 6. Notes pour Claude Code

### Commandes à exécuter

```bash
# 1. Installer les dépendances
npm install yaml  # Pour le parsing YAML

# 2. Créer les migrations
cd /path/to/plumenote
npx prisma migrate dev --name add_metadata_system

# 3. Générer le client Prisma
npx prisma generate

# 4. Types partagés
cd packages/shared-types
# Créer src/metadata.ts
npm run build

# 5. Backend
cd ../../apps/api
# Créer src/modules/metadata/
# Modifier src/modules/notes/ et src/modules/calendar/
npm run test -- metadata calendar

# 6. Frontend
cd ../web
# Créer les fichiers dans src/components/editor/
# Créer src/stores/metadataStore.ts
# Créer src/lib/frontmatterParser.ts
npm run test

# 7. Tests E2E
cd ../..
npm run test:e2e -- metadata
```

### Points d'attention

- **Ordre de sync** : CRDT (Y.Map) est la source de vérité, le frontmatter est régénéré
- **Validation** : Valider côté backend ET frontend pour feedback immédiat
- **Performance JSONB** : Utiliser les opérateurs Prisma appropriés (`path`, `array_contains`)
- **Types stricts** : Ne pas utiliser `any`, tout typer explicitement
- **Debounce** : Auto-save avec debounce de 1s pour éviter les requêtes excessives
- **Propriétés par défaut** : Créer `status`, `due_date`, `tags`, `priority` en seed

### Dépendances npm à installer

```bash
# Frontend
npm install yaml  # Parser YAML léger et moderne

# Déjà installées normalement :
# - @radix-ui/react-popover
# - @radix-ui/react-select
# - date-fns ou similaire pour les dates
```

---

## 7. Annexes

### A. Arborescence des fichiers

```
plumenote/
├── prisma/
│   ├── schema.prisma                           # [MODIFIER] Ajouter PropertyDefinition, metadata
│   └── migrations/
│       └── YYYYMMDD_add_metadata_system/       # [CRÉER]
│
├── packages/
│   └── shared-types/
│       └── src/
│           └── metadata.ts                     # [CRÉER] Types metadata
│
├── apps/
│   ├── api/
│   │   └── src/
│   │       └── modules/
│   │           ├── metadata/                   # [CRÉER] Nouveau module
│   │           │   ├── metadata.controller.ts
│   │           │   ├── metadata.service.ts
│   │           │   ├── metadata.schema.ts
│   │           │   └── __tests__/
│   │           │       └── metadata.service.test.ts
│   │           ├── notes/
│   │           │   └── notes.service.ts        # [MODIFIER] Ajouter metadata
│   │           └── calendar/
│   │               └── calendar.service.ts     # [MODIFIER] Implémenter requêtes
│   │
│   └── web/
│       └── src/
│           ├── stores/
│           │   └── metadataStore.ts            # [CRÉER]
│           ├── services/
│           │   └── metadataApi.ts              # [CRÉER]
│           ├── components/
│           │   └── editor/
│           │       ├── PropertiesPanel.tsx     # [CRÉER]
│           │       ├── PropertyField.tsx       # [CRÉER]
│           │       └── AddPropertyPopover.tsx  # [CRÉER]
│           ├── features/
│           │   └── collaboration/
│           │       └── metadataSync.ts         # [CRÉER]
│           └── lib/
│               └── frontmatterParser.ts        # [CRÉER]
│
└── e2e/
    └── metadata.spec.ts                        # [CRÉER]
```

### B. Propriétés par défaut (seed)

```typescript
// prisma/seed.ts (ajout)

const defaultProperties = [
  {
    name: 'status',
    type: 'SELECT',
    description: 'État de la note',
    options: ['todo', 'in-progress', 'done', 'archived'],
    isDefault: true
  },
  {
    name: 'due_date',
    type: 'DATE',
    description: 'Date d\'échéance',
    isDefault: true
  },
  {
    name: 'tags',
    type: 'TAGS',
    description: 'Tags de la note',
    isDefault: true
  },
  {
    name: 'priority',
    type: 'SELECT',
    description: 'Niveau de priorité',
    options: ['low', 'medium', 'high', 'urgent'],
    isDefault: true
  },
  {
    name: 'event_date',
    type: 'DATETIME',
    description: 'Date de l\'événement',
    isDefault: false
  },
  {
    name: 'assignee',
    type: 'TEXT',
    description: 'Personne assignée',
    isDefault: false
  }
];
```

### C. Checklist de validation

- [ ] Les métadonnées sont persistées en BDD (colonne JSONB)
- [ ] Le frontmatter YAML est correctement parsé/généré
- [ ] Le panneau Properties s'affiche dans l'éditeur
- [ ] Tous les types de propriétés fonctionnent (text, date, tags, select...)
- [ ] Les propriétés suggérées apparaissent dans le popover
- [ ] La sync CRDT fonctionne entre collaborateurs
- [ ] Le calendrier affiche les notes avec dates
- [ ] La recherche sur métadonnées fonctionne
- [ ] Les tests passent à 100%