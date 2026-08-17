/**
 * Splitting German sentences into clickable pieces.
 *
 * A sentence becomes a flat list of tokens. `word` tokens are clickable and get
 * a running index inside the sentence; `gap` tokens (spaces, punctuation, quotes)
 * are rendered as-is so the sentence still looks like normal text.
 */

// Letters, marks and digits, optionally joined by an apostrophe or hyphen
// (so "Buch-laden" or "geht's" stay one word).
const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:[''’-][\p{L}\p{M}\p{N}]+)*/gu;

/** Lowercase form used for every dictionary/phrase comparison. */
export function normalize(text) {
  return text.toLowerCase().replace(/[''’]/g, "'").trim();
}

/** @returns {Array<{type:'word'|'gap', text:string, index:number}>} */
export function tokenize(sentence) {
  const tokens = [];
  let cursor = 0;
  let wordIndex = 0;

  for (const match of sentence.matchAll(WORD_RE)) {
    if (match.index > cursor) {
      tokens.push({ type: 'gap', text: sentence.slice(cursor, match.index), index: -1 });
    }
    tokens.push({ type: 'word', text: match[0], index: wordIndex++ });
    cursor = match.index + match[0].length;
  }
  if (cursor < sentence.length) {
    tokens.push({ type: 'gap', text: sentence.slice(cursor), index: -1 });
  }
  return tokens;
}

/**
 * Mark the tokens that belong to a known multi-word expression.
 *
 * Phrases are matched on the surface form as it appears in the text and must be
 * contiguous, so a story lists "hat es eilig" rather than the infinitive
 * "es eilig haben". Longer phrases win over shorter overlapping ones.
 *
 * @param {ReturnType<typeof tokenize>} tokens
 * @param {Map<string, {de:string, en:string, note?:string}>} phrases keyed by normalized phrase
 */
export function markPhrases(tokens, phrases) {
  if (!phrases.size) return;

  const words = tokens.filter((t) => t.type === 'word');
  const maxLength = Math.max(...[...phrases.keys()].map((k) => k.split(' ').length));

  for (let start = 0; start < words.length; start++) {
    if (words[start].phrase) continue;

    for (let length = Math.min(maxLength, words.length - start); length > 1; length--) {
      const slice = words.slice(start, start + length);
      if (slice.some((t) => t.phrase)) continue;

      const key = normalize(slice.map((t) => t.text).join(' '));
      const phrase = phrases.get(key);
      if (!phrase) continue;

      for (const token of slice) {
        token.phrase = { ...phrase, from: start, to: start + length - 1 };
      }
      start += length - 1;
      break;
    }
  }
}
