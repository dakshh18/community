/**
 * Gujarati script → ASCII Latin transliteration for search.
 *
 * This is NOT a faithful transliteration — it's a search index. We apply a
 * simplified schwa-deletion rule so common English renderings substring-match
 * the output. Each name is mapped to a short Latin form along with a "full"
 * form (every inherent vowel kept), and both are concatenated so substring
 * search against either form succeeds.
 *
 * Schwa-deletion rule used:
 *   - Keep the FIRST inherent 'a' in a word (so "Hiral" stays "hiral")
 *   - Drop subsequent inherent 'a's when followed by another consonant or at
 *     end of word (so "Jagdishbhai" becomes "jagdishbhai", not "jagadishabhai")
 *   - Matras and independent vowels are always emitted (those aren't schwas)
 *
 * Output is always lowercased.
 */

const CONSONANTS: Record<string, string> = {
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
  'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'ny',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
  'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
  'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
  'ળ': 'l',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'i',
  'ઉ': 'u', 'ઊ': 'u', 'ઋ': 'ri',
  'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  'ઍ': 'e', 'ઑ': 'o',
};

const VOWEL_MATRAS: Record<string, string> = {
  'ા': 'a', 'િ': 'i', 'ી': 'i',
  'ુ': 'u', 'ૂ': 'u',
  'ે': 'e', 'ૈ': 'ai',
  'ો': 'o', 'ૌ': 'au',
  'ૃ': 'ri',
  'ૅ': 'e', 'ૉ': 'o',
};

const HALANT = '્';
const ANUSVARA = 'ં';
const VISARGA = 'ઃ';
const CHANDRABINDU = 'ઁ';

function isConsonant(c: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONSONANTS, c);
}
function isMatra(c: string): boolean {
  return Object.prototype.hasOwnProperty.call(VOWEL_MATRAS, c);
}
function isWordBreak(c: string | undefined): boolean {
  return !c || /\s/.test(c) || /[.,!?'"()\-/]/.test(c);
}

/**
 * Anglicized form — schwa-deleted, suitable for searching with English names.
 */
function anglicized(input: string): string {
  if (!input) return '';
  const chars = [...input];
  let out = '';
  let firstSchwaPending = true; // becomes false after we emit the FIRST inherent 'a' in a word

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];

    if (isWordBreak(ch)) {
      out += ch;
      firstSchwaPending = true;
      continue;
    }

    if (isConsonant(ch)) {
      out += CONSONANTS[ch];

      if (next === HALANT) {
        // Cluster forms — no schwa emitted, still pending.
        i += 1;
      } else if (next && isMatra(next)) {
        out += VOWEL_MATRAS[next];
        i += 1;
        // Matra is not a schwa — firstSchwaPending unchanged
      } else if (next === ANUSVARA) {
        out += 'an';
        i += 1;
        firstSchwaPending = false;
      } else if (next === VISARGA) {
        out += 'ah';
        i += 1;
        firstSchwaPending = false;
      } else {
        // Default — inherent 'a' candidate
        const endOfWord = isWordBreak(next);
        const nextIsCons = !!next && isConsonant(next);
        const shouldDrop = !firstSchwaPending && (nextIsCons || endOfWord);
        if (!shouldDrop) {
          out += 'a';
          firstSchwaPending = false;
        }
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(INDEPENDENT_VOWELS, ch)) {
      out += INDEPENDENT_VOWELS[ch];
      continue;
    }
    if (ch === ANUSVARA) { out += 'n'; continue; }
    if (ch === VISARGA) { out += 'h'; continue; }
    if (ch === HALANT || ch === CHANDRABINDU) continue;
    if (isMatra(ch)) { out += VOWEL_MATRAS[ch]; continue; }

    out += ch;
  }

  return out.toLowerCase();
}

/**
 * Verbose form — every inherent 'a' kept. Useful for queries that include
 * vowels the schwa-deletion would drop (e.g. searching "patela" should still
 * find પટેલ).
 */
function verbose(input: string): string {
  if (!input) return '';
  const chars = [...input];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];

    if (isConsonant(ch)) {
      out += CONSONANTS[ch];
      if (next === HALANT) {
        i += 1;
      } else if (next && isMatra(next)) {
        out += VOWEL_MATRAS[next];
        i += 1;
      } else if (next === ANUSVARA) {
        out += 'an';
        i += 1;
      } else if (next === VISARGA) {
        out += 'ah';
        i += 1;
      } else {
        out += 'a';
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(INDEPENDENT_VOWELS, ch)) {
      out += INDEPENDENT_VOWELS[ch];
      continue;
    }
    if (ch === ANUSVARA) { out += 'n'; continue; }
    if (ch === VISARGA) { out += 'h'; continue; }
    if (ch === HALANT || ch === CHANDRABINDU) continue;
    if (isMatra(ch)) { out += VOWEL_MATRAS[ch]; continue; }

    out += ch;
  }

  return out.toLowerCase();
}

/**
 * Aggressive — drop every inherent 'a' (no first-schwa exception). Useful
 * for compound names like "Ankur+Kumar" where the second syllable's
 * inherent 'a' is also typically dropped in English spelling.
 */
function aggressive(input: string): string {
  if (!input) return '';
  const chars = [...input];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const next = chars[i + 1];

    if (isConsonant(ch)) {
      out += CONSONANTS[ch];
      if (next === HALANT) {
        i += 1;
      } else if (next && isMatra(next)) {
        out += VOWEL_MATRAS[next];
        i += 1;
      } else if (next === ANUSVARA) {
        out += 'n';
        i += 1;
      } else if (next === VISARGA) {
        out += 'h';
        i += 1;
      }
      // else: drop the inherent 'a' entirely
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(INDEPENDENT_VOWELS, ch)) {
      out += INDEPENDENT_VOWELS[ch];
      continue;
    }
    if (ch === ANUSVARA) { out += 'n'; continue; }
    if (ch === VISARGA) { out += 'h'; continue; }
    if (ch === HALANT || ch === CHANDRABINDU) continue;
    if (isMatra(ch)) { out += VOWEL_MATRAS[ch]; continue; }

    out += ch;
  }

  return out.toLowerCase();
}

/**
 * Build the search index — three forms joined with spaces, deduped.
 * Substring match against the concatenated index will catch typical user
 * spellings whether they keep all vowels, the first one only, or none.
 */
export function buildLatinIndex(input: string): string {
  if (!input) return '';
  const forms = new Set<string>([
    anglicized(input),
    verbose(input),
    aggressive(input),
  ]);
  return [...forms].join(' ');
}

// Exported for tests / debug.
export const _internals = { anglicized, verbose, aggressive };
