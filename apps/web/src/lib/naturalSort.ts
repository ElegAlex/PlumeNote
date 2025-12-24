// ===========================================
// FEAT-03: Utilitaire de tri alphanumérique naturel
// Gère correctement "Note 2" < "Note 10"
// ===========================================

/**
 * Comparateur pour tri alphanumérique naturel
 * Utilise Intl.Collator pour un tri correct des accents et nombres
 */
export function naturalCompare(a: string, b: string): number {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return collator.compare(a, b);
}

/**
 * Trie un tableau d'objets par une propriété avec tri naturel
 */
export function naturalSortBy<T>(
  array: T[],
  key: keyof T | ((item: T) => string)
): T[] {
  const getKey = typeof key === 'function' ? key : (item: T) => String(item[key]);
  return [...array].sort((a, b) => naturalCompare(getKey(a), getKey(b)));
}

/**
 * Trie récursivement les dossiers et leurs enfants/notes
 */
export function sortFoldersRecursively<T extends { name: string; children?: T[]; notes?: Array<{ title: string }> }>(
  folders: T[]
): T[] {
  return naturalSortBy(folders, 'name').map(folder => ({
    ...folder,
    children: folder.children ? sortFoldersRecursively(folder.children) : undefined,
    notes: folder.notes ? naturalSortBy(folder.notes, 'title') : undefined,
  })) as T[];
}
