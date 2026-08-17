/**
 * Dictionary lookup.
 *
 * Two layers are merged: a shared glossary (stories/_glossary.de-en.json) with
 * the function words that show up in every text, and the story's own glossary
 * which wins on conflicts. Keys are surface forms — write them the way they
 * appear in the story ("sucht", not "suchen") and add the infinitive in the
 * value, e.g. "looks for (suchen)".
 */

import { normalize } from './tokenize.js';

const SHARED_GLOSSARY_URL = 'stories/_glossary.de-en.json';

let sharedGlossary = null;

export async function loadSharedGlossary() {
  if (!sharedGlossary) {
    const response = await fetch(SHARED_GLOSSARY_URL);
    if (!response.ok) throw new Error(`Cannot load shared glossary (${response.status})`);
    sharedGlossary = toMap(await response.json());
  }
  return sharedGlossary;
}

function toMap(object) {
  return new Map(Object.entries(object).map(([key, value]) => [normalize(key), value]));
}

/** Build the lookup used by the reader for a single story. */
export function createDictionary(story) {
  const words = new Map([...(sharedGlossary ?? []), ...toMap(story.glossary ?? {})]);
  const phrases = new Map(
    (story.phrases ?? []).map((phrase) => [normalize(phrase.de), phrase]),
  );

  return {
    phrases,

    /** @returns {{en:string, source:'story'|'none'}} translation of a single word */
    word(surface) {
      const key = normalize(surface);
      const hit = words.get(key) ?? words.get(key.replace(/[.,!?;:]/g, ''));
      return hit ? { en: hit, source: 'story' } : { en: null, source: 'none' };
    },

    /** Translation of a free selection of words, e.g. a drag across "im Stehen". */
    selection(surfaces) {
      const key = normalize(surfaces.join(' '));
      const phrase = phrases.get(key);
      if (phrase) return { en: phrase.en, note: phrase.note, source: 'phrase' };

      const direct = words.get(key);
      if (direct) return { en: direct, source: 'story' };

      const parts = surfaces.map((surface) => ({ de: surface, ...this.word(surface) }));
      return { en: null, source: 'none', parts };
    },
  };
}
