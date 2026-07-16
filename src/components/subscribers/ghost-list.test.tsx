import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CheckInDialogContext } from '@/components/check-ins/check-in-dialog-context';
import type { GhostRecord } from '@/lib/domain/ghosts';

import { GhostList } from './ghost-list';

describe('GhostList', () => {
  it('shows structured initials and PIN and records a visit from the card', () => {
    const recordSubscriber = vi.fn().mockResolvedValue(undefined);
    const ghost: GhostRecord = {
      checkInCode: '654321',
      daysMissing: 18,
      id: 'member-1',
      lastSeenDate: '2026-06-25',
      lastSeenKind: 'check_in',
      name: 'José Luis Ramírez Soto',
      nameParts: {
        maternal_last_name: 'Soto',
        name: 'José Luis',
        paternal_last_name: 'Ramírez',
      },
      phoneNumber: '+52 55 1234 5678',
      plans: ['Gym'],
      slug: 'jose-luis-ramirez-soto-ab12',
    };

    render(
      <CheckInDialogContext.Provider value={{ openSearch: vi.fn(), recordSubscriber }}>
        <MemoryRouter>
          <GhostList ghosts={[ghost]} />
        </MemoryRouter>
      </CheckInDialogContext.Provider>,
    );

    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.getByText('PIN 654321')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));

    expect(recordSubscriber).toHaveBeenCalledWith('member-1');
  });
});
