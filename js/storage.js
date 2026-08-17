/** Reading preferences and the saved word list, kept in localStorage. */

const PREFS_KEY = 'lesezeit.prefs';
const WORDS_KEY = 'lesezeit.words';

const DEFAULT_PREFS = {
  translationMode: 'tap', // 'tap' | 'always' | 'never'
  fontScale: 1,
  theme: 'auto', // 'auto' | 'light' | 'dark'
  lastStoryId: null,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — preferences just do not persist */
  }
}

export const prefs = {
  get: () => read(PREFS_KEY, DEFAULT_PREFS),
  set(patch) {
    const next = { ...this.get(), ...patch };
    write(PREFS_KEY, next);
    return next;
  },
};

export const savedWords = {
  all: () => read(WORDS_KEY, { items: [] }).items,
  add(word) {
    const items = this.all().filter((item) => item.de !== word.de);
    items.unshift({ ...word, addedAt: new Date().toISOString() });
    write(WORDS_KEY, { items });
    return items;
  },
  remove(de) {
    const items = this.all().filter((item) => item.de !== de);
    write(WORDS_KEY, { items });
    return items;
  },
  clear() {
    write(WORDS_KEY, { items: [] });
    return [];
  },
};
