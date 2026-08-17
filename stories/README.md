# The story folder

One JSON file per story, plus two shared files:

| File | Purpose |
| --- | --- |
| `index.json` | Manifest — the list of stories shown in the sidebar. A static site cannot list a directory, so each story is registered here. |
| `_glossary.de-en.json` | Shared dictionary: function words (articles, pronouns, prepositions, numbers) plus high-frequency everyday vocabulary. Loaded for every story, so a story file only needs its own topic words. |
| `_template.json` | Copy this to start a new story. |

## Adding a story

1. Copy `_template.json` to `my-story.json` and fill it in.
2. Add an entry to `index.json`:

```json
{ "id": "my-story", "file": "my-story.json", "title": "Mein Titel", "level": "B1", "minutes": 4, "summary": "One line." }
```

3. Run `npm run check` from the project root and fix what it reports.
4. Reload the page. Each story gets its own URL fragment, e.g. `#my-story`.

`npm run check` catches the two silent mistakes: a word with no dictionary entry
(the reader shows "no entry" when tapped) and a phrase written in a form that never
occurs in the text. Note that when two phrases overlap, the longer one wins — so
listing both `seit einer Woche` and `sucht seit einer Woche nach` leaves the short
one permanently unmatched, which the check reports.

## Story fields

- `paragraphs[].sentences[]` — `{ "de": ..., "en": ... }`. The German sentence is rendered on top, the English one underneath. Keep sentences whole: the pairing is what the reader shows.
- `glossary` — single words, keyed by the **surface form used in the text** (`"sucht"`, not `"suchen"`). Put the base form in the value: `"looks for (suchen)"`. Lookup is case-insensitive and the story glossary overrides the shared one.
- `phrases` — expressions whose meaning is not the sum of their words. Matching is on contiguous surface forms, so write `"hat es eilig"`, not `"es eilig haben"`, and add the infinitive as a `note`. Matched phrases get a green underline in the text and are selected as a unit when clicked.

A word without an entry still opens the popover — it just says there is none, which makes gaps easy to spot while proofreading a new story.
