import { v7 as uuidv7 } from 'uuid';

// Suffix alphabet skips ambiguous glyphs (0/o, 1/i/l) so slugs stay easy to
// read aloud and retype.
const slugSuffixAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
const slugSuffixLength = 4;

/**
 * Time-sorted UUIDv7 primary key for locally created rows (subscribers,
 * subscriptions, renewals). FKs bind only to this value.
 */
export function newEntityId() {
  return uuidv7();
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSlugSuffix(length = slugSuffixLength) {
  // Reject bytes past the largest multiple of the alphabet size so every
  // character is equally likely.
  const limit = 256 - (256 % slugSuffixAlphabet.length);
  let suffix = '';

  while (suffix.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && suffix.length < length) {
        suffix += slugSuffixAlphabet[byte % slugSuffixAlphabet.length];
      }
    }
  }

  return suffix;
}

/** Human-readable URL identifier; regenerated whenever the name changes. */
export function generateSlug(fullName: string) {
  const base = slugify(fullName);

  return base ? `${base}-${randomSlugSuffix()}` : randomSlugSuffix();
}

/**
 * Numeric front-desk PIN (keypad entry, phone lookup, future fingerprint
 * terminals key enrollment to it). Six digits, never starting with zero so it
 * survives keypads and spreadsheets that trim leading zeros. Uniform over
 * [100000, 999999] via rejection sampling — a PIN must not skew guessable.
 */
export function generateCheckInCode() {
  const range = 900_000;
  const limit = Math.floor(0x1_0000_0000 / range) * range;
  const buffer = new Uint32Array(1);
  let value: number;

  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return String(100_000 + (value % range));
}

export type SubscriberNameParts = {
  maternal_last_name?: string | null;
  name: string;
  paternal_last_name?: string | null;
};

export function formatFullName(parts: SubscriberNameParts) {
  return [parts.name, parts.paternal_last_name, parts.maternal_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Route segment for subscriber URLs: the slug, or the id while a pre-EVL-105
 * doc waits for its backfilled slug to arrive through replication.
 */
export function subscriberUrlSegment(subscriber: { id: string; slug?: string | null }) {
  return subscriber.slug ?? subscriber.id;
}
