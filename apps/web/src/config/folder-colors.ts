// ===========================================
// Palette de couleurs pour les dossiers racines
// Couleurs pastels douces pour différencier visuellement
// ===========================================

export interface FolderColor {
  name: string;
  /** Couleur pour l'icône et la bordure */
  accent: string;
  /** Couleur de fond légère */
  background: string;
  /** Couleur de fond au hover */
  backgroundHover: string;
}

/**
 * Palette de 8 couleurs pastels pour les dossiers racines
 * Les couleurs sont conçues pour être douces et agréables
 */
export const FOLDER_PASTEL_COLORS: FolderColor[] = [
  {
    name: 'blue',
    accent: '#3b82f6',
    background: 'rgba(59, 130, 246, 0.08)',
    backgroundHover: 'rgba(59, 130, 246, 0.15)',
  },
  {
    name: 'purple',
    accent: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.08)',
    backgroundHover: 'rgba(139, 92, 246, 0.15)',
  },
  {
    name: 'pink',
    accent: '#ec4899',
    background: 'rgba(236, 72, 153, 0.08)',
    backgroundHover: 'rgba(236, 72, 153, 0.15)',
  },
  {
    name: 'orange',
    accent: '#f97316',
    background: 'rgba(249, 115, 22, 0.08)',
    backgroundHover: 'rgba(249, 115, 22, 0.15)',
  },
  {
    name: 'green',
    accent: '#22c55e',
    background: 'rgba(34, 197, 94, 0.08)',
    backgroundHover: 'rgba(34, 197, 94, 0.15)',
  },
  {
    name: 'teal',
    accent: '#14b8a6',
    background: 'rgba(20, 184, 166, 0.08)',
    backgroundHover: 'rgba(20, 184, 166, 0.15)',
  },
  {
    name: 'cyan',
    accent: '#06b6d4',
    background: 'rgba(6, 182, 212, 0.08)',
    backgroundHover: 'rgba(6, 182, 212, 0.15)',
  },
  {
    name: 'amber',
    accent: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.08)',
    backgroundHover: 'rgba(245, 158, 11, 0.15)',
  },
];

/**
 * Récupère la couleur d'un dossier racine par son index
 * @param index Index du dossier dans la liste racine (0-based)
 * @returns La couleur correspondante (cycle si plus de 8 dossiers)
 */
export function getRootFolderColor(index: number): FolderColor {
  const colorIndex = Math.abs(index) % FOLDER_PASTEL_COLORS.length;
  // TypeScript ne peut pas inférer que le tableau n'est jamais vide
  // donc on utilise une assertion non-null car on a toujours 8 couleurs
  return FOLDER_PASTEL_COLORS[colorIndex]!;
}

/**
 * Trouve une couleur par son nom
 */
export function getFolderColorByName(name: string): FolderColor | undefined {
  return FOLDER_PASTEL_COLORS.find((c) => c.name === name);
}
