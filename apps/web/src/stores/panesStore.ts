// ===========================================
// Store Panes - Split View (Zustand)
// Gestion des panneaux divisibles
// ===========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SplitDirection = 'horizontal' | 'vertical';

export interface PaneLeaf {
  type: 'leaf';
  id: string;
  noteId: string | null;
}

export interface PaneSplit {
  type: 'split';
  id: string;
  direction: SplitDirection;
  children: [PaneNode, PaneNode];
  ratio: number;
}

export type PaneNode = PaneLeaf | PaneSplit;

// Generate unique IDs
let paneIdCounter = 0;
function generatePaneId(): string {
  return `pane-${Date.now()}-${++paneIdCounter}`;
}

function createLeaf(noteId: string | null = null): PaneLeaf {
  return {
    type: 'leaf',
    id: generatePaneId(),
    noteId,
  };
}

// Recursive tree operations
function updatePaneInTree(
  node: PaneNode,
  targetId: string,
  updater: (pane: PaneLeaf) => PaneLeaf
): PaneNode {
  if (node.type === 'leaf') {
    return node.id === targetId ? updater(node) : node;
  }
  return {
    ...node,
    children: node.children.map((child) =>
      updatePaneInTree(child, targetId, updater)
    ) as [PaneNode, PaneNode],
  };
}

function splitPaneInTree(
  node: PaneNode,
  targetId: string,
  direction: SplitDirection
): PaneNode {
  if (node.type === 'leaf') {
    if (node.id === targetId) {
      return {
        type: 'split',
        id: generatePaneId(),
        direction,
        children: [node, createLeaf()],
        ratio: 0.5,
      };
    }
    return node;
  }
  return {
    ...node,
    children: node.children.map((child) =>
      splitPaneInTree(child, targetId, direction)
    ) as [PaneNode, PaneNode],
  };
}

function closePaneInTree(node: PaneNode, targetId: string): PaneNode {
  if (node.type === 'leaf') return node;

  const [first, second] = node.children;

  // If one child is the target, return the other
  if (first.type === 'leaf' && first.id === targetId) return second;
  if (second.type === 'leaf' && second.id === targetId) return first;

  // Otherwise, recurse
  return {
    ...node,
    children: [
      closePaneInTree(first, targetId),
      closePaneInTree(second, targetId),
    ] as [PaneNode, PaneNode],
  };
}

function updateSplitRatio(
  node: PaneNode,
  splitId: string,
  ratio: number
): PaneNode {
  if (node.type === 'leaf') return node;

  if (node.id === splitId) {
    return { ...node, ratio };
  }

  return {
    ...node,
    children: node.children.map((child) =>
      updateSplitRatio(child, splitId, ratio)
    ) as [PaneNode, PaneNode],
  };
}

function findFirstLeaf(node: PaneNode): PaneLeaf | null {
  if (node.type === 'leaf') return node;
  return findFirstLeaf(node.children[0]);
}

function countLeaves(node: PaneNode): number {
  if (node.type === 'leaf') return 1;
  return countLeaves(node.children[0]) + countLeaves(node.children[1]);
}

interface PanesState {
  root: PaneNode;
  activePaneId: string;

  // Actions
  setActivePane: (id: string) => void;
  openNoteInPane: (paneId: string, noteId: string) => void;
  openNoteInActivePane: (noteId: string) => void;
  splitPane: (paneId: string, direction: SplitDirection) => void;
  closePane: (paneId: string) => void;
  updateRatio: (splitId: string, ratio: number) => void;
  resetPanes: () => void;
  canClosePane: () => boolean;
  getPaneCount: () => number;
}

const initialRoot = createLeaf();

export const usePanesStore = create<PanesState>()(
  persist(
    (set, get) => ({
      root: initialRoot,
      activePaneId: initialRoot.id,

      setActivePane: (id) => set({ activePaneId: id }),

      openNoteInPane: (paneId, noteId) => {
        set((state) => ({
          root: updatePaneInTree(state.root, paneId, (pane) => ({
            ...pane,
            noteId,
          })),
        }));
      },

      openNoteInActivePane: (noteId) => {
        const { activePaneId, openNoteInPane } = get();
        openNoteInPane(activePaneId, noteId);
      },

      splitPane: (paneId, direction) => {
        set((state) => {
          const newRoot = splitPaneInTree(state.root, paneId, direction);
          // Find the new pane created by the split
          const newPane = findNewLeaf(state.root, newRoot);
          return {
            root: newRoot,
            activePaneId: newPane?.id || state.activePaneId,
          };
        });
      },

      closePane: (paneId) => {
        const { root, activePaneId } = get();
        if (root.type === 'leaf') return;

        const newRoot = closePaneInTree(root, paneId);
        const newActiveId =
          activePaneId === paneId
            ? findFirstLeaf(newRoot)?.id || activePaneId
            : activePaneId;

        set({
          root: newRoot,
          activePaneId: newActiveId,
        });
      },

      updateRatio: (splitId, ratio) => {
        const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));
        set((state) => ({
          root: updateSplitRatio(state.root, splitId, clampedRatio),
        }));
      },

      resetPanes: () => {
        const newRoot = createLeaf();
        set({ root: newRoot, activePaneId: newRoot.id });
      },

      canClosePane: () => {
        return get().root.type !== 'leaf';
      },

      getPaneCount: () => {
        return countLeaves(get().root);
      },
    }),
    {
      name: 'collabnotes-panes',
      partialize: (state) => ({
        root: state.root,
        activePaneId: state.activePaneId,
      }),
    }
  )
);

// Helper to find new leaf after split
function findNewLeaf(oldRoot: PaneNode, newRoot: PaneNode): PaneLeaf | null {
  const oldLeaves = new Set<string>();
  collectLeafIds(oldRoot, oldLeaves);

  function findNew(node: PaneNode): PaneLeaf | null {
    if (node.type === 'leaf') {
      return !oldLeaves.has(node.id) ? node : null;
    }
    return findNew(node.children[0]) || findNew(node.children[1]);
  }

  return findNew(newRoot);
}

function collectLeafIds(node: PaneNode, set: Set<string>): void {
  if (node.type === 'leaf') {
    set.add(node.id);
  } else {
    collectLeafIds(node.children[0], set);
    collectLeafIds(node.children[1], set);
  }
}
