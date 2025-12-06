// ===========================================
// Tests Composants - HelpMenu
// Menu d'aide avec Statistiques et Raccourcis
// ===========================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelpMenu } from '../HelpMenu';

// Mock de navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper pour les tests
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('HelpMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render help button with icon', () => {
      renderWithRouter(<HelpMenu />);

      const button = screen.getByTestId('help-menu-trigger');
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Aide')).toBeInTheDocument();
    });

    it('should only show icon when collapsed', () => {
      renderWithRouter(<HelpMenu isCollapsed />);

      const button = screen.getByTestId('help-menu-trigger');
      expect(button).toBeInTheDocument();
      expect(screen.queryByText('Aide')).not.toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('should show all menu items when opened', async () => {
      renderWithRouter(<HelpMenu />);

      fireEvent.click(screen.getByTestId('help-menu-trigger'));

      expect(screen.getByTestId('help-menu-settings')).toBeInTheDocument();
      expect(screen.getByTestId('help-menu-statistics')).toBeInTheDocument();
      expect(screen.getByTestId('help-menu-shortcuts')).toBeInTheDocument();
    });

    it('should navigate to dashboard when clicking Statistics', async () => {
      renderWithRouter(<HelpMenu />);

      fireEvent.click(screen.getByTestId('help-menu-trigger'));
      fireEvent.click(screen.getByTestId('help-menu-statistics'));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      renderWithRouter(<HelpMenu />);

      const button = screen.getByTestId('help-menu-trigger');
      expect(button).toHaveAttribute('aria-label', 'Menu aide');
    });
  });
});
