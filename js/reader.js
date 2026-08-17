/**
 * Renders a story: German sentence on top, English translation underneath,
 * every word individually clickable.
 */

import { tokenize, markPhrases } from './tokenize.js';

/**
 * @param {HTMLElement} container
 * @param {object} story
 * @param {object} dictionary from createDictionary()
 * @param {{onSelectWords: (payload) => void}} handlers
 */
export function renderStory(container, story, dictionary, handlers) {
  container.replaceChildren();

  const header = document.createElement('header');
  header.className = 'story-header';
  header.innerHTML = `
    <h2 class="story-header__title">${escape(story.title)}</h2>
    ${story.titleEn ? `<p class="story-header__subtitle">${escape(story.titleEn)}</p>` : ''}
    <p class="story-header__meta">${[story.level, story.minutes && `${story.minutes} min`, story.author]
      .filter(Boolean)
      .map(escape)
      .join(' · ')}</p>
  `;
  container.append(header);

  const article = document.createElement('article');
  article.className = 'story';

  story.paragraphs.forEach((paragraph, paragraphIndex) => {
    const block = document.createElement('div');
    block.className = 'paragraph';

    paragraph.sentences.forEach((sentence, sentenceIndex) => {
      block.append(
        renderSentence(sentence, `${paragraphIndex}-${sentenceIndex}`, dictionary, handlers),
      );
    });

    article.append(block);
  });

  container.append(article);
}

function renderSentence(sentence, id, dictionary, handlers) {
  const tokens = tokenize(sentence.de);
  markPhrases(tokens, dictionary.phrases);

  const wrapper = document.createElement('div');
  wrapper.className = 'sentence';
  wrapper.dataset.sentenceId = id;

  const german = document.createElement('p');
  german.className = 'sentence__de';

  for (const token of tokens) {
    if (token.type === 'gap') {
      german.append(document.createTextNode(token.text));
      continue;
    }

    const word = document.createElement('span');
    word.className = 'word';
    word.textContent = token.text;
    word.dataset.index = String(token.index);
    word.tabIndex = 0;
    word.setAttribute('role', 'button');
    if (token.phrase) {
      word.classList.add('word--phrase');
      word.dataset.phraseFrom = String(token.phrase.from);
      word.dataset.phraseTo = String(token.phrase.to);
    }
    german.append(word);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'sentence__toggle';
  toggle.textContent = 'EN';
  toggle.setAttribute('aria-label', 'Show translation of this sentence');
  toggle.addEventListener('click', () => wrapper.classList.toggle('is-revealed'));

  const english = document.createElement('p');
  english.className = 'sentence__en';
  english.textContent = sentence.en;

  german.append(toggle);
  wrapper.append(german, english);

  attachWordSelection(german, wrapper, handlers);
  return wrapper;
}

/**
 * Click a word for a single lookup; drag or shift-click across several words to
 * look up a group (useful for expressions the story does not list explicitly).
 */
function attachWordSelection(germanElement, sentenceElement, handlers) {
  let anchor = null;
  let dragging = false;

  const wordsIn = (from, to) =>
    [...germanElement.querySelectorAll('.word')].filter((word) => {
      const index = Number(word.dataset.index);
      return index >= Math.min(from, to) && index <= Math.max(from, to);
    });

  const highlight = (words) => {
    germanElement.querySelectorAll('.word.is-selected').forEach((w) => w.classList.remove('is-selected'));
    words.forEach((word) => word.classList.add('is-selected'));
  };

  const emit = (words) => {
    if (!words.length) return;
    handlers.onSelectWords({
      words,
      surfaces: words.map((word) => word.textContent),
      sentence: sentenceElement,
      anchorRect: unionRect(words),
    });
  };

  germanElement.addEventListener('pointerdown', (event) => {
    const word = event.target.closest('.word');
    if (!word) return;
    event.preventDefault();

    if (event.shiftKey && anchor !== null) {
      const words = wordsIn(anchor, Number(word.dataset.index));
      highlight(words);
      emit(words);
      return;
    }

    anchor = Number(word.dataset.index);
    dragging = true;
    // A word inside a known expression selects the whole expression by default.
    const words =
      word.dataset.phraseFrom !== undefined
        ? wordsIn(Number(word.dataset.phraseFrom), Number(word.dataset.phraseTo))
        : [word];
    highlight(words);
  });

  germanElement.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const word = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.word');
    if (!word || !germanElement.contains(word)) return;
    highlight(wordsIn(anchor, Number(word.dataset.index)));
  });

  const finish = () => {
    if (!dragging) return;
    dragging = false;
    emit([...germanElement.querySelectorAll('.word.is-selected')]);
  };

  germanElement.addEventListener('pointerup', finish);
  germanElement.addEventListener('pointercancel', () => {
    dragging = false;
  });

  germanElement.addEventListener('keydown', (event) => {
    const word = event.target.closest('.word');
    if (!word || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    const words =
      word.dataset.phraseFrom !== undefined
        ? wordsIn(Number(word.dataset.phraseFrom), Number(word.dataset.phraseTo))
        : [word];
    highlight(words);
    emit(words);
  });

  // Tapping the blank space around the words flips the translation.
  germanElement.addEventListener('click', (event) => {
    if (event.target.closest('.word') || event.target.closest('.sentence__toggle')) return;
    sentenceElement.classList.toggle('is-revealed');
  });
}

export function clearSelection(container) {
  container.querySelectorAll('.word.is-selected').forEach((w) => w.classList.remove('is-selected'));
}

function unionRect(elements) {
  const rects = elements.map((element) => element.getBoundingClientRect());
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character],
  );
}
