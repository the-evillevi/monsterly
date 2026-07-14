import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCheckInDialog } from '@/components/check-ins/check-in-dialog-context';

export function LegacyCheckInRedirect() {
  const navigate = useNavigate();
  const { openSearch } = useCheckInDialog();

  useEffect(() => {
    openSearch();
    navigate('/dashboard', { replace: true });
  }, [navigate, openSearch]);

  return null;
}
