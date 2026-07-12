import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { appUpdateManager, type AppUpdateManager } from '@/pwa/app-update';
import { useAppUpdate } from '@/pwa/use-app-update';

export function UpdatePrompt({ manager = appUpdateManager }: { manager?: AppUpdateManager }) {
  const { updateReady } = useAppUpdate(manager);

  if (!updateReady) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6">
      <Card className="flex flex-row items-center gap-3 p-4 shadow-lg" role="status">
        <p className="text-sm text-foreground">Nueva versión disponible.</p>
        <Button onClick={() => void manager.applyUpdate()} size="sm">
          Actualizar
        </Button>
      </Card>
    </div>
  );
}
