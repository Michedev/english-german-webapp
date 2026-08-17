/**
 * Verb lookup index.
 *
 * Every verb in stories/_verbs.de-en.json is conjugated once at start-up and
 * each resulting form is mapped back to its infinitive, so a reader can click
 * "rief" or "hat" and get the whole table without the story file having to say
 * which lemma the word belongs to.
 */

import { conjugate } from './conjugate.js';
import { normalize } from './tokenize.js';

const VERBS_URL = 'stories/_verbs.de-en.json';

let index = null;

export async function loadVerbs() {
  if (index) return index;
  const response = await fetch(VERBS_URL);
  if (!response.ok) throw new Error(`Cannot load verb list (${response.status})`);
  index = buildIndex(await response.json());
  return index;
}

/** Also used by scripts/check-stories.mjs, which reads the file from disk. */
export function buildIndex(data) {
  const entries = Object.entries(data).filter(([key]) => !key.startsWith('$'));
  const byForm = new Map();

  const add = (form, verb) => {
    const key = normalize(form);
    // A plain verb keeps priority over a separable one that shares a form:
    // "ruft" stays rufen even though anrufen produces "ruft an" too.
    if (!byForm.has(key)) byForm.set(key, verb);
  };

  const conjugated = entries.map(([infinitive, entry]) => ({
    ...entry,
    infinitive,
    tables: conjugate(infinitive, entry),
  }));

  // Plain verbs first, then separable ones, so "ruft" stays rufen while
  // "ruft an" resolves to anrufen.
  for (const verb of conjugated.filter((v) => !v.sep)) {
    for (const form of verb.tables.forms) add(form, verb);
  }
  for (const verb of conjugated.filter((v) => v.sep)) {
    for (const form of verb.tables.forms) {
      add(form, verb);
      // "zieht sich an" is also reachable as "zieht an": in the sentence the
      // reflexive pronoun and adverbs sit between the verb and its prefix.
      add(`${form.split(' ')[0]} ${verb.sep}`, verb);
    }
  }
  // Finally the bare finite form of anything carrying a prefix or a reflexive
  // pronoun ("gewöhnte" → gewöhnen), but only where nothing claimed it already.
  for (const verb of conjugated) {
    for (const form of verb.tables.forms) add(form.split(' ')[0], verb);
  }

  return byForm;
}

/** @returns {object|null} the verb record whose table contains this surface form */
export function lookupVerb(surface) {
  return index?.get(normalize(surface)) ?? null;
}
