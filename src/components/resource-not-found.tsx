import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

type ResourceNotFoundProps = {
  backLabel: string;
  backTo: string;
  message: string;
};

export function ResourceNotFound({ backLabel, backTo, message }: ResourceNotFoundProps) {
  return (
    <div className="grid max-w-md gap-4 justify-items-start">
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to={backTo}>{backLabel}</Link>
      </Button>
    </div>
  );
}
