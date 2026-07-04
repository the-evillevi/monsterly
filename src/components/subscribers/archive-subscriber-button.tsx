import { useState } from 'react';

import { Button } from '@/components/ui/button';

type ArchiveSubscriberButtonProps = {
  onArchive: () => Promise<void>;
};

export function ArchiveSubscriberButton({ onArchive }: ArchiveSubscriberButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsArchiving(true);

    try {
      await onArchive();
    } catch (archiveError) {
      console.error('Failed to archive the subscriber.', archiveError);
      setError('No se pudo archivar. Intenta de nuevo.');
      setIsArchiving(false);
    }
  }

  if (!isConfirming) {
    return (
      <div className="border-t pt-4">
        <Button onClick={() => setIsConfirming(true)} type="button" variant="outline">
          Archivar suscriptor
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 border-t pt-4 justify-items-start">
      <p className="text-sm font-medium text-foreground">¿Archivar este suscriptor?</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={isArchiving} onClick={handleConfirm} type="button" variant="destructive">
          Confirmar
        </Button>
        <Button
          disabled={isArchiving}
          onClick={() => setIsConfirming(false)}
          type="button"
          variant="ghost"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
