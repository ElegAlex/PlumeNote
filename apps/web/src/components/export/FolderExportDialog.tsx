// ===========================================
// Dialog Export Dossier (Sprint 5)
// Export d'un dossier en ZIP ou JSON
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
import { toast } from 'sonner';
import { FileArchive, FileJson, Download } from 'lucide-react';
import {
  exportFolderAsZip,
  exportFolderAsJson,
  downloadBlob,
} from '../../services/exportApi';

type FolderExportFormat = 'zip' | 'json';

interface FolderExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: {
    id: string;
    name: string;
    slug?: string;
  };
}

const FORMAT_OPTIONS: Array<{
  value: FolderExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'zip',
    label: 'ZIP (Markdown)',
    description: 'Archive avec structure de dossiers et fichiers .md',
    icon: <FileArchive className="h-5 w-5" />,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Données structurées en un seul fichier',
    icon: <FileJson className="h-5 w-5" />,
  },
];

export function FolderExportDialog({
  open,
  onOpenChange,
  folder,
}: FolderExportDialogProps) {
  const [format, setFormat] = useState<FolderExportFormat>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const slug = folder.slug || folder.name.toLowerCase().replace(/\s+/g, '-');
      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'zip') {
        const blob = await exportFolderAsZip(folder.id, { includeMetadata });
        downloadBlob(blob, `${slug}-${timestamp}.zip`);
        toast.success('Dossier exporté en ZIP');
      } else {
        const blob = await exportFolderAsJson(folder.id, { includeMetadata });
        downloadBlob(blob, `${slug}-${timestamp}.json`);
        toast.success('Dossier exporté en JSON');
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Exporter le dossier</DialogTitle>
          <DialogDescription>
            Exporter "{folder.name}" et toutes ses notes
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

          {/* Options */}
          <div className="space-y-3 border-t pt-4">
            <Label>Options</Label>
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
