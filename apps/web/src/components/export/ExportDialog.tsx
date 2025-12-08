// ===========================================
// Dialog Export Note (Sprint 4)
// US-080: Export en Markdown
// US-081: Export en PDF
// ===========================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Checkbox } from '../ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { toast } from 'sonner';
import { FileText, FileJson, FileArchive, Download } from 'lucide-react';
import { exportNoteAsMarkdown, downloadText, downloadBlob } from '../../services/exportApi';
import { exportNoteToPdf, type PdfExportOptions } from '../../services/pdfExport';

export type ExportFormat = 'markdown' | 'pdf' | 'json';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    id: string;
    title: string;
    slug: string;
    content: string;
    author?: { displayName: string };
    createdAt?: string;
    updatedAt?: string;
    tags?: { tag: { name: string } }[];
  };
  editorElement?: HTMLElement | null;
}

const FORMAT_OPTIONS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Format texte avec syntaxe Markdown (.md)',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Document formaté pour impression (.pdf)',
    icon: <FileArchive className="h-5 w-5" />,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Données structurées (.json)',
    icon: <FileJson className="h-5 w-5" />,
  },
];

const PAGE_SIZES = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'legal', label: 'Legal' },
];

const ORIENTATIONS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Paysage' },
];

export function ExportDialog({
  open,
  onOpenChange,
  note,
  editorElement,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  // Options Markdown
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Options PDF
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      switch (format) {
        case 'markdown': {
          const markdown = await exportNoteAsMarkdown(note.id, includeMetadata);
          downloadText(markdown, `${note.slug}.md`, 'text/markdown');
          toast.success('Note exportée en Markdown');
          break;
        }

        case 'pdf': {
          const pdfOptions: PdfExportOptions = {
            title: note.title,
            filename: `${note.slug}.pdf`,
            pageSize,
            orientation,
            includeHeader,
            includeFooter,
          };

          // Use editor content if available, otherwise use note content
          const content = editorElement?.innerHTML || note.content;
          const tags = note.tags?.map((t) => t.tag.name) || [];

          await exportNoteToPdf(
            {
              title: note.title,
              content,
              author: note.author?.displayName,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
              tags,
            },
            pdfOptions
          );
          toast.success('Note exportée en PDF');
          break;
        }

        case 'json': {
          const jsonData = {
            title: note.title,
            slug: note.slug,
            content: note.content,
            author: note.author?.displayName,
            tags: note.tags?.map((t) => t.tag.name) || [],
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          };
          const jsonString = JSON.stringify(jsonData, null, 2);
          downloadText(jsonString, `${note.slug}.json`, 'application/json');
          toast.success('Note exportée en JSON');
          break;
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exporter la note</DialogTitle>
          <DialogDescription>
            Choisissez le format d'export pour "{note.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format selection */}
          <div className="space-y-3">
            <Label>Format d'export</Label>
            <div className="grid gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    format === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div
                    className={`mt-0.5 ${
                      format === option.value ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format-specific options */}
          {format === 'markdown' && (
            <div className="space-y-3 border-t pt-4">
              <Label>Options Markdown</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    setIncludeMetadata(checked === true)
                  }
                />
                <Label htmlFor="includeMetadata" className="text-sm font-normal">
                  Inclure les métadonnées (frontmatter YAML)
                </Label>
              </div>
            </div>
          )}

          {format === 'pdf' && (
            <div className="space-y-4 border-t pt-4">
              <Label>Options PDF</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pageSize" className="text-sm">
                    Taille de page
                  </Label>
                  <Select
                    value={pageSize}
                    onValueChange={(v: string) => setPageSize(v as 'a4' | 'letter' | 'legal')}
                  >
                    <SelectTrigger id="pageSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orientation" className="text-sm">
                    Orientation
                  </Label>
                  <Select
                    value={orientation}
                    onValueChange={(v: string) =>
                      setOrientation(v as 'portrait' | 'landscape')
                    }
                  >
                    <SelectTrigger id="orientation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIENTATIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeHeader"
                    checked={includeHeader}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      setIncludeHeader(checked === true)
                    }
                  />
                  <Label htmlFor="includeHeader" className="text-sm font-normal">
                    Inclure l'en-tête avec le titre
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeFooter"
                    checked={includeFooter}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      setIncludeFooter(checked === true)
                    }
                  />
                  <Label htmlFor="includeFooter" className="text-sm font-normal">
                    Inclure le pied de page
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Export en cours...' : 'Exporter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
