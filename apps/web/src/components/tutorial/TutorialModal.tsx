// ===========================================
// TutorialModal - Tutoriel interactif
// Guide de prise en main pour nouveaux utilisateurs
// ===========================================

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  FileText,
  Search,
  Link2,
  Users,
  Settings,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

// Version actuelle du tutoriel (incrémenter si contenu change)
export const TUTORIAL_VERSION = 1;

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur PlumeNote',
    description:
      "PlumeNote est votre espace de notes collaboratives en Markdown. Organisez vos idées, collaborez en temps réel et créez des connexions entre vos notes.",
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    tips: [
      'Interface intuitive et rapide',
      'Synchronisation en temps réel',
      'Fonctionne hors ligne',
    ],
  },
  {
    id: 'folders',
    title: 'Organisez avec des dossiers',
    description:
      "Créez une hiérarchie de dossiers pour organiser vos notes. Cliquez sur le bouton '+' dans la barre latérale ou faites un clic droit pour créer un nouveau dossier.",
    icon: <FolderPlus className="h-12 w-12 text-blue-500" />,
    tips: [
      "Glissez-déposez pour réorganiser",
      'Colorez vos dossiers pour les différencier',
      'Les dossiers peuvent être imbriqués',
    ],
  },
  {
    id: 'notes',
    title: 'Créez vos notes',
    description:
      "Rédigez en Markdown avec une prévisualisation en temps réel. Utilisez les raccourcis clavier pour formater rapidement votre texte.",
    icon: <FileText className="h-12 w-12 text-green-500" />,
    tips: [
      'Ctrl+B pour gras, Ctrl+I pour italique',
      'Utilisez # pour les titres',
      'Les cases à cocher: - [ ] tâche',
    ],
  },
  {
    id: 'wikilinks',
    title: 'Liez vos notes avec les Wikilinks',
    description:
      "Créez des connexions entre vos notes avec la syntaxe [[nom de la note]]. Tapez [[ pour voir les suggestions de notes existantes.",
    icon: <Link2 className="h-12 w-12 text-purple-500" />,
    tips: [
      'Tapez [[ pour ouvrir la suggestion',
      'Les liens créent un graphe de connaissances',
      'Visualisez les connexions dans la vue Graphe',
    ],
  },
  {
    id: 'search',
    title: 'Recherchez instantanément',
    description:
      "Retrouvez n'importe quelle note en quelques frappes. La recherche full-text parcourt le contenu et les titres de toutes vos notes.",
    icon: <Search className="h-12 w-12 text-orange-500" />,
    tips: [
      'Ctrl+K pour ouvrir la recherche rapide',
      'Filtrez par dossier ou tag',
      'Recherche dans le contenu et les titres',
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaborez en temps réel',
    description:
      "Partagez vos notes et travaillez ensemble. Voyez les modifications de vos collaborateurs en direct avec les curseurs colorés.",
    icon: <Users className="h-12 w-12 text-cyan-500" />,
    tips: [
      'Invitez des collaborateurs par email',
      'Définissez les droits de lecture/écriture',
      'Historique des versions disponible',
    ],
  },
  {
    id: 'settings',
    title: 'Personnalisez votre expérience',
    description:
      "Adaptez PlumeNote à vos préférences : thème clair/sombre, largeur de l'éditeur, raccourcis clavier et bien plus.",
    icon: <Settings className="h-12 w-12 text-gray-500" />,
    tips: [
      'Thème automatique selon votre système',
      'Mode éditeur : WYSIWYG, Markdown ou Split',
      'Sauvegarde automatique configurable',
    ],
  },
  {
    id: 'ready',
    title: 'Vous êtes prêt !',
    description:
      "Vous connaissez maintenant les bases de PlumeNote. Créez votre premier dossier et commencez à prendre des notes. Vous pouvez rejouer ce tutoriel à tout moment depuis le menu utilisateur.",
    icon: <BookOpen className="h-12 w-12 text-primary" />,
    tips: [
      'Explorez le menu ? pour les raccourcis',
      'Consultez la documentation en ligne',
      "N'hésitez pas à expérimenter !",
    ],
  },
];

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function TutorialModal({ open, onOpenChange, onComplete }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = tutorialSteps.length;
  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onOpenChange(false);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-0 shadow-xl focus:outline-none"
          onEscapeKeyDown={handleClose}
        >
          {/* Header avec indicateur de progression */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Étape {currentStep + 1} / {totalSteps}
              </span>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded-full p-1 hover:bg-muted"
                onClick={handleClose}
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Barre de progression */}
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Contenu de l'étape */}
          <div className="px-6 py-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-muted p-4">{step.icon}</div>
              <Dialog.Title className="mb-3 text-2xl font-semibold">
                {step.title}
              </Dialog.Title>
              <Dialog.Description className="mb-6 text-muted-foreground">
                {step.description}
              </Dialog.Description>

              {/* Tips */}
              {step.tips && step.tips.length > 0 && (
                <div className="w-full rounded-lg bg-muted/50 p-4">
                  <ul className="space-y-2 text-left text-sm">
                    {step.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Footer avec navigation */}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div>
              {!isLastStep && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Passer le tutoriel
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Précédent
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLastStep ? (
                  "C'est parti !"
                ) : (
                  <>
                    Suivant
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Indicateurs de points */}
          <div className="flex justify-center gap-1.5 pb-4">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all',
                  index === currentStep
                    ? 'w-4 bg-primary'
                    : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted-foreground/30'
                )}
                aria-label={`Aller à l'étape ${index + 1}`}
              />
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
