// ===========================================
// Tests Composants - NoteItem
// P0: Tests pour le composant de note
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useParams } from 'react-router-dom';
import { NoteItem } from '../NoteItem';
import type { NotePreview } from '@plumenote/types';

// Mock navigation
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(() => ({ noteId: undefined })),
  };
});

// Mock du store
const mockSelectNote = vi.fn();

vi.mock('../../../stores/sidebarStore', () => ({
  useSidebarStore: (selector: (state: unknown) => unknown) => {
    const state = {
      selectNote: mockSelectNote,
      tree: [],
      refreshFolder: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../stores/folders', () => ({
  useFoldersStore: (selector: (state: unknown) => unknown) => {
    const state = {
      moveNote: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../stores/panesStore', () => ({
  usePanesStore: (selector: (state: unknown) => unknown) => {
    const state = {
      openNoteInActivePane: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// Helper pour créer un mock de note
function createMockNote(overrides: Partial<NotePreview> = {}): NotePreview {
  return {
    id: 'note-1',
    title: 'Test Note',
    slug: 'test-note',
    position: 0,
    updatedAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T08:00:00Z',
    ...overrides,
  };
}

// Wrapper pour les tests - utilise le wrapper de testing-library
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

function renderWithRouter(ui: React.ReactElement) {
  return render(ui, { wrapper: RouterWrapper });
}

describe('NoteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ noteId: undefined });
  });

  describe('Rendering', () => {
    it('should render note title', () => {
      const note = createMockNote({ title: 'My Important Note' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      expect(screen.getByText('My Important Note')).toBeInTheDocument();
    });

    it('should render note icon', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={0} />);

      // Vérifier que l'icône de note est présente
      const noteIcon = screen.getByRole('button', { name: /Note/ }).querySelector('svg');
      expect(noteIcon).toBeInTheDocument();
    });

    it('should truncate long titles', () => {
      const note = createMockNote({
        title: 'This is a very long note title that should be truncated when displayed in the sidebar',
      });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const titleElement = screen.getByText(/This is a very long/);
      expect(titleElement).toHaveClass('truncate');
    });
  });

  describe('Indentation', () => {
    it('should apply correct padding for level 0', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveStyle({ paddingLeft: '8px' }); // 0 * 16 + 8
    });

    it('should apply correct padding for level 1', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={1} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveStyle({ paddingLeft: '24px' }); // 1 * 16 + 8
    });

    it('should apply correct padding for level 2 (matching FolderItem)', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={2} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveStyle({ paddingLeft: '40px' }); // 2 * 16 + 8
    });

    it('should have same indentation as FolderItem at same level', () => {
      // Ce test vérifie que NoteItem utilise la même constante INDENT_PER_LEVEL
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={3} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      // 3 * 16 + 8 = 56px, identique à FolderItem
      expect(noteElement).toHaveStyle({ paddingLeft: '56px' });
    });
  });

  describe('Interactions', () => {
    it('should navigate to note on click', () => {
      const note = createMockNote({ id: 'note-123' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      fireEvent.click(screen.getByRole('button', { name: /Note/ }));

      expect(mockNavigate).toHaveBeenCalledWith('/notes/note-123');
    });

    it('should call selectNote on click', () => {
      const note = createMockNote({ id: 'note-456' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      fireEvent.click(screen.getByRole('button', { name: /Note/ }));

      expect(mockSelectNote).toHaveBeenCalledWith('note-456');
    });

    it('should respond to Enter key', () => {
      const note = createMockNote({ id: 'note-enter' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      fireEvent.keyDown(noteElement, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith('/notes/note-enter');
    });

    it('should respond to Space key', () => {
      const note = createMockNote({ id: 'note-space' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      fireEvent.keyDown(noteElement, { key: ' ' });

      expect(mockNavigate).toHaveBeenCalledWith('/notes/note-space');
    });
  });

  describe('Active State', () => {
    it('should show active state when note is current', () => {
      vi.mocked(useParams).mockReturnValue({ noteId: 'active-note' });
      const note = createMockNote({ id: 'active-note' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveClass('bg-accent');
      expect(noteElement).toHaveClass('font-medium');
    });

    it('should not show active state when note is not current', () => {
      vi.mocked(useParams).mockReturnValue({ noteId: 'other-note' });
      const note = createMockNote({ id: 'inactive-note' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).not.toHaveClass('font-medium');
    });

    it('should have aria-current when active', () => {
      vi.mocked(useParams).mockReturnValue({ noteId: 'current-note' });
      const note = createMockNote({ id: 'current-note' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveAttribute('aria-current', 'page');
    });

    it('should not have aria-current when inactive', () => {
      vi.mocked(useParams).mockReturnValue({ noteId: 'other' });
      const note = createMockNote({ id: 'not-current' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).not.toHaveAttribute('aria-current');
    });
  });

  describe('Accessibility', () => {
    it('should have correct role', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={0} />);

      expect(screen.getByRole('treeitem')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      const note = createMockNote({ title: 'Meeting Notes' });

      renderWithRouter(<NoteItem note={note} level={0} />);

      expect(
        screen.getByRole('button', { name: 'Note Meeting Notes' })
      ).toBeInTheDocument();
    });

    it('should be focusable', () => {
      const note = createMockNote();

      renderWithRouter(<NoteItem note={note} level={0} />);

      const noteElement = screen.getByRole('button', { name: /Note/ });
      expect(noteElement).toHaveAttribute('tabIndex', '0');
    });
  });
});

describe('NoteItem visual alignment', () => {
  it('should have spacer element for chevron alignment', () => {
    const note = createMockNote();

    renderWithRouter(<NoteItem note={note} level={0} />);

    // Le spacer doit être présent pour aligner avec les chevrons des dossiers
    const noteButton = screen.getByRole('button', { name: /Note/ });
    const spacer = noteButton.querySelector('span.w-4.h-4');
    expect(spacer).toBeInTheDocument();
  });
});
