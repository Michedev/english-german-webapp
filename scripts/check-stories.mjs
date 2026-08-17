#!/usr/bin/env node
/**
 * Proofreading aid for the story folder: `npm run check`.
 *
 * Verifies that the manifest and the story files agree, that every word in every
 * sentence resolves to a dictionary entry, and that every declared phrase is
 * actually found in the text (a phrase that never matches is usually written in
 * its infinitive form instead of the surface form used in the story).
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tokenize, markPhrases, normalize } from '../js/tokenize.js';
import { buildIndex } from '../js/verbs.js';
import { conjugate, PERSONS, CASE_LABELS } from '../js/conjugate.js';

const STORIES = join(dirname(import.meta.dirname), 'stories');
const readJson = async (file) => JSON.parse(await readFile(join(STORIES, file), 'utf8'));

const problems = [];
const note = (story, message) => problems.push(`${story}: ${message}`);

/** Years, house numbers and initials such as "M." need no dictionary entry. */
const isLookupWorthy = (text) => !/^\d+$/.test(text) && !/^\p{Lu}$/u.test(text);

const { stories: manifest } = await readJson('index.json');
const shared = await readJson('_glossary.de-en.json');
const sharedWords = new Map(Object.entries(shared).map(([k, v]) => [normalize(k), v]));

const verbData = await readJson('_verbs.de-en.json');
const verbEntries = Object.entries(verbData).filter(([key]) => !key.startsWith('$'));
const verbIndex = buildIndex(verbData);

for (const [infinitive, entry] of verbEntries) {
  if (!entry.en) note('_verbs.de-en.json', `${infinitive} has no English gloss`);
  if (!(entry.case in CASE_LABELS)) note('_verbs.de-en.json', `${infinitive} has unknown case "${entry.case}"`);
}

// `npm run check -- --verbs` prints every table for proofreading.
if (process.argv.includes('--verbs')) {
  for (const [infinitive, entry] of verbEntries) {
    const table = conjugate(infinitive, entry);
    const row = (tense) => PERSONS.map((p) => table[tense][p.key]).join(' / ');
    console.log(`${infinitive}  —  ${entry.en}  [${CASE_LABELS[entry.case] ?? entry.case}]`);
    console.log(`  Präsens     ${row('praesens')}`);
    console.log(`  Präteritum  ${row('praeteritum')}`);
    console.log(`  Perfekt     er ${table.perfekt}\n`);
  }
}

console.log(
  `Checking ${manifest.length} stories against ${sharedWords.size} shared glossary entries ` +
    `and ${verbEntries.length} verbs (${verbIndex.size} forms).\n`,
);

for (const entry of manifest) {
  const story = await readJson(entry.file).catch(() => null);
  if (!story) {
    note(entry.file, 'listed in index.json but the file cannot be read');
    continue;
  }
  if (story.id !== entry.id) note(entry.file, `id "${story.id}" does not match index.json id "${entry.id}"`);

  const words = new Map([...sharedWords, ...Object.entries(story.glossary ?? {}).map(([k, v]) => [normalize(k), v])]);
  const phrases = new Map((story.phrases ?? []).map((p) => [normalize(p.de), p]));

  const missing = new Set();
  const matched = new Set();
  let sentences = 0;

  for (const paragraph of story.paragraphs ?? []) {
    for (const sentence of paragraph.sentences ?? []) {
      sentences++;
      if (!sentence.en?.trim()) note(entry.file, `sentence without translation: "${sentence.de}"`);

      const tokens = tokenize(sentence.de);
      markPhrases(tokens, phrases);
      for (const token of tokens.filter((t) => t.type === 'word')) {
        if (token.phrase) matched.add(normalize(token.phrase.de));
        if (isLookupWorthy(token.text) && !words.has(normalize(token.text))) missing.add(token.text);
      }
    }
  }

  // Glossary values name the base form in brackets — "looks for (suchen)".
  // Every infinitive quoted that way should have a conjugation table.
  const quotedInfinitives = new Set();
  for (const value of Object.values(story.glossary ?? {})) {
    for (const [, inside] of String(value).matchAll(/\(([^)]*)\)/g)) {
      const candidate = inside.split(/[—,;]/)[0].trim().replace(/^sich /, '');
      if (/^[a-zäöüß]{3,}(?:en|eln|ern)$/.test(candidate)) quotedInfinitives.add(candidate);
    }
  }
  const unknownVerbs = [...quotedInfinitives].filter((v) => !(v in verbData));
  if (unknownVerbs.length) note(entry.file, `no conjugation table for: ${unknownVerbs.join(', ')}`);

  const unmatched = [...phrases.keys()].filter((key) => !matched.has(key));
  if (missing.size) note(entry.file, `no dictionary entry for: ${[...missing].join(', ')}`);
  if (unmatched.length) note(entry.file, `phrase never matches the text: ${unmatched.join(' | ')}`);

  const status = missing.size || unmatched.length ? '✗' : '✓';
  console.log(
    `${status} ${entry.id.padEnd(30)} ${String(entry.level).padEnd(3)} ` +
      `${String(sentences).padStart(2)} sentences · ${Object.keys(story.glossary ?? {}).length} words · ${phrases.size} phrases`,
  );
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nAll stories complete.');
