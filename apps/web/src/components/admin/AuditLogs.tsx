// ===========================================
// Composant Journal d'audit
// ===========================================

import { useEffect, useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Spinner } from '../ui/Spinner';
import { toast } from 'sonner';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AuditAction } from '@plumenote/types';

// Labels français pour les actions
const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Connexion',
  AUTH_LOGOUT: 'Déconnexion',
  AUTH_FAILED: 'Échec de connexion',
  USER_CREATED: 'Utilisateur créé',
  USER_UPDATED: 'Utilisateur modifié',
  USER_DELETED: 'Utilisateur supprimé',
  USER_DISABLED: 'Utilisateur désactivé',
  USER_ENABLED: 'Utilisateur activé',
  ROLE_CHANGED: 'Rôle modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PASSWORD_CHANGED: 'Mot de passe modifié',
  NOTE_CREATED: 'Note créée',
  NOTE_UPDATED: 'Note modifiée',
  NOTE_DELETED: 'Note supprimée',
  NOTE_RESTORED: 'Note restaurée',
  FOLDER_CREATED: 'Dossier créé',
  FOLDER_UPDATED: 'Dossier modifié',
  FOLDER_DELETED: 'Dossier supprimé',
  PERMISSION_GRANTED: 'Permission accordée',
  PERMISSION_REVOKED: 'Permission révoquée',
  BACKUP_CREATED: 'Sauvegarde créée',
  BACKUP_RESTORED: 'Sauvegarde restaurée',
};

// Couleurs par catégorie d'action
const getActionVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (action.includes('DELETED') || action.includes('DISABLED') || action === 'AUTH_FAILED') {
    return 'destructive';
  }
  if (action.includes('CREATED') || action.includes('ENABLED') || action === 'AUTH_LOGIN') {
    return 'default';
  }
  return 'secondary';
};

// Actions disponibles pour le filtre
const AUDIT_ACTIONS: AuditAction[] = [
  'AUTH_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_FAILED',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'USER_DISABLED',
  'USER_ENABLED',
  'ROLE_CHANGED',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'NOTE_CREATED',
  'NOTE_UPDATED',
  'NOTE_DELETED',
  'NOTE_RESTORED',
  'FOLDER_CREATED',
  'FOLDER_UPDATED',
  'FOLDER_DELETED',
  'PERMISSION_GRANTED',
  'PERMISSION_REVOKED',
  'BACKUP_CREATED',
  'BACKUP_RESTORED',
];

// Types de ressources
const RESOURCE_TYPES = ['USER', 'NOTE', 'FOLDER', 'PERMISSION', 'SYSTEM'];

export function AuditLogs() {
  const {
    audit,
    isLoading,
    error,
    loadAuditLogs,
    setAuditFilters,
    exportAuditLogs,
    clearError,
  } = useAdminStore();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Chargement initial
  useEffect(() => {
    loadAuditLogs();
  }, []);

  // Gestion des erreurs
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error]);

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleDateChange = () => {
    setAuditFilters({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const currentOffset = audit.filters.offset || 0;
    const limit = audit.filters.limit || 50;

    if (direction === 'prev') {
      setAuditFilters({ offset: Math.max(0, currentOffset - limit) });
    } else {
      setAuditFilters({ offset: currentOffset + limit });
    }
  };

  const currentPage = Math.floor((audit.filters.offset || 0) / (audit.filters.limit || 50)) + 1;
  const totalPages = Math.ceil(audit.total / (audit.filters.limit || 50));

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Action</label>
          <Select
            value={audit.filters.action || 'all'}
            onValueChange={(value: string) =>
              setAuditFilters({ action: value === 'all' ? undefined : value as AuditAction })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Type de ressource</label>
          <Select
            value={audit.filters.resourceType || 'all'}
            onValueChange={(value: string) =>
              setAuditFilters({ resourceType: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {RESOURCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Du</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
              onBlur={handleDateChange}
              className="pl-9 w-[150px]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Au</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
              onBlur={handleDateChange}
              className="pl-9 w-[150px]"
            />
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={() => loadAuditLogs()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Tableau */}
      {isLoading && audit.logs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead className="w-[120px]">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Aucun log trouvé
                  </TableCell>
                </TableRow>
              ) : (
                audit.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      <div>{format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: fr })}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <div className="font-medium">{log.user.displayName}</div>
                          <div className="text-sm text-muted-foreground">
                            @{log.user.username}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Système</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionVariant(log.action)}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{log.resourceType}</span>
                        {log.targetName && (
                          <div className="font-medium">{log.targetName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.details && (
                        <pre className="text-xs bg-muted rounded px-2 py-1 max-w-[200px] overflow-hidden text-ellipsis">
                          {JSON.stringify(log.details, null, 0)}
                        </pre>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {audit.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {audit.total} entrée{audit.total > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('prev')}
              disabled={currentPage <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('next')}
              disabled={currentPage >= totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
