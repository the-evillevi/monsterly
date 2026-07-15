/**
 * Same-member scans inside this window count as one visit (double badge taps
 * at the door). The window is device-local; unique-today counting absorbs the
 * rare cross-device double record.
 */
export const duplicateScanWindowMinutes = 5;

/** UTC ISO string for the local midnight boundary — check_ins store UTC ISO
 * timestamps, so "today" comparisons are plain string comparisons against
 * this value. */
export function startOfTodayIso(now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function isWithinDuplicateWindow(
  previousCheckedInAt: string,
  now: Date = new Date(),
): boolean {
  const elapsedMs = now.getTime() - new Date(previousCheckedInAt).getTime();

  return elapsedMs >= 0 && elapsedMs < duplicateScanWindowMinutes * 60_000;
}

/** Unique members scanned since local midnight. */
export function countUniqueCheckedInToday(
  checkIns: readonly { checked_in_at: string; subscriber_id: string }[],
  now: Date = new Date(),
): number {
  const todayStart = startOfTodayIso(now);
  const uniqueSubscribers = new Set(
    checkIns
      .filter((checkIn) => checkIn.checked_in_at >= todayStart)
      .map((checkIn) => checkIn.subscriber_id),
  );

  return uniqueSubscribers.size;
}

/** Relative label for feed rows: "hace 2 min", "hace 3 h", "hace 2 días". */
export function formatRelativeTime(checkedInAt: string, now: Date = new Date()): string {
  const elapsedMs = Math.max(0, now.getTime() - new Date(checkedInAt).getTime());
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) {
    return 'ahora mismo';
  }
  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
