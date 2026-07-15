import type { SubscriberNameParts } from './subscriber-identity';

/**
 * Fixed identity hues (oklch hue stops) with lightness/chroma chosen so the
 * white foreground keeps contrast on both the light and dark themes.
 */
export const avatarToneCount = 8;

/** Initials shown in the avatar: first name + paternal last name (or the
 * second word of the name when the last name is missing). */
export function subscriberInitials(parts: SubscriberNameParts): string {
  const nameWords = parts.name.trim().split(/\s+/).filter(Boolean);
  const first = nameWords[0]?.[0] ?? '';
  const last = parts.paternal_last_name?.trim()[0] ?? nameWords[1]?.[0] ?? '';

  return `${first}${last}`.toLocaleUpperCase();
}

/** Deterministic tone index so a member keeps the same avatar color on every
 * device without storing anything. */
export function avatarToneIndex(id: string, toneCount = avatarToneCount): number {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return hash % toneCount;
}
