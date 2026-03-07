import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/stores';
import type { NotificationState } from '@/types/store';

const notificationIconMap: Record<NotificationState['type'], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

const notificationStyles: Record<NotificationState['type'], string> = {
  info: 'border-primary/30 bg-background/95 text-foreground',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export function NotificationStack() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-6 top-[calc(var(--titlebar-height)+1rem)] z-[60] flex w-full max-w-sm flex-col gap-3">
      {notifications.map((notification) => {
        const Icon = notificationIconMap[notification.type];

        return (
          <div
            key={notification.id}
            className={`pointer-events-auto rounded-xl border shadow-lg backdrop-blur ${notificationStyles[notification.type]}`}
          >
            <div className="flex items-start gap-3 p-4">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{notification.title}</div>
                {notification.message && (
                  <p className="mt-1 text-sm text-current/80">{notification.message}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-current hover:bg-background/10"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
