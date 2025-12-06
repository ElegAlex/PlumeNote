// ===========================================
// Store Right Panel (Zustand)
// Gestion du panneau droit (Plan, Liens, etc.)
// ===========================================

import { create } from 'zustand';

export type RightPanelView = 'toc' | 'links' | null;

interface RightPanelState {
  view: RightPanelView;
  isOpen: boolean;

  openPanel: (view: RightPanelView) => void;
  closePanel: () => void;
  togglePanel: (view: RightPanelView) => void;
}

export const useRightPanelStore = create<RightPanelState>((set, get) => ({
  view: null,
  isOpen: false,

  openPanel: (view) => set({ view, isOpen: true }),

  closePanel: () => set({ view: null, isOpen: false }),

  togglePanel: (view) => {
    const { isOpen, view: currentView } = get();
    if (isOpen && currentView === view) {
      set({ view: null, isOpen: false });
    } else {
      set({ view, isOpen: true });
    }
  },
}));
