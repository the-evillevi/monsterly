import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type LocalDatabaseRecoveryBannerProps = {
  onReset: () => Promise<void>;
  // The destructive reset only surfaces after repeated failed opens; a single
  // hang is almost always just another tab that needs closing.
  showReset: boolean;
};

export function LocalDatabaseRecoveryBanner({
  onReset,
  showReset,
}: LocalDatabaseRecoveryBannerProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    setIsResetting(true);

    try {
      await onReset();
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="fixed inset-x-4 top-4 z-50 flex justify-center">
      <Card className="grid max-w-xl gap-3 p-4 shadow-lg" role="alert">
        <p className="text-sm text-foreground">
          Los datos locales están tardando demasiado en cargar. Otra pestaña o ventana de MythOS
          puede estar bloqueando la actualización — cierra las demás pestañas de la aplicación y
          recarga.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => window.location.reload()} size="sm" type="button">
            Recargar
          </Button>
          {showReset && !isConfirmingReset ? (
            <Button
              onClick={() => setIsConfirmingReset(true)}
              size="sm"
              type="button"
              variant="destructive"
            >
              Restablecer datos locales
            </Button>
          ) : null}
        </div>
        {showReset && isConfirmingReset ? (
          <div className="grid gap-2 border-t pt-3">
            <p className="text-sm font-medium text-foreground">
              ¿Borrar los datos locales? Se volverán a descargar del servidor.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isResetting}
                onClick={() => void handleReset()}
                size="sm"
                type="button"
                variant="destructive"
              >
                Confirmar
              </Button>
              <Button
                disabled={isResetting}
                onClick={() => setIsConfirmingReset(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
