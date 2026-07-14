import { CheckInTerminal } from '@/components/check-ins/check-in-terminal';
import { PageFrame } from '@/components/page-frame';

export function CheckInPage() {
  return (
    <PageFrame
      title="Check-in"
      subtitle="Escanea o escribe el código de acceso para registrar la visita."
    >
      <CheckInTerminal />
    </PageFrame>
  );
}
