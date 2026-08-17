/** The little translation bubble shown above a clicked word. */

import { PERSONS, CASE_LABELS } from './conjugate.js';

const MARGIN = 8;

export function createPopover(element, { onSave, onClose }) {
  let current = null;

  const close = () => {
    if (!current) return;
    current = null;
    element.hidden = true;
    element.replaceChildren();
    onClose?.();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!current || element.contains(event.target) || event.target.closest('.word')) return;
    close();
  });

  window.addEventListener('resize', close);
  window.addEventListener('scroll', close, true);

  return {
    close,

    /**
     * @param {{de:string, en:string|null, note?:string, kind:'word'|'phrase'|'selection',
     *          parts?:Array<{de:string,en:string|null}>, anchorRect:DOMRect}} entry
     */
    show(entry) {
      current = entry;
      element.replaceChildren(renderBody(entry, onSave, close));
      element.hidden = false;
      position(element, entry.anchorRect);
    },
  };
}

function renderBody(entry, onSave, close) {
  const fragment = document.createDocumentFragment();

  const head = document.createElement('div');
  head.className = 'popover__head';

  const term = document.createElement('span');
  term.className = 'popover__term';
  term.textContent = entry.de;
  head.append(term);

  if (entry.kind !== 'word') {
    const badge = document.createElement('span');
    badge.className = 'popover__badge';
    badge.textContent = entry.kind === 'phrase' ? 'expression' : 'selection';
    head.append(badge);
  }
  fragment.append(head);

  const translation = document.createElement('p');
  translation.className = entry.en ? 'popover__translation' : 'popover__translation popover__translation--empty';
  translation.textContent = entry.en ?? 'No dictionary entry — add it to the story file.';
  fragment.append(translation);

  if (entry.note) {
    const note = document.createElement('p');
    note.className = 'popover__note';
    note.textContent = entry.note;
    fragment.append(note);
  }

  // Word-by-word fallback so a multi-word selection still says something useful.
  if (!entry.en && entry.parts?.length > 1) {
    const list = document.createElement('ul');
    list.className = 'popover__parts';
    for (const part of entry.parts) {
      const item = document.createElement('li');
      item.innerHTML = `<b>${part.de}</b> — <span>${part.en ?? '?'}</span>`;
      list.append(item);
    }
    fragment.append(list);
  }

  if (entry.verb) fragment.append(renderVerb(entry.verb, entry.de));

  const actions = document.createElement('div');
  actions.className = 'popover__actions';

  if (entry.en) {
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'text-btn';
    save.textContent = '★ Save to word list';
    save.addEventListener('click', () => {
      onSave({ de: entry.de, en: entry.en });
      save.textContent = '✓ Saved';
      save.disabled = true;
    });
    actions.append(save);
  }

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'text-btn';
  dismiss.textContent = 'Close';
  dismiss.addEventListener('click', close);
  actions.append(dismiss);

  fragment.append(actions);
  return fragment;
}

/**
 * Full present and past table for a verb, with the form the reader clicked
 * highlighted so the conjugation is anchored to the sentence in front of them.
 */
function renderVerb(verb, clicked) {
  const section = document.createElement('section');
  section.className = 'verb';

  const head = document.createElement('p');
  head.className = 'verb__head';
  head.innerHTML = `<b>${verb.infinitive}</b> <span>${verb.en}</span>`;
  section.append(head);

  const government = document.createElement('p');
  government.className = 'verb__case';
  government.innerHTML =
    `<span class="verb__tag">${CASE_LABELS[verb.case] ?? verb.case}</span>` +
    (verb.usage ? ` ${verb.usage}` : '');
  section.append(government);

  // The reader may have clicked "zieht sich leise an" while the cell reads
  // "zieht sich an", so the finite form alone decides the highlight.
  const wanted = clicked.toLowerCase();
  const wantedFinite = wanted.split(' ')[0];
  const isClicked = (form) => form.toLowerCase() === wanted || form.split(' ')[0].toLowerCase() === wantedFinite;

  const table = document.createElement('table');
  table.className = 'verb__table';
  table.innerHTML = `<thead><tr><th></th><th>Präsens</th><th>Präteritum</th></tr></thead>`;

  const body = document.createElement('tbody');
  for (const person of PERSONS) {
    const row = document.createElement('tr');
    row.innerHTML = `<th>${person.label}</th>`;
    for (const tense of ['praesens', 'praeteritum']) {
      const cell = document.createElement('td');
      cell.textContent = verb.tables[tense][person.key];
      if (isClicked(verb.tables[tense][person.key])) cell.className = 'is-clicked';
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body);
  section.append(table);

  const perfect = document.createElement('p');
  perfect.className = 'verb__perfect';
  perfect.innerHTML = `Perfekt: <b>er ${verb.tables.perfekt}</b>`;
  section.append(perfect);

  return section;
}

function position(element, rect) {
  element.style.visibility = 'hidden';
  element.style.left = '0px';
  element.style.top = '0px';

  const box = element.getBoundingClientRect();
  const left = clamp(
    rect.left + (rect.right - rect.left) / 2 - box.width / 2,
    MARGIN,
    window.innerWidth - box.width - MARGIN,
  );

  const above = rect.top - box.height - MARGIN;
  const top = above > MARGIN ? above : rect.bottom + MARGIN;

  element.style.left = `${left + window.scrollX}px`;
  element.style.top = `${top + window.scrollY}px`;
  element.classList.toggle('popover--below', above <= MARGIN);
  element.style.visibility = 'visible';
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));
