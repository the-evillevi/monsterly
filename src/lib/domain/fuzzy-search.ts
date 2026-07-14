/** Lowercase and strip diacritics so "José" matches "jose". */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Damerau-Levenshtein distance ≤ 1: equal, one substitution, one adjacent
 * transposition, or one insertion/deletion. Bounded so search stays forgiving
 * of a single typo without pulling in loose matches.
 */
export function isWithinOneEdit(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  const lengthA = a.length;
  const lengthB = b.length;

  if (Math.abs(lengthA - lengthB) > 1) {
    return false;
  }

  if (lengthA === lengthB) {
    const mismatches: number[] = [];

    for (let index = 0; index < lengthA; index += 1) {
      if (a[index] !== b[index]) {
        mismatches.push(index);
      }
    }

    if (mismatches.length === 1) {
      return true;
    }

    // Adjacent transposition, e.g. "recibo" vs "recibo".
    return (
      mismatches.length === 2 &&
      mismatches[1] === mismatches[0] + 1 &&
      a[mismatches[0]] === b[mismatches[1]] &&
      a[mismatches[1]] === b[mismatches[0]]
    );
  }

  // One insertion/deletion: walk both, allowing a single skip in the longer.
  const [longer, shorter] = lengthA > lengthB ? [a, b] : [b, a];
  let longIndex = 0;
  let shortIndex = 0;
  let edits = 0;

  while (longIndex < longer.length && shortIndex < shorter.length) {
    if (longer[longIndex] === shorter[shortIndex]) {
      longIndex += 1;
      shortIndex += 1;
    } else {
      edits += 1;

      if (edits > 1) {
        return false;
      }

      longIndex += 1;
    }
  }

  return true;
}

type SearchableSubscriber = {
  name: string;
  phoneNumber?: string;
};

/**
 * Forgiving match by name or phone. Every whitespace-separated token must hit
 * the name (as a substring, or within one typo of a name word for tokens of at
 * least four characters); a numeric query also matches on phone digits.
 */
export function subscriberMatchesQuery(subscriber: SearchableSubscriber, query: string): boolean {
  const trimmed = query.trim();

  if (!trimmed) {
    return true;
  }

  const digitsQuery = trimmed.replace(/\D/g, '');

  if (digitsQuery && subscriber.phoneNumber) {
    const phoneDigits = subscriber.phoneNumber.replace(/\D/g, '');

    if (phoneDigits.includes(digitsQuery)) {
      return true;
    }
  }

  const normalizedName = normalizeText(subscriber.name);
  const nameWords = normalizedName.split(/\s+/).filter(Boolean);
  const tokens = normalizeText(trimmed).split(/\s+/).filter(Boolean);

  return tokens.every(
    (token) =>
      normalizedName.includes(token) ||
      (token.length >= 4 && nameWords.some((word) => isWithinOneEdit(word, token))),
  );
}
