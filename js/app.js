/** Wires the library, the reader, the popover and the preferences together. */

import { loadManifest, loadStory, renderLibrary } from './library.js';
import { loadSharedGlossary, createDictionary } from './glossary.js';
import { loadVerbs, lookupVerb } from './verbs.js';
import { renderStory, clearSelection } from './reader.js';
import { createPopover } from './popover.js';
import { prefs, savedWords } from './storage.js';

const dom = {
  reader: document.getElementById('reader'),
  storyList: document.getElementById('story-list'),
  savedList: document.getElementById('saved-list'),
  savedCount: document.getElementById('saved-count'),
  clearSaved: document.getElementById('clear-saved'),
  popover: document.getElementById('popover'),
  sidebar: document.getElementById('sidebar'),
  scrim: document.getElementById('scrim'),
  footer: document.querySelector('.site-footer'),
  menuBtn: document.getElementById('menu-btn'),
  themeBtn: document.getElementById('theme-btn'),
  modeSelect: document.getElementById('translation-mode'),
  fontSmaller: document.getElementById('font-smaller'),
  fontLarger: document.getElementById('font-larger'),
};

const state = {
  manifest: [],
  story: null,
  dictionary: null,
  prefs: prefs.get(),
};

const popover = createPopover(dom.popover, {
  onSave: (word) => renderSavedWords(savedWords.add(word)),
  onClose: () => clearSelection(dom.reader),
});

init();

async function init() {
  applyPreferences();
  bindControls();
  renderSavedWords(savedWords.all());

  try {
    await Promise.all([loadSharedGlossary(), loadVerbs()]);
    state.manifest = await loadManifest();
  } catch (error) {
    showError(error);
    return;
  }

  if (!state.manifest.length) {
    dom.reader.innerHTML = '<p class="placeholder">No stories yet — add one in <code>stories/</code>.</p>';
    mountFooter();
    return;
  }

  const wanted = location.hash.slice(1) || state.prefs.lastStoryId;
  const entry = state.manifest.find((item) => item.id === wanted) ?? state.manifest[0];
  await openStory(entry);
}

async function openStory(entry) {
  popover.close();
  dom.reader.innerHTML = '<p class="placeholder">Loading…</p>';

  try {
    state.story = await loadStory(entry);
  } catch (error) {
    showError(error);
    return;
  }

  state.dictionary = createDictionary(state.story);
  renderStory(dom.reader, state.story, state.dictionary, { onSelectWords: handleSelection });
  mountFooter();

  state.prefs = prefs.set({ lastStoryId: entry.id });
  history.replaceState(null, '', `#${entry.id}`);
  renderLibrary(dom.storyList, state.manifest, entry.id, openStory);
  closeSidebar();
  dom.reader.scrollTo({ top: 0 });
}

function handleSelection({ surfaces, anchorRect, words }) {
  const isPhrase = words.length > 1 && words[0].dataset.phraseFrom !== undefined;
  const result =
    surfaces.length === 1
      ? { ...state.dictionary.word(surfaces[0]), kind: 'word' }
      : { ...state.dictionary.selection(surfaces), kind: isPhrase ? 'phrase' : 'selection' };

  const verb = findVerb(surfaces);

  popover.show({
    de: surfaces.join(' '),
    anchorRect,
    ...result,
    en: result.en ?? verb?.en ?? null,
    verb,
  });
}

/**
 * Which verb does a selection belong to?
 *
 * Order matters for separable verbs: in "zieht sich leise an" the prefix sits at
 * the end of the clause, so the finite form plus the last word ("zieht an") must
 * be tried before the bare "zieht" — otherwise anziehen (to get dressed) is
 * reported as ziehen (to pull).
 */
function findVerb(surfaces) {
  const candidates = [surfaces.join(' ')];
  if (surfaces.length > 1) candidates.push(`${surfaces[0]} ${surfaces.at(-1)}`);
  candidates.push(...surfaces);

  return candidates.map(lookupVerb).find(Boolean) ?? null;
}

/* ---------- preferences & chrome ---------- */

function applyPreferences() {
  const { translationMode, fontScale, theme } = state.prefs;
  document.body.dataset.translations = translationMode;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--font-scale', String(fontScale));
  dom.modeSelect.value = translationMode;
}

function bindControls() {
  dom.modeSelect.addEventListener('change', () => {
    state.prefs = prefs.set({ translationMode: dom.modeSelect.value });
    applyPreferences();
  });

  const setScale = (delta) => {
    const fontScale = Math.min(1.6, Math.max(0.8, +(state.prefs.fontScale + delta).toFixed(2)));
    state.prefs = prefs.set({ fontScale });
    applyPreferences();
  };
  dom.fontSmaller.addEventListener('click', () => setScale(-0.1));
  dom.fontLarger.addEventListener('click', () => setScale(0.1));

  dom.themeBtn.addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    const theme = order[(order.indexOf(state.prefs.theme) + 1) % order.length];
    state.prefs = prefs.set({ theme });
    applyPreferences();
  });

  dom.menuBtn.addEventListener('click', () => {
    const open = dom.sidebar.classList.toggle('is-open');
    dom.menuBtn.setAttribute('aria-expanded', String(open));
    dom.scrim.hidden = !open;
  });
  dom.scrim.addEventListener('click', closeSidebar);

  dom.clearSaved.addEventListener('click', () => renderSavedWords(savedWords.clear()));

  // Deep links and the browser's back button change only the fragment.
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (!id || id === state.story?.id) return;
    const entry = state.manifest.find((item) => item.id === id);
    if (entry) openStory(entry);
  });
}

function closeSidebar() {
  dom.sidebar.classList.remove('is-open');
  dom.menuBtn.setAttribute('aria-expanded', 'false');
  dom.scrim.hidden = true;
}

function renderSavedWords(items) {
  dom.savedCount.textContent = String(items.length);
  dom.clearSaved.hidden = items.length === 0;

  dom.savedList.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement('li');
      li.className = 'saved-list__item';

      const text = document.createElement('span');
      text.innerHTML = `<b>${item.de}</b><span>${item.en}</span>`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-btn icon-btn--tiny';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${item.de}`);
      remove.addEventListener('click', () => renderSavedWords(savedWords.remove(item.de)));

      li.append(text, remove);
      return li;
    }),
  );
}

/**
 * The AI disclaimer lives at the end of the story, so it has to be re-attached
 * every time the reader's contents are replaced. Moving the node keeps the text
 * itself in index.html rather than duplicating it here.
 */
function mountFooter() {
  dom.reader.append(dom.footer);
}

function showError(error) {
  dom.reader.innerHTML = `<p class="placeholder placeholder--error">${error.message}<br />
    <small>Serve the folder over HTTP (<code>npm start</code>) — opening index.html directly blocks fetch().</small></p>`;
  mountFooter();
}
