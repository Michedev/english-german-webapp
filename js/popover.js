/** The little translation bubble shown above a clicked word. */

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
