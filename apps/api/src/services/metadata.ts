// ===========================================
// Service Métadonnées (P2)
// Gestion des définitions de propriétés et validation
// ===========================================

import { prisma } from '@plumenote/database';
import type {
  PropertyDefinition,
  PropertyType,
  NoteMetadata,
  MetadataValidationResult,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from '@plumenote/types';
import { PropertyType as PrismaPropertyType } from '@prisma/client';

// ----- Conversion Types -----

function toPrismaPropertyType(type: PropertyType): PrismaPropertyType {
  return type.toUpperCase() as PrismaPropertyType;
}

function fromPrismaPropertyType(type: PrismaPropertyType): PropertyType {
  return type.toLowerCase() as PropertyType;
}

function mapPropertyDefinition(def: {
  id: string;
  name: string;
  displayName: string;
  type: PrismaPropertyType;
  description: string | null;
  options: string[];
  isDefault: boolean;
  defaultValue: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  isSystem: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): PropertyDefinition {
  return {
    id: def.id,
    name: def.name,
    displayName: def.displayName,
    type: fromPrismaPropertyType(def.type),
    description: def.description ?? undefined,
    options: def.options,
    isDefault: def.isDefault,
    defaultValue: def.defaultValue ?? undefined,
    icon: def.icon ?? undefined,
    color: def.color ?? undefined,
    position: def.position,
    isSystem: def.isSystem,
    createdById: def.createdById,
    createdAt: def.createdAt.toISOString(),
    updatedAt: def.updatedAt.toISOString(),
  };
}

// ----- Service -----

/**
 * Récupère toutes les définitions de propriétés
 */
export async function getPropertyDefinitions(): Promise<PropertyDefinition[]> {
  const definitions = await prisma.propertyDefinition.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { position: 'asc' },
      { name: 'asc' },
    ],
  });

  return definitions.map(mapPropertyDefinition);
}

/**
 * Récupère une définition par son ID
 */
export async function getPropertyDefinitionById(
  id: string
): Promise<PropertyDefinition | null> {
  const definition = await prisma.propertyDefinition.findUnique({
    where: { id },
  });

  return definition ? mapPropertyDefinition(definition) : null;
}

/**
 * Récupère une définition par son nom
 */
export async function getPropertyDefinitionByName(
  name: string
): Promise<PropertyDefinition | null> {
  const definition = await prisma.propertyDefinition.findUnique({
    where: { name },
  });

  return definition ? mapPropertyDefinition(definition) : null;
}

/**
 * Crée une nouvelle définition de propriété
 */
export async function createPropertyDefinition(
  data: CreatePropertyRequest,
  userId: string
): Promise<PropertyDefinition> {
  // Calculer la position max
  const maxPosition = await prisma.propertyDefinition.aggregate({
    _max: { position: true },
  });

  const definition = await prisma.propertyDefinition.create({
    data: {
      name: data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      displayName: data.displayName,
      type: toPrismaPropertyType(data.type),
      description: data.description,
      options: data.options ?? [],
      isDefault: data.isDefault ?? false,
      defaultValue: data.defaultValue,
      icon: data.icon,
      color: data.color,
      position: (maxPosition._max.position ?? -1) + 1,
      createdById: userId,
    },
  });

  return mapPropertyDefinition(definition);
}

/**
 * Met à jour une définition de propriété
 */
export async function updatePropertyDefinition(
  id: string,
  data: UpdatePropertyRequest
): Promise<PropertyDefinition | null> {
  const existing = await prisma.propertyDefinition.findUnique({
    where: { id },
  });

  if (!existing) return null;

  // Empêcher la modification des propriétés système
  if (existing.isSystem && (data.name || data.type)) {
    throw new Error('Cannot modify name or type of system properties');
  }

  const updated = await prisma.propertyDefinition.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_') }),
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.type && { type: toPrismaPropertyType(data.type) }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.options && { options: data.options }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.defaultValue !== undefined && { defaultValue: data.defaultValue }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.position !== undefined && { position: data.position }),
    },
  });

  return mapPropertyDefinition(updated);
}

/**
 * Supprime une définition de propriété
 */
export async function deletePropertyDefinition(id: string): Promise<boolean> {
  const existing = await prisma.propertyDefinition.findUnique({
    where: { id },
  });

  if (!existing) return false;

  // Empêcher la suppression des propriétés système
  if (existing.isSystem) {
    throw new Error('Cannot delete system properties');
  }

  await prisma.propertyDefinition.delete({
    where: { id },
  });

  return true;
}

/**
 * Valide les métadonnées selon les définitions existantes
 */
export async function validateMetadata(
  metadata: NoteMetadata
): Promise<MetadataValidationResult> {
  const definitions = await getPropertyDefinitions();
  const definitionMap = new Map(definitions.map((d) => [d.name, d]));

  const errors: string[] = [];
  const warnings: string[] = [];
  const normalizedMetadata: NoteMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Ignorer les valeurs null/undefined
    if (value === null || value === undefined) {
      continue;
    }

    const definition = definitionMap.get(key);

    if (!definition) {
      // Propriété non définie - on la garde mais avec warning
      warnings.push(`Property "${key}" is not defined in schema`);
      normalizedMetadata[key] = value;
      continue;
    }

    const validation = validateValue(value, definition);

    if (!validation.valid) {
      errors.push(`Property "${key}": ${validation.error}`);
    } else {
      normalizedMetadata[key] = validation.normalizedValue ?? value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedMetadata,
  };
}

/**
 * Valide une valeur selon le type de propriété
 */
function validateValue(
  value: unknown,
  definition: PropertyDefinition
): { valid: boolean; error?: string; normalizedValue?: unknown } {
  switch (definition.type) {
    case 'text':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string' };
      }
      return { valid: true };

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: 'Expected number' };
      }
      return { valid: true, normalizedValue: num };

    case 'date':
      if (!isValidDate(String(value))) {
        return { valid: false, error: 'Expected date (YYYY-MM-DD)' };
      }
      return { valid: true };

    case 'datetime':
      if (!isValidDateTime(String(value))) {
        return { valid: false, error: 'Expected datetime (ISO 8601)' };
      }
      return { valid: true };

    case 'checkbox':
      if (typeof value === 'boolean') {
        return { valid: true };
      }
      if (value === 'true') return { valid: true, normalizedValue: true };
      if (value === 'false') return { valid: true, normalizedValue: false };
      return { valid: false, error: 'Expected boolean' };

    case 'tags':
      if (!Array.isArray(value)) {
        // Accepter une string unique et la convertir en tableau
        if (typeof value === 'string') {
          return { valid: true, normalizedValue: [value] };
        }
        return { valid: false, error: 'Expected array of strings' };
      }
      if (!value.every((v) => typeof v === 'string')) {
        return { valid: false, error: 'All tags must be strings' };
      }
      return { valid: true };

    case 'select':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string' };
      }
      if (definition.options.length > 0 && !definition.options.includes(value)) {
        return {
          valid: false,
          error: `Value must be one of: ${definition.options.join(', ')}`,
        };
      }
      return { valid: true };

    case 'multiselect':
      if (!Array.isArray(value)) {
        return { valid: false, error: 'Expected array' };
      }
      if (definition.options.length > 0) {
        const invalid = value.filter((v) => !definition.options.includes(String(v)));
        if (invalid.length > 0) {
          return {
            valid: false,
            error: `Invalid values: ${invalid.join(', ')}`,
          };
        }
      }
      return { valid: true };

    case 'link':
      if (typeof value !== 'string') {
        return { valid: false, error: 'Expected string (note ID or wikilink)' };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
}

function isValidDate(value: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Met à jour les métadonnées d'une note
 */
export async function updateNoteMetadata(
  noteId: string,
  metadata: NoteMetadata
): Promise<{ success: boolean; errors?: string[] }> {
  // Valider les métadonnées
  const validation = await validateMetadata(metadata);

  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Mettre à jour la note avec les métadonnées validées
  await prisma.note.update({
    where: { id: noteId },
    data: {
      frontmatter: validation.normalizedMetadata,
    },
  });

  return { success: true };
}

/**
 * Récupère les notes avec un filtre sur les métadonnées
 */
export async function searchNotesByMetadata(
  filters: Array<{
    field: string;
    operator: string;
    value?: unknown;
  }>,
  options: { limit?: number; offset?: number } = {}
): Promise<{ id: string; title: string; frontmatter: NoteMetadata }[]> {
  const { limit = 20, offset = 0 } = options;

  // Construire les conditions Prisma pour JSONB
  const whereConditions: object[] = [];

  for (const filter of filters) {
    switch (filter.operator) {
      case 'equals':
        whereConditions.push({
          frontmatter: { path: [filter.field], equals: filter.value },
        });
        break;
      case 'contains':
        whereConditions.push({
          frontmatter: { path: [filter.field], string_contains: String(filter.value) },
        });
        break;
      case 'gt':
        whereConditions.push({
          frontmatter: { path: [filter.field], gt: filter.value },
        });
        break;
      case 'gte':
        whereConditions.push({
          frontmatter: { path: [filter.field], gte: filter.value },
        });
        break;
      case 'lt':
        whereConditions.push({
          frontmatter: { path: [filter.field], lt: filter.value },
        });
        break;
      case 'lte':
        whereConditions.push({
          frontmatter: { path: [filter.field], lte: filter.value },
        });
        break;
    }
  }

  const notes = await prisma.note.findMany({
    where: {
      isDeleted: false,
      AND: whereConditions,
    },
    select: {
      id: true,
      title: true,
      frontmatter: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    frontmatter: n.frontmatter as NoteMetadata,
  }));
}

/**
 * Initialise les propriétés système par défaut
 */
export async function initializeDefaultProperties(systemUserId: string): Promise<void> {
  const defaultProperties: Array<Omit<CreatePropertyRequest, 'createdById'> & { isSystem: boolean }> = [
    {
      name: 'status',
      displayName: 'Status',
      type: 'select',
      description: 'État de la note',
      options: ['todo', 'in-progress', 'done', 'archived'],
      isDefault: true,
      icon: 'circle-dot',
      isSystem: true,
    },
    {
      name: 'priority',
      displayName: 'Priority',
      type: 'select',
      description: 'Niveau de priorité',
      options: ['low', 'medium', 'high', 'urgent'],
      isDefault: true,
      icon: 'flag',
      isSystem: true,
    },
    {
      name: 'due_date',
      displayName: 'Due Date',
      type: 'date',
      description: "Date d'échéance",
      isDefault: true,
      icon: 'calendar-clock',
      isSystem: true,
    },
    {
      name: 'event_date',
      displayName: 'Event Date',
      type: 'datetime',
      description: "Date de l'événement",
      isDefault: false,
      icon: 'calendar',
      isSystem: true,
    },
    {
      name: 'start_date',
      displayName: 'Start Date',
      type: 'date',
      description: 'Date de début',
      isDefault: false,
      icon: 'calendar-plus',
      isSystem: true,
    },
    {
      name: 'end_date',
      displayName: 'End Date',
      type: 'date',
      description: 'Date de fin',
      isDefault: false,
      icon: 'calendar-minus',
      isSystem: true,
    },
  ];

  for (const prop of defaultProperties) {
    const existing = await prisma.propertyDefinition.findUnique({
      where: { name: prop.name },
    });

    if (!existing) {
      await prisma.propertyDefinition.create({
        data: {
          name: prop.name,
          displayName: prop.displayName,
          type: toPrismaPropertyType(prop.type),
          description: prop.description,
          options: prop.options ?? [],
          isDefault: prop.isDefault ?? false,
          defaultValue: prop.defaultValue,
          icon: prop.icon,
          isSystem: prop.isSystem,
          createdById: systemUserId,
        },
      });
    }
  }
}
