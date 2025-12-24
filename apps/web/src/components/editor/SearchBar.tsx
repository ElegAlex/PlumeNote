// ===========================================
// FEAT-07: Barre de recherche/remplacement
// UI pour l'extension SearchReplace
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SearchBarProps {
  editor: Editor | null;
  isOpen: boolean;
  showReplace?: boolean;
  onClose: () => void;
}

// Icons inline pour éviter une dépendance supplémentaire
const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CaseSensitiveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <text x="4" y="17" fontSize="14" fontWeight="bold" fill="currentColor">Aa</text>
  </svg>
);

const WholeWordIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <text x="2" y="17" fontSize="12" fontWeight="bold" fill="currentColor">[ab]</text>
  </svg>
);

const RegexIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <text x="4" y="17" fontSize="14" fontWeight="bold" fill="currentColor">.*</text>
  </svg>
);

const ReplaceIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export function SearchBar({ editor, isOpen, showReplace = false, onClose }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [replaceVisible, setReplaceVisible] = useState(showReplace);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus sur l'input quand la barre s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Petit délai pour laisser le composant se monter
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Mettre à jour replaceVisible quand showReplace change
  useEffect(() => {
    setReplaceVisible(showReplace);
  }, [showReplace]);

  // Sync avec l'extension
  useEffect(() => {
    if (editor && isOpen) {
      editor.commands.setSearchTerm(searchTerm);
    }
  }, [searchTerm, editor, isOpen]);

  useEffect(() => {
    if (editor) {
      editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm, editor]);

  useEffect(() => {
    if (editor) {
      editor.commands.setCaseSensitive(caseSensitive);
    }
  }, [caseSensitive, editor]);

  useEffect(() => {
    if (editor) {
      editor.commands.setWholeWord(wholeWord);
    }
  }, [wholeWord, editor]);

  useEffect(() => {
    if (editor) {
      editor.commands.setUseRegex(useRegex);
    }
  }, [useRegex, editor]);

  // Récupérer le storage de l'extension
  const storage = editor?.storage?.searchReplace;
  const resultCount = storage?.results?.length || 0;
  const currentIndex = storage?.currentIndex ?? -1;

  const handleClose = useCallback(() => {
    editor?.commands.clearSearch();
    setSearchTerm('');
    setReplaceTerm('');
    onClose();
  }, [editor, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      editor?.commands.goToNextResult();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      editor?.commands.goToPrevResult();
    }
  };

  const handleReplace = () => {
    editor?.commands.replace();
    // Revalider la recherche après remplacement
    if (searchTerm) {
      editor?.commands.setSearchTerm(searchTerm);
    }
  };

  const handleReplaceAll = () => {
    editor?.commands.replaceAll();
  };

  if (!isOpen || !editor) return null;

  return (
    <div className="fixed top-16 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 w-80">
      {/* Barre de recherche */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher..."
          className="flex-1 h-8"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[40px] text-right">
          {resultCount > 0 ? `${currentIndex + 1}/${resultCount}` : '0/0'}
        </span>
      </div>

      {/* Options de recherche */}
      <div className="flex items-center gap-1 mb-2">
        <Button
          variant={caseSensitive ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Sensible à la casse (Aa)"
        >
          <CaseSensitiveIcon />
        </Button>
        <Button
          variant={wholeWord ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setWholeWord(!wholeWord)}
          title="Mot entier"
        >
          <WholeWordIcon />
        </Button>
        <Button
          variant={useRegex ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setUseRegex(!useRegex)}
          title="Expression régulière (.*)"
        >
          <RegexIcon />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor.commands.goToPrevResult()}
          disabled={resultCount === 0}
          title="Précédent (Shift+Enter)"
        >
          <ChevronUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => editor.commands.goToNextResult()}
          disabled={resultCount === 0}
          title="Suivant (Enter)"
        >
          <ChevronDownIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleClose}
          title="Fermer (Échap)"
        >
          <XIcon />
        </Button>
      </div>

      {/* Toggle pour afficher/masquer le remplacement */}
      <button
        className={cn(
          'w-full text-left text-xs py-1 px-2 rounded hover:bg-muted transition-colors',
          replaceVisible && 'bg-muted'
        )}
        onClick={() => setReplaceVisible(!replaceVisible)}
      >
        {replaceVisible ? '▼' : '▶'} Remplacer
      </button>

      {/* Barre de remplacement */}
      {replaceVisible && (
        <div className="mt-2 space-y-2">
          <Input
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Remplacer par..."
            className="h-8"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplace}
              disabled={resultCount === 0 || !replaceTerm}
              className="flex-1 h-7 text-xs"
            >
              <ReplaceIcon />
              <span className="ml-1">Remplacer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplaceAll}
              disabled={resultCount === 0 || !replaceTerm}
              className="flex-1 h-7 text-xs"
            >
              <ReplaceIcon />
              <span className="ml-1">Tout ({resultCount})</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
