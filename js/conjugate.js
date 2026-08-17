/**
 * German verb conjugation from principal parts.
 *
 * Weak (regular) verbs need no data at all beyond the infinitive: the endings,
 * the linking -e- (atmen → du atmest) and the participle are derived here.
 * Strong and mixed verbs supply only what is irregular — the changed du/er stem,
 * the Präteritum stem and the participle — in stories/_verbs.de-en.json.
 *
 * Everything in this file is pure, so scripts/check-stories.mjs can dump the
 * whole verb table and it can be proofread in one go.
 */

export const PERSONS = [
  { key: 'ich', label: 'ich', reflexive: 'mich' },
  { key: 'du', label: 'du', reflexive: 'dich' },
  { key: 'er', label: 'er/sie/es', reflexive: 'sich' },
  { key: 'wir', label: 'wir', reflexive: 'uns' },
  { key: 'ihr', label: 'ihr', reflexive: 'euch' },
  { key: 'sie', label: 'sie/Sie', reflexive: 'sich' },
];

/**
 * atmen → atmest, öffnen → öffnet: a consonant cluster needs a linking -e-.
 * The h is only silent after a vowel (wohnen → du wohnst, ahnen → du ahnst);
 * in rechnen it is part of the cluster, so rechnen → du rechnest.
 */
const needsLinkingE = (stem) =>
  /[dt]$/.test(stem) || (/[^aeiouäöümnlr][mn]$/.test(stem) && !/[aeiouäöü]h[mn]$/.test(stem));

/** heißen → du heißt: an s-sound already contains the -s- of the ending. */
const isSibilant = (stem) => /[sßxz]$/.test(stem);

function stemOf(infinitive) {
  if (/(?:el|er)n$/.test(infinitive)) return infinitive.slice(0, -1); // klingeln → klingel
  if (infinitive.endsWith('en')) return infinitive.slice(0, -2);
  if (infinitive.endsWith('n')) return infinitive.slice(0, -1); // tun → tu
  return infinitive;
}

function presentStems(infinitive) {
  const stem = stemOf(infinitive);
  // ich lächle, ich wedle — the -e- of -el- drops in the ich form.
  const ich = /eln$/.test(infinitive) ? `${stem.slice(0, -2)}le` : `${stem}e`;
  const t = needsLinkingE(stem) ? `${stem}et` : `${stem}t`;

  return {
    ich,
    du: needsLinkingE(stem) ? `${stem}est` : isSibilant(stem) ? `${stem}t` : `${stem}st`,
    er: t,
    wir: infinitive,
    ihr: t,
    sie: infinitive,
  };
}

/** Weak: suchte/suchtest… Strong: ging/gingst… — the endings differ. */
function preteriteForms(entry, stem) {
  if (entry.praet) {
    const s = entry.praet; // strong: the stem IS the ich/er form
    return {
      ich: s,
      du: isSibilant(s) ? `${s}t` : /[dt]$/.test(s) ? `${s}est` : `${s}st`,
      er: s,
      wir: `${s}en`,
      ihr: /[dt]$/.test(s) ? `${s}et` : `${s}t`,
      sie: `${s}en`,
    };
  }

  // Mixed verbs (denken → dachte) give a stem that takes the weak endings.
  const base = entry.praetWeak ?? (needsLinkingE(stem) ? `${stem}et` : `${stem}t`);
  return {
    ich: `${base}e`,
    du: `${base}est`,
    er: `${base}e`,
    wir: `${base}en`,
    ihr: `${base}et`,
    sie: `${base}en`,
  };
}

function participleOf(entry, infinitive, stem) {
  if (entry.part) return entry.part;
  const ending = needsLinkingE(stem) ? 'et' : 't';
  // -ieren verbs and inseparable prefixes (be-, ver-, ent-…) take no ge-.
  if (entry.noGe || /ieren$/.test(infinitive)) return `${stem}${ending}`;
  return `ge${stem}${ending}`;
}

/**
 * @param {string} infinitive full infinitive, including any separable prefix
 * @param {object} entry the record from _verbs.de-en.json
 * @returns {{infinitive:string, praesens:object, praeteritum:object, perfekt:string, forms:string[]}}
 */
export function conjugate(infinitive, entry = {}) {
  const prefix = entry.sep ?? '';
  const base = infinitive.slice(prefix.length); // anrufen → rufen
  const stem = stemOf(base);

  const praesens = { ...presentStems(base), ...pick(entry, ['ich', 'du', 'er']), ...(entry.praesens ?? {}) };
  const praeteritum = preteriteForms(entry, stem);
  const participle = prefix + participleOf(entry, base, stem);
  const auxiliary = entry.aux === 'sein' ? 'ist' : 'hat';

  const decorate = (form, person) =>
    [form, entry.refl ? person.reflexive : null, prefix || null].filter(Boolean).join(' ');

  const table = (forms) =>
    Object.fromEntries(PERSONS.map((person) => [person.key, decorate(forms[person.key], person)]));

  const praesensTable = table(praesens);
  const praeteritumTable = table(praeteritum);

  return {
    infinitive,
    praesens: praesensTable,
    praeteritum: praeteritumTable,
    // "hat sich angezogen" — a reflexive verb keeps its pronoun in the Perfekt.
    perfekt: [auxiliary, entry.refl ? 'sich' : null, participle].filter(Boolean).join(' '),
    participle,
    /**
     * Every surface form a reader could click, for the lookup index — taken from
     * the finished tables so separable and reflexive forms keep their extra
     * words ("zieht sich an", not "zieht").
     */
    forms: [
      infinitive,
      base,
      participle,
      ...PERSONS.flatMap((p) => [praesensTable[p.key], praeteritumTable[p.key]]),
    ],
  };
}

function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

/** Human-readable description of what the verb does to its object. */
export const CASE_LABELS = {
  acc: 'takes the accusative',
  dat: 'takes the dative',
  'acc+dat': 'dative person + accusative thing',
  nom: 'followed by the nominative',
  prep: 'used with a preposition',
  none: 'no object (intransitive)',
};
