import { v7 as uuidv7 } from 'uuid';

// Suffix alphabet skips ambiguous glyphs (0/o, 1/i/l) so slugs stay easy to
// read aloud and retype.
const slugSuffixAlphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
const slugSuffixLength = 4;
const checkInCodeLength = 6;

export const checkInCodePattern = /^[0-9]{4,6}$/;

/** Time-sorted UUIDv7 for the immutable primary key; FKs bind only to this. */
export function newSubscriberId() {
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
  const bytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(bytes, (byte) => slugSuffixAlphabet[byte % slugSuffixAlphabet.length]).join('');
}

/** Human-readable URL identifier; regenerated whenever the name changes. */
export function generateSlug(fullName: string) {
  const base = slugify(fullName);

  return base ? `${base}-${randomSlugSuffix()}` : randomSlugSuffix();
}

/**
 * Numeric front-desk PIN (keypad entry, phone lookup, future fingerprint
 * terminals key enrollment to it). Six digits, never starting with zero so it
 * survives keypads and spreadsheets that trim leading zeros.
 */
export function generateCheckInCode() {
  const digits = crypto.getRandomValues(new Uint8Array(checkInCodeLength));

  return Array.from(digits, (byte, index) =>
    index === 0 ? String((byte % 9) + 1) : String(byte % 10),
  ).join('');
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
