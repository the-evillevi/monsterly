import { describe, expect, it } from 'vitest';

import { buildGhosts, type GhostSource } from './ghosts';

const today = new Date(2026, 6, 13);

function source(overrides: Partial<GhostSource> = {}): GhostSource {
  return {
    id: 'member-1',
    name: 'Ana Torres',
    nameParts: { name: 'Ana', paternal_last_name: 'Torres' },
    plans: ['Gym'],
    status: 'Al corriente',
    ...overrides,
  };
}

describe('buildGhosts', () => {
  it('flags an active member last seen 14+ days ago via check-in', () => {
    const ghosts = buildGhosts(
      [source({ latestCheckInAt: new Date(2026, 5, 25).toISOString() })],
      today,
    );

    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toMatchObject({ daysMissing: 18, lastSeenKind: 'check_in' });
  });

  it('keeps a recently seen member out of the list', () => {
    const ghosts = buildGhosts(
      [source({ latestCheckInAt: new Date(2026, 6, 10).toISOString() })],
      today,
    );

    expect(ghosts).toHaveLength(0);
  });

  it('falls back to the baseline date on cold start (no check-ins yet)', () => {
    const ghosts = buildGhosts([source({ baselineDate: '2026-06-20' })], today);

    expect(ghosts[0]).toMatchObject({ daysMissing: 23, lastSeenKind: 'baseline' });
  });

  it('does not flag a member who just paid even without check-ins', () => {
    const ghosts = buildGhosts([source({ baselineDate: '2026-07-12' })], today);

    expect(ghosts).toHaveLength(0);
  });

  it('prefers the check-in over the baseline when both exist', () => {
    const ghosts = buildGhosts(
      [
        source({
          baselineDate: '2026-06-01',
          latestCheckInAt: new Date(2026, 6, 12).toISOString(),
        }),
      ],
      today,
    );

    expect(ghosts).toHaveLength(0);
  });

  it('excludes members who are not Al corriente', () => {
    const ghosts = buildGhosts([source({ baselineDate: '2026-05-01', status: 'Vencido' })], today);

    expect(ghosts).toHaveLength(0);
  });

  it('skips members with no signal at all', () => {
    expect(buildGhosts([source()], today)).toHaveLength(0);
  });

  it('sorts the most-missing members first', () => {
    const ghosts = buildGhosts(
      [
        source({ baselineDate: '2026-06-20', id: 'a', name: 'A' }),
        source({ baselineDate: '2026-05-20', id: 'b', name: 'B' }),
      ],
      today,
    );

    expect(ghosts.map((ghost) => ghost.id)).toEqual(['b', 'a']);
  });
});
