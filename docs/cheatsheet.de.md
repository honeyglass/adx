# adx auf einen Blick

## Die Idee

adx ist ein TypeScript-Toolkit für Kommandozeilen-Tools, die ein KI-Agent bedient.
Du beschreibst jeden Befehl mit einem Zod-Schema und einer Funktion.
adx liest die Argumente, prüft sie, schreibt die Antwort und setzt den Exit-Code.

Von den 16 Agent-DX-Regeln sind 15 eingebaut. Regel 6, der Agent-Skill, ist Sache des Autors.

## Das kleinste Tool

Die drei Blöcke sind zusammen eine Datei, `hello.ts`.

```ts
import { z } from 'zod';
import { tool } from '@honeyglass/adx';

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
});
```

```ts
hello.read({
  name: 'greet',
  does: 'greets one person',
  input: z.object({ name: z.string().describe('who to greet') }),
  example: { name: 'Ada' },
  run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
});
```

```ts
if (import.meta.main) await hello.main();
```

Dazu eine `tsconfig.json` mit einer Zeile:

```json
{ "extends": "@honeyglass/adx/tsconfig.json" }
```

adx braucht Node 24.2 oder neuer.

## Was der Aufrufer dafür bekommt

- Text am Terminal, JSON in einer Pipe.
- `--name` als Option, die ganze Eingabe als `--json`, oder beides in einem Aufruf.
- Alle Fehler eines Aufrufs in einer Antwort, jeder mit Hinweis.
- `hello schema greet`: die genaue Eingabe als JSON Schema.
- `hello schema`: jeder Code und was jede Art von Ablehnung verlangt.
- `hello` allein: die Befehle und der erste Schritt.
- Exit-Codes 0, 1 und 2.
- Ein Tippfehler in einem Feldnamen kompiliert nicht.

## Die API

### Das Tool

- `tool({ name, version, does })`: legt das Tool an.
- `skill`: optional, der Pfad zur Agent-Skill-Datei, relativ zum Ordner der `package.json`. Das Tool öffnet die Datei nie. Nur das Testkit liest ihr Frontmatter.
- `roots`, `remotes`: die Ordner und Server, die das Tool nutzen darf.
- `stored`: jede Datenart, die das Tool speichert, mit ihrer Formatnummer.
- `global`: Eingabe, die jeder Befehl teilt (`input`, `example`, `values`).
- `hello.start(fn)`: die ersten Schritte der Startantwort. Der Aufruf steht nach den Befehlen.
- `hello.main()`: führt einen Aufruf aus.

```ts
hello.start(async () => {
  const friends = await friendNames();
  return friends.length === 0 ? [add.step()] : [greet.step()];
});
```

### Die drei Arten von Befehlen

- `hello.read({...})`: liest nur. Handler: `run`.
- `hello.list({...})`: antwortet mit einer Liste. Handler: `run`. Braucht `item`, `key`, `outline`.
- `hello.effect({...})`: ändert etwas. Handler: `plan`, bei einem Senden auch `apply`.

Jede gibt einen Handle zurück. Halte ihn in einer `const`, für Schritte und Tests.

### Eigenschaften, die jede Art hat

- `name`: der Befehl. Ein Leerzeichen bildet eine Gruppe (`'friends add'`).
- `does`: ein Satz, was der Befehl tut.
- `input`: das Zod-Schema der Eingabe. Jedes Feld ist auch eine Option.
- `example`: eine gültige Eingabe. adx prüft sie beim Start, der Test ruft sie auf.
- `values`: woher die Werte eines Feldes kommen.
- `check`: Regeln über mehrere Felder. Antwortet mit allen Problemen auf einmal.
- `next`: die Schritte nach einem Erfolg. Bekommt die Antwort und die Eingabe.
- `text`: die Form am Terminal.
- `global`: wie der Befehl die globalen Felder nutzt (siehe unten).

### Eigenschaften einer Art

- `read`: `output` (das Schema der Antwort). Damit nimmt der Befehl `--fields`, und `schema` zeigt die Antwort. Ein `read`, das mit einer langen Liste oder einem großen Dokument antwortet, braucht es.
- `list`: `item` (Schema eines Eintrags), `key` (das Feld, das einen Eintrag benennt), `outline` (weitere Felder der Kurzform), `pageSize`.
- `effect`: `plan` (prüft und plant), `apply` (sendet), `look` (der Aufruf, der zeigt, ob ein Senden gewirkt hat), `replace: false` (der Befehl nimmt kein `--replace`).

```ts
output: Ticket,
```

### Handler: immer `(input, ctx)`

| Handler      | `ctx`                      |
| :----------- | :------------------------- |
| `run` (read) | `refuse`                   |
| `run` (list) | `refuse`, `page`           |
| `plan`       | `refuse`, `files`          |
| `apply`      | `refuse`, `act`, `planned` |

```ts
run: (_, { page }) => paged(LANGUAGES, page),
```

### Dateien in `plan`

```ts
plan: (note, { files }) => files.write(note.file, render(note)),
```

```ts
plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
```

- `files.write(file, data)`: merkt eine neue Datei vor. Gibt es die Datei schon, braucht der Aufruf `--replace`.
- `files.update(file, limit, old => next)`: merkt eine Änderung vor. adx liest die Datei selbst, bis zur Grenze, und ruft die Funktion auf. Nimmt kein `--replace`. Fehlt die Datei: `FILE_NOT_FOUND`, Art `fix`.
- Beide antworten `{ file, bytes, replaces }`, beim Ersetzen auch `changes`.
- adx schreibt alle vorgemerkten Dateien nach `plan`, alle oder keine. Im Probelauf schreibt adx nichts.
- Dateien gibt es nur in `plan`. Ein `files.remove` gibt es noch nicht.

### Senden in `apply`

```ts
apply: async ({ project, title, body, label }, { act }) => {
  const data = { title, body, labels: label };
  const request = api.post(['projects', project, 'tickets'], data);
  return { ticket: await act.send('the new ticket', request, Ticket) };
},
```

- `act.send(label, request, schema)`: sendet. `act` gibt es nur in `apply`, und `apply` läuft im Probelauf nie.
- `apply` gibt nur zurück, was der echte Lauf hinzufügt. Die Antwort ist `{ ...planned, ...applied }`.
- Der Probelauf antwortet mit dem, was `plan` zurückgibt. Beide Läufe haben dieselben Felder, der echte dazu die von `apply`.
- `--dry-run` hat jeder Effekt. Es lässt sich nicht abschalten.

### Globale Eingabe

- `tool({ global: { input, example, values } })`: Jeder Befehl nimmt die Felder, etwa `--project`.
- `global: false` an einem Befehl: Er nimmt kein globales Feld (etwa `whoami`).
- `global: { project: 'optional' }`: Das Feld darf fehlen. `run` sieht `string | undefined`.
- `schema` zeigt pro Befehl, ob er die Option nimmt. adx trägt den Wert nur in Schritte zu Befehlen, die sie haben.

```ts
global: { project: 'optional' },
```

### Wertequellen in `values`

- `z.enum([...])` im Schema: eine feste Liste. Mehr ist nicht nötig.
- eine Funktion: eine berechnete Liste, `() => [{ value, does }]`.
- `fresh(fn)`: ein neuer Name. `fn` antwortet mit den vergebenen Namen. `fresh` lehnt nichts ab.
- `keyOf(list)`: Das Feld nimmt einen Schlüssel dieser Liste.
- `detailOf(list)`: wie `keyOf`, und dieser Befehl zeigt einen Eintrag ganz.
- `needs('project')`: Rückgabe einer Quelle, die erst ein anderes Feld braucht.
- `needs('project', 'team')`: mehrere Felder. adx lehnt mit einem Problem `MISSING_VALUE` pro Feld ab, in einer Antwort.

```ts
values: { name: fresh(friendNames), lang: languageChoices },
```

```ts
values: { code: detailOf(languages) },
```

Jedes `id()`-Feld braucht eine Quelle. Sonst startet das Tool nicht.

### Ablehnungen

- `code('NO_FORMAL_GREETING', 'fix', 'hint')`: legt einen Code mit Art und Hinweis an.
- `.at('style', 'message')`: macht daraus ein Problem an einem Feld. Ohne Meldung wiederholt sie den Hinweis.
- `.issue('message')`: ein Problem, das kein Feld betrifft. Es hat keinen `path`.
- `.command(step)`: hängt einen Befehl an, der weiterhilft.
- `refuse(...)` aus `ctx`: lehnt ab. Der Handler gibt das Ergebnis zurück.
- `failed(state, error)`: wird in `apply` geworfen, mit einem Satz zum Zustand.

```ts
const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
```

```ts
return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
```

Schichten: Argumente, Schema, jeder Wert gegen seine Liste, `check`, Handler.

### Schritte

- `greet.step({ lang: 'de' })`: ein Schritt zu einem Befehl. Er nennt nur echte Befehle und Felder.
- `needs` leitet adx ab: Pflichtfelder, die der Schritt offen lässt.
- `.needs('style')`: nur für ein optionales Feld, das der Schritt noch braucht.
- `tell('upload the file')`: ein Schritt für die Person, ohne Befehl.
- Folgt nichts, gibt `next` keinen Schritt zurück.

### Ordner und Dateien

- `root('home', envDir('HELLO_HOME'))`: der Datenordner. Ohne zweites Argument liegt er in `~/.hello`, abgeleitet aus dem Namen des Tools.
- `envDir('NOTES_HOME', '~/notes')`: ein eigener Ort. adx liest keine `XDG_*`-Variable.
- `root('module', marker('go.mod'))`: der nächste Ordner mit dieser Datei. `cwd`: das Arbeitsverzeichnis.
- `dir(root)`, `inFile(root)`, `outFile(root)`: Schemas für Pfade in einem Ordner.
- `home.file('index.md')`: eine eigene Datei des Tools.
- `home.list('friends', '.json')`: die Dateien eines Unterordners.
- `File`: `rel`, `exists`, `text(limit)`, `bytes(limit)`, `json(limit, schema)`.

### Der Datenordner

- Verschieben: mit der Variable (`HELLO_HOME`) oder mit der Option des Roots (`--home`). Die Option gewinnt und lässt sich nicht abschalten.
- adx trägt den Ordner in jeden Befehl, den es in `next` oder in einem Problem nennt, sobald er nicht der Standard ist.
- Ein Ordner aus Variable oder Option muss existieren. Ein leerer Wert, ein relativer Pfad, eine Datei oder ein fehlender Ordner: `ROOT_NOT_FOUND`, Art `ask`. adx weicht nie auf den Standard aus.
- Der Standardordner darf fehlen. Ein Lesebefehl und ein Probelauf legen nichts an. Der erste echte Schreibvorgang legt ihn an.
- Modi: `0700` für Ordner, `0600` für Dateien. Eine ersetzte Datei behält ihren Modus.
- `files.write(file, data, { mode: 0o644 })`: ein eigener Modus.
- Jeder Effekt nimmt `--replace`. Auf einen neuen Namen geht es durch. Merkt der Plan kein `files.write` vor, wird es abgelehnt.
- Mit `replace: false` listet `schema` die Option nicht, und der Hinweis bei einer vorhandenen Datei lautet "pick another name".
- `changes`: `{ added, changed, removed, more }`. JSON-Pfade, sonst Zeilen, höchstens 20 pro Liste. `more` zählt den Rest. Ein Plan darf sein eigenes `changes` zurückgeben.
- adx speichert keine Geheimnisse. Ein Token kommt aus einer Umgebungsvariable, etwa `bearer('TRACKER_TOKEN')`.

Faustregel: `add`, `create`, `save` nutzen `files.write`. `edit`, `update`, `append` nutzen `files.update`.

```ts
hello.effect({
  name: 'friends edit',
  does: "changes a friend's language",
  input: FriendIn,
  example: { name: 'ada', lang: 'en' },
  values: { name: friendChoices },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => JSON.stringify({ ...JSON.parse(old), lang })),
});
```

### Gespeicherte Formate

- `stored('friend', 2, FriendV2)`: eine Datenart mit ihrer Formatnummer.
- `.from(1, FriendV1, old => ...)`: ein älteres Format und der Schritt zum nächsten. Mehrere nennst du vom neuesten abwärts.
- `stored: [Friend]` im Tool: Pflicht für jede Datenart.
- `Friend.stringify(value)` schreibt `"version": 2` in den Text. `Friend.parse(text)` und `file.json(limit, Friend)` lesen ihn. Eine Datei ohne das Feld ist Format 1.
- Ein Lesen wandelt eine ältere Datei nur im Speicher um. Der nächste echte Schreibvorgang legt das neue Format ab.
- Neueres Format: `NEWER_VERSION`. Schema nicht erfüllt: `STORED_INVALID`. Beide haben die Art `ask`.
- Die Nummer zählt das Format einer Datenart, nicht die Version des Tools. Du erhöhst sie von Hand, wenn sich die gespeicherten Felder ändern.
- Sie sinkt nie und wird nie zweimal vergeben. Jede Datenart hat ihre eigene Nummer, und `tool schema` zeigt sie.
- Das Testkit schreibt beim ersten Lauf einen Fingerabdruck jedes Schemas pro Nummer in eine Datei neben der `package.json`. Danach vergleicht es. Ändert sich das Schema ohne die Nummer, schlägt der Test fehl.

```ts
const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));
```

### Server

- `remote('tracker', { url: envUrl(...), auth: bearer('TRACKER_TOKEN') })`.
- `api.get(path, schema, { query, on })`: liest. Jede Antwort läuft durch ihr Schema.
- `on: { 404: undefined }`: Bei diesem Status antwortet `get` mit dem Wert, hier `undefined`. Jeder andere Status geht auch, etwa ein 409.
- `api.post(path, body)`: baut eine Anfrage (auch `put`, `patch`, `delete`). Erst `act.send` sendet sie.
- Ein Pfad ist ein Array aus Teilen: `['projects', project, 'tickets']`.
- Ein Lesen versucht adx bis zu 3-mal erneut, mit wachsender Pause, bei einem Netzwerkfehler, einem 429 oder einem 503.
- Ein Senden versucht adx nie erneut. Der Agent bekommt die Art `retry` und den `look`-Schritt.
- Das Token steht in einer Umgebungsvariable. `schema` nennt die Variable, nie ihren Wert. Fehlt sie: `ENV_MISSING`, Art `ask`.

```ts
const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
```

### Schemas von adx

- `id()`: ein Name aus Buchstaben, Ziffern, `-` und `_`.
- `multiline()`: Text mit Zeilenumbrüchen. `z.string()` ist eine sichtbare Zeile.
- `paged(all, page)`: schneidet eine Seite aus einem Array.

### Tests

```ts
test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'tracker.ts'], samples));
```

- `conformance`: prüft jeden Befehl gegen die 15 eingebauten Regeln, im Prozess oder als echtes Programm.
- `fake(api, routes)`, `reply(503)`: ein Server für den Test, als Tabelle von Routen.
- `samples`: `env`, `fakes`, `seed`. Das, was nur du weißt.
- `list.invoke(input, options)`: ein Befehl ohne argv, mit typisierter Eingabe. Optionen: die Samples, `dryRun`, `replace`.
- Das Testkit zerlegt jeden genannten Befehl (in `next` oder in einem Problem) mit `unbash` und prüft, dass adx ihn kennt.
- Nennt das Tool einen `skill`, prüft das Testkit: Die Datei existiert und hat ein Frontmatter mit `name` und `description`. Mehr liest es nicht.
- Ein Effekt, der `--replace` listet und nie ein `files.write` vormerkt, schlägt fehl: `replace: false` ergänzen.
- Ein `read`, das ohne `output` mit einer langen Liste oder einem großen Dokument antwortet, schlägt fehl.
- `adxcheck report` und `adxcheck run`: dieselbe Prüfung als Befehl. Ohne Skill meldet der Bericht "none named", nicht "met".

## Auf der Kommandozeile

Das Tool allein:

```console
$ hello | jq -c '.result | {name, skill}, .next[0].command'
{"name":"hello","skill":null}
"hello schema"
```

Das Schema:

```console
$ hello schema greet | jq -c '.result.input.required'
["name"]
$ hello schema | jq -c '.result.kinds.ask'
{"exit":1,"does":"only the person can solve it: stop and ask"}
```

Eine Option ohne Wert listet ihre Werte:

```console
$ hello greet --style
option  style
values  casual, formal
```

Die Eingabe als JSON, als Optionen oder gemischt:

```console
$ hello greet --json '{"name":"Ada","lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"name":"Bob"}' | jq -r '.issues[0].code'
REPEATED_OPTION
```

Terminal und Pipe:

```console
$ hello greet --name Ada
greeting  Hello, Ada!
$ hello greet --name Ada | cat
{"ok":true,"result":{"greeting":"Hello, Ada!"}}
```

Eine Ablehnung am Terminal:

```console
$ hello greet --nmae Ada
refused (fix): Nothing was changed.

UNKNOWN_OPTION at nmae
  greet has no option --nmae (its value was Ada)
  hint  Use an option the command lists
  run   hello schema greet
```

Felder und Seiten einer Liste:

```console
$ hello languages --fields code,formal | jq -c '.result.items[0]'
{"code":"ar","formal":"As-salamu alaykum"}
$ hello languages --page 10 | jq -c '.next[0].command'
"hello languages --page 20"
```

Probelauf:

```console
$ hello friends add --name ada --lang de --dry-run | jq -c '.applied'
false
$ hello friends add --name ada --lang de --dry-run | jq -r '.next[0].command'
hello friends add --name ada --lang de
```

Ersetzen:

```console
$ hello friends add --name ada --lang en | jq -r '.issues[0].hint'
add --replace to overwrite friends/ada.json
$ hello friends add --name ada --lang en | jq -r '.issues[0].command'
hello friends add --name ada --lang en --replace --dry-run
$ hello friends add --name ada --lang en --replace --dry-run | jq -c '.result.changes'
{"added":[],"changed":["lang"],"removed":[],"more":0}
```

Der Datenordner:

```console
$ hello friends add --name bob --lang en --home /tmp/h | jq -r '.next[0].command'
hello greet --lang en --home /tmp/h
$ HELLO_HOME= hello friends add --name | jq -r '.issues[0].code'
ROOT_NOT_FOUND
```

Eine Quelle, die zwei Felder braucht:

```console
$ tracker ticket schedule --milestone | jq -c '.issues[] | {code, path, command}'
{"code":"MISSING_VALUE","path":"project","command":"tracker ticket schedule --project"}
{"code":"MISSING_VALUE","path":"team","command":null}
```

Das zweite Problem hat keinen Befehl: Die Teams brauchen erst das Projekt. Sein Hinweis sagt das.

Eine Antwort:

```json
{
  "ok": true,
  "applied": true,
  "result": {},
  "next": [{ "does": "...", "command": "...", "needs": ["..."] }]
}
```

Eine Ablehnung:

```json
{
  "ok": false,
  "kind": "fix",
  "state": "Nothing was changed.",
  "issues": [
    {
      "code": "UNKNOWN_OPTION",
      "path": "nmae",
      "message": "greet has no option --nmae (its value was Ada)",
      "hint": "Use an option the command lists",
      "command": "hello schema greet"
    }
  ]
}
```

Eine Ablehnung hält nur Probleme. `next` gehört zu einem Erfolg.

Was adx jedem Tool noch gibt:

- `--output text` oder `--output json`: erzwingt die Form.
- `--dry-run`: an jedem Effekt.
- `--replace`: an jedem Effekt, außer mit `replace: false`. Erlaubt `files.write`, eine Datei zu ersetzen.
- `--fields`: an jeder Liste und an jedem `read` mit `output`.
- `--home`: an jedem Befehl eines Tools mit einem solchen Root.
- `--help` und `--version`. Die Hilfe kommt aus der Befehlstabelle, einen Hilfetext schreibst du nicht.
- `hello friends` (eine Gruppe allein): listet ihre Aktionen.
- `read` und `list` lehnen `--dry-run` ab, wie jede unbekannte Option.

Was ein genannter Befehl mitträgt:

- die Felder, die du dem Schritt gegeben hast;
- bei einem abgeleiteten Befehl die Felder des Aufrufs mit demselben Namen;
- die globalen Felder und den Datenordner, wenn er nicht der Standard ist.

Exit-Codes und Arten:

| Exit | Art     | Bedeutung                         |
| :--- | :------ | :-------------------------------- |
| 0    |         | Erfolg                            |
| 1    | `fix`   | der Aufrufer ändert die Eingabe   |
| 1    | `ask`   | nur die Person kann es lösen      |
| 1    | `retry` | ein späterer Aufruf kann gelingen |
| 2    | `bug`   | das Tool ist kaputt               |

## Die 16 Regeln und der Teil von adx

adx baut 15 Regeln ein. Regel 6 ist die des Autors.

1. Rohes JSON als Eingabe: `--json` füllt dasselbe Schema wie die Optionen, auch zusammen mit ihnen.
2. Schema zur Laufzeit: `tool schema` gibt das Schema aus, mit dem adx prüft, dazu Arten, Codes, Roots und Formatnummern.
3. JSON in der Pipe: nur adx schreibt auf stdout.
4. Harte Eingaben: `id()`, `dir`, `inFile`, `outFile`, jeder Pfad bleibt in seinem Root.
5. Probeläufe: `--dry-run` führt nur `plan` aus. `act.send` gibt es nur in `apply`. Der echte Lauf antwortet mit dem Plan und dem, was `apply` hinzufügt. Ersetzen braucht `--replace` und zeigt `changes`.
6. Agent-Skill: nicht eingebaut. Den Skill schreibt der Autor. adx prüft nur, dass eine genannte Skill-Datei existiert und ein Frontmatter hat.
7. Prüfungen in Schichten: Argumente, Schema, Listen, `check`, Handler.
8. Fehler mit Hinweis: `code()` verlangt den Hinweis, `.at()` das Feld.
9. Alles oder nichts: alle Dateien gehen durch `write` und `update` in `plan`. adx schreibt sie am Ende.
10. Exit-Codes 0, 1, 2: adx setzt sie aus der Art des Codes.
11. Plan vor der Datei: `plan` ist die Antwort des Probelaufs.
12. Hinweise, die laufen: adx füllt `command` aus der Quelle des Feldes und trägt den Datenordner hinein.
13. Optionen, die listen: jede Quelle in `values` beantwortet auch die leere Option.
14. Nächste Schritte: `start`, `next`, Schritte nur aus Befehlen, `needs` abgeleitet.
15. Nichts geht still durch: adx prüft jedes Argument selbst.
16. Sparsame Antworten: `outline`, `--fields`, `--page`, der Schritt zum `detailOf`-Befehl, `output` an einem `read`.

## Wie adx gebaut ist

- TypeScript mit Zod. Feldnamen sind Schlüssel des abgeleiteten Typs. Ein Tippfehler kompiliert nicht.
- Kein CLI-Framework. adx liest argv mit `util.parseArgs` (`strict: false`, `tokens: true`) und prüft jedes Token selbst.
- Eine Option, auf die eine Option folgt, gilt als ohne Wert gegeben. Eine unbekannte Option wird gesammelt, das Lesen geht weiter.
- Alle Fehler eines Aufrufs kommen in einer Antwort.
- Optionen und `--json` füllen ein Objekt. Ein Feld, das beide geben, wird abgelehnt (`REPEATED_OPTION`).
- Ein Feld `dueDate` ist die Option `--due-date`. Ein boolesches Feld ist ein Schalter ohne Wert.
- Routing und Hilfe kommen aus der Befehlstabelle von adx.
- Der Agent-Skill gehört nicht zum Toolkit. Das Tool liest ihn nie, bettet ihn nie ein und gibt ihn nie aus. Es nennt nur den Pfad, die Startantwort zeigt ihn.
- Die Codes und Arten von adx stehen einmal in adx. Jedes Tool gibt sie mit `tool schema` aus.
- Kein Anleitungstext und kein freier Hilfetext im Tool. Die ersten Schritte kommen aus `next` der Startantwort und aus den Hinweisen der Ablehnungen.
- `api` läuft intern auf RxJS: Wiederholungen, Zeitlimits, das Abbrechen mehrerer Anfragen. Der Autor sieht davon nichts.
- Node prüft keine Typen. Die Sicherheit gilt dort, wo `tsc --noEmit` läuft: im Editor, vor dem Commit und in CI.

## Bekannte Grenzen

- Eine gespeicherte Datei lässt sich über adx noch nicht löschen.
- Zwei Aufrufe, die dieselbe Datei im selben Moment schreiben, werden nicht abgestimmt. Der spätere gewinnt.
- Ein Handler, der selbst `node:fs` oder `fetch` aufruft, steht außerhalb der Regeln.
- Der Skill wird nicht gegen das Tool geprüft.
- `on` gibt es nur für `get`. Den Status eines Sendens liest du mit `status(error)`.
