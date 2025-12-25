// ===========================================
// Tests composant ShortcutsPage - P3
// ===========================================

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ShortcutsPage } from '../ShortcutsPage';

const renderPage = () => {
  return render(
    <BrowserRouter>
      <ShortcutsPage />
    </BrowserRouter>
  );
};

describe('ShortcutsPage', () => {
  it('should render the page title', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Raccourcis clavier' })).toBeInTheDocument();
  });

  it('should render the search input', () => {
    renderPage();
    expect(
      screen.getByPlaceholderText('Rechercher un raccourci...')
    ).toBeInTheDocument();
  });

  it('should have the correct test id', () => {
    renderPage();
    expect(screen.getByTestId('shortcuts-page')).toBeInTheDocument();
  });

  it('should display all categories initially', () => {
    renderPage();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Éditeur - Formatage')).toBeInTheDocument();
    expect(screen.getByText('Éditeur - Actions')).toBeInTheDocument();
    expect(screen.getByText('Éditeur - Titres')).toBeInTheDocument();
  });

  it('should display the total shortcut count', () => {
    renderPage();
    // Le texte contient "XX raccourcis disponibles"
    expect(screen.getByText(/raccourcis disponibles/)).toBeInTheDocument();
  });

  it('should filter shortcuts on search', () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText('Rechercher un raccourci...');
    fireEvent.change(searchInput, { target: { value: 'gras' } });

    expect(screen.getByText('Gras')).toBeInTheDocument();
  });

  it('should show no results message for invalid search', () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText('Rechercher un raccourci...');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByTestId('no-results')).toBeInTheDocument();
    expect(screen.getByText(/Aucun raccourci trouvé/)).toBeInTheDocument();
  });

  it('should clear search and show all shortcuts again', () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText('Rechercher un raccourci...');

    // Search
    fireEvent.change(searchInput, { target: { value: 'gras' } });
    expect(screen.getByText('Gras')).toBeInTheDocument();

    // Clear
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Éditeur - Formatage')).toBeInTheDocument();
  });

  it('should display keyboard key symbols', () => {
    const { container } = renderPage();
    // Les touches sont rendues avec le composant KeyboardKey (élément kbd)
    const kbdElements = container.querySelectorAll('kbd');
    expect(kbdElements.length).toBeGreaterThan(0);
  });

  it('should have sticky header', () => {
    renderPage();
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky');
  });
});
