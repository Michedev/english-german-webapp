# Lesezeit

A Readle-style reader for German: the story is shown sentence by sentence with the
English translation underneath, and any word — or group of words — can be clicked
for its meaning.

No build step, no dependencies. Plain HTML, CSS and ES modules; stories are JSON files.

## Run

```sh
npm start           # http://localhost:5173  (node server.js, no install needed)
npm run check       # proofread the story folder (see "Adding stories")
```

The app fetches JSON, so it needs to be served over HTTP — opening `index.html`
from the filesystem will not work. Any static server does, e.g. `python3 -m http.server`.

## Reading

| Action | Result |
| --- | --- |
| Click a word | Translation popover; a word inside a known expression selects the whole expression |
| Click a verb | Adds a full table: present and Präteritum for all six persons, the Perfekt, and which case the verb takes. The form you clicked is highlighted |
| Drag across words / shift-click | Look up a group of words; falls back to word-by-word if the group is not in the dictionary |
| Click the `EN` pill, or the empty space in a line | Show/hide that sentence's translation |
| `Translations` dropdown | `on tap` (default), `always`, `never` |
| `★ Save to word list` | Keeps the word in the sidebar (localStorage) |

Text size, theme and the last story read are remembered between visits.

## The library

| Story | Level | Grammar and vocabulary it shows off |
| --- | --- | --- |
| Der Hund im Park | A1 | present tense, separable verbs (`ruft an`) |
| Im Supermarkt | A1 | shopping, `man`, paying: *Zahlen Sie bar oder mit Karte?* |
| Der verlorene Schlüssel | A2 | prepositions with dative, telling the time |
| Die falsche Fahrkarte | A2 | reflexive `es sich bequem machen`, travel vocabulary |
| Im Restaurant | A2 | ordering, `schmecken` + dative, *Zusammen oder getrennt?* |
| Beim Arzt | A2 | appointments, `Was fehlt Ihnen?`, `nichts Schlimmes` |
| Der Zettel im Buch | B1 | `als`-clauses, `damit`, Konjunktiv I in reported speech |
| Nachtschicht in der Bäckerei | B1 | `wenn`/`bevor` clauses, separable reflexives, `halb drei` |
| Die Wohnungsbesichtigung | B1 | flat hunting: Kaltmiete, Kaution, Schufa, `sich melden` |
| Auf dem Bürgeramt | B1 | registering an address, separable verbs rejoining in subclauses |
| Das Angebot | B2 | Konjunktiv II, passive, `ohne ... zu`, past narrative |

## Adding stories

Everything lives in [`stories/`](stories/) — see [stories/README.md](stories/README.md).
Short version: copy `stories/_template.json`, fill in the sentence pairs, `glossary`
and `phrases`, register the file in `stories/index.json`, then run:

```sh
npm run check
```

It reports every word with no dictionary entry and every phrase that never matches
the text — the two mistakes that are easy to make and invisible until a reader taps
the word.

## Layout

```
index.html                 markup and top bar
css/styles.css             all styling (light/dark via CSS variables)
js/app.js                  controller: state, preferences, wiring
js/library.js              reads stories/index.json, renders the sidebar
js/reader.js               renders a story, handles word click/drag selection
js/tokenize.js             splits sentences into words, matches known phrases
js/glossary.js             dictionary lookup (shared glossary + story glossary)
js/popover.js              the translation bubble
js/storage.js              localStorage: preferences and saved words
server.js                  static file server for local use
stories/                   the stories, one JSON file each
```

## Possible next steps

- Text-to-speech for a sentence (`speechSynthesis`, `de-DE` voice)
- Comprehension questions per story (a `questions` array in the story file)
- Export the saved word list to Anki/CSV
- A build script that generates `index.json` from the folder contents
