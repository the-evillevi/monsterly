import { useState } from 'react';

import { Button } from '@/components/ui/button';

type ArchiveConfirmButtonProps = {
  confirmPrompt: string;
  label: string;
  onArchive: () => Promise<void>;
};

export function ArchiveConfirmButton({
  confirmPrompt,
  label,
  onArchive,
}: ArchiveConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setIsArchiving(true);

    try {
      await onArchive();
    } catch (archiveError) {
      console.error('Failed to archive.', archiveError);
      setError('No se pudo archivar. Intenta de nuevo.');
      setIsArchiving(false);
    }
  }

  if (!isConfirming) {
    return (
      <div className="border-t pt-4">
        <Button onClick={() => setIsConfirming(true)} type="button" variant="destructive">
          {label}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 border-t pt-4 justify-items-start">
      <p className="text-sm font-medium text-foreground">{confirmPrompt}</p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={isArchiving} onClick={handleConfirm} type="button" variant="destructive">
          Confirmar
        </Button>
        {/* Red is reserved for the destructive Confirmar in this flow, so the
            cancel follows the general ghost->secondary mapping instead. */}
        <Button
          disabled={isArchiving}
          onClick={() => setIsConfirming(false)}
          type="button"
          variant="secondary"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
