// ===========================================
// Composant Paramètres de notifications
// Sprint 3: US-054 Préférences utilisateur
// ===========================================

import { usePreferencesStore } from '../../stores/preferencesStore';
import { Label } from '../ui/Label';
import { Checkbox } from '../ui/Checkbox';
import { Mail, Bell, AtSign } from 'lucide-react';

export function NotificationSettings() {
  const { preferences, updateNotifications, isLoading } = usePreferencesStore();
  const { notifications } = preferences;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configurez comment vous souhaitez être notifié des activités sur la plateforme.
      </p>

      {/* Email digest */}
      <div className="flex items-start space-x-3 p-4 rounded-lg border">
        <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="emailDigest" className="font-medium">
              Résumé par email
            </Label>
            <Checkbox
              id="emailDigest"
              checked={notifications.emailDigest}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                updateNotifications({ emailDigest: checked === true })
              }
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Recevez un résumé quotidien des activités importantes par email.
          </p>
        </div>
      </div>

      {/* Browser notifications */}
      <div className="flex items-start space-x-3 p-4 rounded-lg border">
        <Bell className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="browserNotifications" className="font-medium">
              Notifications navigateur
            </Label>
            <Checkbox
              id="browserNotifications"
              checked={notifications.browserNotifications}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                updateNotifications({ browserNotifications: checked === true })
              }
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Recevez des notifications push dans votre navigateur en temps réel.
          </p>
        </div>
      </div>

      {/* Mention notifications */}
      <div className="flex items-start space-x-3 p-4 rounded-lg border">
        <AtSign className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="mentionNotifications" className="font-medium">
              Notifications de mention
            </Label>
            <Checkbox
              id="mentionNotifications"
              checked={notifications.mentionNotifications}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                updateNotifications({ mentionNotifications: checked === true })
              }
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Soyez notifié lorsque quelqu'un vous mentionne dans une note ou un commentaire.
          </p>
        </div>
      </div>
    </div>
  );
}
