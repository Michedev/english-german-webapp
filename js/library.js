/**
 * The story folder.
 *
 * `stories/index.json` is the manifest: a static site cannot list a directory,
 * so every story file is registered there once. See stories/README.md.
 */

const STORIES_DIR = 'stories';

export async function loadManifest() {
  const response = await fetch(`${STORIES_DIR}/index.json`);
  if (!response.ok) throw new Error(`Cannot load story index (${response.status})`);
  const manifest = await response.json();
  return manifest.stories ?? [];
}

export async function loadStory(entry) {
  const response = await fetch(`${STORIES_DIR}/${entry.file}`);
  if (!response.ok) throw new Error(`Cannot load "${entry.file}" (${response.status})`);
  const story = await response.json();
  return { ...story, id: story.id ?? entry.id };
}

export function renderLibrary(listElement, entries, activeId, onSelect) {
  listElement.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'story-list__item';
      button.setAttribute('aria-current', String(entry.id === activeId));
      button.addEventListener('click', () => onSelect(entry));

      const title = document.createElement('span');
      title.className = 'story-list__title';
      title.textContent = entry.title;

      const meta = document.createElement('span');
      meta.className = 'story-list__meta';
      meta.textContent = [entry.level, entry.minutes && `${entry.minutes} min`]
        .filter(Boolean)
        .join(' · ');

      button.append(title, meta);
      if (entry.summary) {
        const summary = document.createElement('span');
        summary.className = 'story-list__summary';
        summary.textContent = entry.summary;
        button.append(summary);
      }

      item.append(button);
      return item;
    }),
  );
}
