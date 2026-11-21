# adx: vorher und nachher

Was sich bis zur API v2 ändert, in einfachen Worten. "Vorher" ist der Stand davor: die API der ersten Anleitung oder ein früherer Entwurf von v2. "Nachher" ist die API v2, wie `guide.de.md` sie beschreibt.

adx gibt es nur noch in TypeScript mit Zod. Die Go-Variante entfällt.

## Alle Änderungen

Der Agent-Skill und die Hilfe:

1. Der Agent-Skill ist optional und nur ein Pfad.
2. Das Tool enthält keinen Anleitungstext.
3. adx baut 15 Regeln ein, nicht 16.

Der Aufbau eines Befehls:

4. Die `tsconfig.json` hat eine Zeile.
5. Jeder Handler bekommt `(input, ctx)`.
6. Alle Wertequellen stehen in `values`, mit `detailOf` und `keyOf`.
7. `needs` eines Schritts leitet adx ab.
8. Eine Quelle nennt mehrere fehlende Felder, und jedes bekommt ein Problem.
9. `list` hat `check` und `next` wie die anderen Befehle.
10. Die Startschritte sind ein Aufruf nach den Befehlen.
11. `global` gilt für jeden Befehl, und ein Befehl kann abweichen.
12. Namen ändern sich: `multiline()`, `.command(step)`, `stringify`.
13. Optionen und `--json` gehen in einem Aufruf zusammen.
14. Eine Ablehnung ohne Feld nutzt `.issue()`.
15. Ein `read` kann seine Antwort mit `output` deklarieren.

Dateien und der Datenordner:

16. Ein Effekt merkt seine Dateien in `plan` vor, und nur dort.
17. Der echte Lauf antwortet mit dem Plan und dem, was `apply` hinzufügt.
18. Ersetzen entscheidet `files.write`, mit `--replace`.
19. `fresh` lehnt nichts mehr ab.
20. `files.update` für Befehle, die ändern.
21. Ein Ersetzen antwortet mit `changes`.
22. Der Ort des Datenordners kommt aus dem Namen des Tools.
23. Der Datenordner lässt sich auch mit einer Option verschieben.
24. Dateien bekommen feste Modi.
25. Gespeicherte Daten bekommen eine Formatnummer.
26. adx speichert keine Geheimnisse.
27. Ein Dateityp, und ein Schema für eine Datei zum Lesen.

Server:

28. `get` ordnet einen Status mit `on` zu.
29. Ein Lesen wird erneut versucht, ein Senden nie.
30. Im Tracker-Beispiel heißt das eigene Schema `Ticket`.

Tests und das Innere von adx:

31. Ein Test-Einstieg statt zwei.
32. Das Testkit zerlegt genannte Befehle mit `unbash`.
33. Das Testkit prüft vier weitere Dinge.
34. adx liest die Argumente mit `util.parseArgs`.
35. `api` läuft intern auf RxJS.

Noch nicht abgedeckt, vorher wie nachher: eine gespeicherte Datei löschen, und zwei Aufrufe, die dieselbe Datei gleichzeitig schreiben.

## 1. Der Agent-Skill ist optional und nur ein Pfad

Das Tool startet ohne Skill. Es liest den Skill nie, bettet ihn nie ein und gibt ihn nie aus.
Nennt das Tool einen Skill, prüft das Testkit nur: Die Datei existiert und hat ein Frontmatter mit `name` und `description`. Zeilen für Codes braucht der Skill nicht. Der Pfad ist ein String, relativ zum Ordner der `package.json`.

Vorher:

```ts
tool({ ..., skill: new URL('./SKILL.md', import.meta.url) }); // Pflicht
// hello skill      druckt die Datei
// node --test      28 codes have no row in SKILL.md
```

Nachher:

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  skill: 'SKILL.md',
  roots: [home],
});
```

```console
$ hello | jq -c '.result | {name, skill}'
{"name":"hello","skill":"/Users/ada/src/hello/SKILL.md"}
```

## 2. Das Tool enthält keinen Anleitungstext

Ein freier Text veraltet, und ein Agent liest ihn selten ganz. Die ersten Schritte kommen darum aus `next` der Startantwort und aus den Hinweisen der Ablehnungen. Die Codes und Arten von adx zeigt `schema`.

Vorher:

```console
$ hello skill
# hello
...
```

Nachher:

```console
$ hello | jq -c '.next[0]'
{"does":"remembers a friend","command":"hello friends add","needs":["name","lang"]}
$ hello schema | jq -c '.result.kinds.ask'
{"exit":1,"does":"only the person can solve it: stop and ask"}
```

## 3. adx baut 15 Regeln ein, nicht 16

Regel 6, der Agent-Skill, ist Sache des Autors. adx prüft nur, dass eine genannte Skill-Datei existiert und ein Frontmatter hat. Ein Tool ohne Skill gilt darum nicht als "erfüllt".

Vorher:

```text
Die 16 Agent-DX-Regeln sind eingebaut.
Agent skill         met
```

Nachher:

```text
15 Regeln sind eingebaut. Regel 6 ist die des Autors.
Agent skill         none named
```

## 4. Die `tsconfig.json` hat eine Zeile

Ohne `tsc` prüft niemand die Typen. Der Einstieg dazu soll kurz sein.

Vorher:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  }
}
```

Nachher:

```json
{ "extends": "@honeyglass/adx/tsconfig.json" }
```

## 5. Jeder Handler bekommt `(input, ctx)`

Vorher hatte jeder Handler eine andere Reihenfolge. Jetzt steht die Eingabe immer vorn, und `ctx` hält den Rest.
Ein Tippfehler in einer Ablehnung wird jetzt in der Zeile des Tippfehlers gemeldet.

Vorher:

```ts
run: (_, page) => paged(LANGUAGES, page),
run: ({ code }) => byCode(code) ?? refuse(unknownLanguage.at('code')),
apply: (planned, act, input) => ...,
```

Nachher:

```ts
run: (_, { page }) => paged(LANGUAGES, page),
```

```ts
run: ({ code }, { refuse }) => byCode(code) ?? refuse(unknownLanguage.at('code')),
```

```ts
apply: async ({ project, title, body, label }, { act }) => {
```

## 6. Alle Wertequellen stehen in `values`

Der Verweis auf eine Liste war teils eine eigene Eigenschaft, teils eine Quelle, und die Namen sagten den Unterschied nicht. Jetzt gibt es einen Ort und zwei Namen, die ihn sagen: `keyOf` nimmt einen Schlüssel der Liste, und `detailOf` macht den Befehl dazu noch zu dem, der einen Eintrag ganz zeigt.
Die Liste sagt selbst, welches Feld einen Eintrag benennt. Dieses Feld steht immer in der Kurzform.

Vorher:

```ts
hello.list({ item: Language, outline: ['code', 'name'], ... });
hello.read({ oneOf: { list: languages, key: 'code' }, ... });
values: { id: listedBy(list) },
```

Nachher:

```ts
item: Language,
key: 'code',
outline: ['name'],
```

```ts
values: { code: detailOf(languages) },
```

```ts
values: { id: keyOf(list), team: teams, milestone: milestones },
```

## 7. `needs` eines Schritts leitet adx ab

adx kennt die Pflichtfelder des Zielbefehls. Der Autor kann `needs` nicht mehr vergessen.

Vorher:

```ts
next: friend => [greet.step({ lang: friend.lang }).needs('name')],
```

Nachher:

```ts
next: (_, friend) => [greet.step({ lang: friend.lang })],
```

```console
$ hello friends add --name bob --lang de | jq -c '.next[0]'
{"does":"greets one person","command":"hello greet --lang de","needs":["name"]}
```

## 8. Eine Quelle nennt mehrere fehlende Felder

Eine Quelle nannte ein fehlendes Feld, und der Agent brauchte einen Aufruf pro Feld. Jetzt nennt sie alle Felder, die sicher fehlen.
Die Ablehnung hat die eine Fehlerform: ein Problem `MISSING_VALUE` pro Feld, mit `path`, Hinweis und, wo er läuft, dem Befehl, der die Werte listet. Ein `needs` oder `next` steht in dieser Ablehnung nicht. `next` gehört zu einem Erfolg.

Vorher:

```ts
if (project === undefined) return needs('project');
// der nächste Aufruf nannte dann erst team
```

Nachher:

```ts
if (project === undefined && team === undefined) return needs('project', 'team');
if (project === undefined) return needs('project');
if (team === undefined) return needs('team');
```

```console
$ tracker ticket schedule --milestone | jq -c '.issues[] | {code, path}'
{"code":"MISSING_VALUE","path":"project"}
{"code":"MISSING_VALUE","path":"team"}
```

## 9. `list` hat `check` und `next`

`read` und `effect` hatten beide Eigenschaften, `list` nicht. Jetzt gelten sie für alle drei. Folgt nichts, nennt `next` keinen Schritt.

Vorher:

```ts
lintkit.list({ ..., check: ... });   // kompiliert nicht
```

Nachher:

```ts
check: ({ rule, strict }) => (strict && rule.length === 0 ? [noRule.at('rule')] : []),
run: async ({ dir, rule }, { page }) => paged(await findAll(dir, rule), page),
next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : []),
```

## 10. Die Startschritte sind ein Aufruf nach den Befehlen

`start` stand in `tool({...})`, bevor es einen Befehl gab. Mit einem Befehl darin kompilierte es nicht.

Vorher:

```ts
const hello = tool({ ..., start: () => [greet.step()] });   // TS7022
```

Nachher:

```ts
hello.start(async () => {
  const friends = await friendNames();
  return friends.length === 0 ? [add.step()] : [greet.step()];
});
```

## 11. `global` gilt für jeden Befehl, und ein Befehl kann abweichen

Vorher nahm jeder Befehl jedes globale Feld, auch einer wie `whoami`, der kein Projekt braucht. Jetzt kann ein Befehl die globalen Felder abschalten oder eines optional machen.

Vorher:

```ts
tracker.read({ name: 'whoami', ... });   // verlangt --project
```

Nachher:

```ts
global: false,
```

```ts
global: { project: 'optional' },
```

## 12. Namen ändern sich

Jeder Name soll eine Sache benennen. Ein Name war ein Schema und zugleich die Form am Terminal. Ein anderer war der Handler und zugleich eine Methode an einem Problem. Ein dritter hätte neben der Form am Terminal und dem Lesen einer Datei eine dritte Bedeutung bekommen.

Vorher:

```ts
body: text().describe('the description, Markdown'),
```

```ts
refuse(noFormal.at('style').run(language.step({ code: l.code })));
```

```ts
return files.update(file, Friend.text(next));
```

Nachher:

```ts
body: multiline().describe('the description, Markdown'),
```

```ts
.command(language.step({ code: l.code })),
```

```ts
return Friend.stringify({ ...friend, langs: [...friend.langs, lang] });
```

## 13. Optionen und `--json` gehen in einem Aufruf zusammen

Vorher war offen, ob beides zusammen geht. Jetzt füllen beide ein Objekt. So hängt ein Agent JSON an einen Befehl an, den das Tool vorgeschlagen hat. Ein Feld, das beide geben, wird abgelehnt.

Vorher:

```console
$ hello greet --name Ada --json '{"lang":"de"}'
# nicht festgelegt
```

Nachher:

```console
$ hello greet --name Ada --json '{"lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"name":"Bob"}' | jq -r '.issues[0].code'
REPEATED_OPTION
```

## 14. Eine Ablehnung ohne Feld nutzt `.issue()`

Jedes Problem brauchte ein Feld. Ein Befehl ohne Eingabe konnte darum gar nicht ablehnen, und eine Ablehnung wie "der Server ist in Wartung" musste an einem Feld hängen, das nichts damit zu tun hat. Jetzt gibt es `.issue(message)`. Ein solches Problem hat keinen `path`. `.at(field)` verlangt weiter immer ein Feld.

Vorher:

```ts
return closed.state === 'closed' ? closed : refuse(stillOpen.at('id'));
```

Nachher:

```ts
return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
```

## 15. Ein `read` kann seine Antwort mit `output` deklarieren

Nur eine Liste konnte ihre Antwort kürzen. Ein `read`, das ein großes Dokument zeigt, antwortete immer mit allem. Jetzt deklariert ein `read` seine Antwort mit `output`. Dann nimmt es `--fields`, und `schema` zeigt die Antwort. Das Testkit schlägt fehl, wenn ein `read` ohne `output` mit einer langen Liste oder einem großen Dokument antwortet.

Vorher:

```console
$ tracker issue show --project checkout-web --id CW-131 --fields title | jq -r '.issues[0].code'
UNKNOWN_OPTION
```

Nachher:

```ts
output: Ticket,
```

```console
$ tracker ticket show --project checkout-web --id CW-131 --fields title,state | jq -c '.result'
{"title":"Coupon field accepts expired codes","state":"open"}
```

## 16. Ein Effekt merkt seine Dateien in `plan` vor, und nur dort

Wer nur Dateien schreibt, braucht eine Funktion statt zwei. Der Inhalt wird einmal berechnet.
adx weiß, was geschrieben würde, und meldet es im Probelauf selbst. `apply` bleibt für ein Senden, zusammen mit `look`. In `apply` gibt es keine Dateien mehr: So kommt keine Ablehnung wegen einer Datei nach einem Senden.

Vorher:

```ts
plan: note => ({ file: note.file.rel, bytes: ..., replaces: ... }),
apply: (_, act, note) => act.put(note.file, render(note)),
// später: act.write und act.update in apply
```

Nachher:

```ts
plan: (note, { files }) => files.write(note.file, render(note)),
```

## 17. Der echte Lauf antwortet mit dem Plan und dem, was `apply` hinzufügt

Der Typ von `apply` war frei. Ein Befehl konnte im Probelauf eine Form antworten und im echten Lauf eine andere. Jetzt gibt `apply` nur zurück, was neu ist, und adx antwortet `{ ...planned, ...applied }`. Ein Agent, der den Probelauf gelesen hat, liest die echte Antwort mit demselben Code.

Vorher:

```ts
const issue = await act.send('the new issue', request, Issue);
return { ...planned, issue }; // oder nur: return issue
```

Nachher:

```ts
return { ticket: await act.send('the new ticket', request, Ticket) };
```

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' --label bug | jq -c '.result | keys'
["labels","project","ticket","title"]
```

## 18. Ersetzen entscheidet `files.write`, mit `--replace`

Vorher prüfte nur `outFile`, ob eine Datei existiert, und nur ein solcher Befehl nahm `--replace`. Für einen gespeicherten Namen gab es kein Ersetzen. Jetzt lehnt jedes `files.write` eine vorhandene Datei ab, schon in `plan`. Der Befehl der Ablehnung ist ein Probelauf mit `--replace`: Der Agent sieht in `changes`, was verloren ginge, und kann die Person fragen.

Jeder Effekt nimmt `--replace`, und `replace: false` schaltet die Option ab. Auf einen neuen Namen geht `--replace` durch. Merkt der Plan gar kein `files.write` vor, wird es abgelehnt.

Vorher:

```console
$ notes add --file ideas/q3.md ... | jq -r '.issues[0].hint'
Pick another file, or add --replace to overwrite it
$ hello friends add --name ada --lang en --replace | jq -r '.issues[0].code'
UNKNOWN_OPTION
```

Nachher:

```console
$ hello friends add --name ada --lang en | jq -r '.issues[0].hint'
add --replace to overwrite friends/ada.json
$ hello friends add --name ada --lang en | jq -r '.issues[0].command'
hello friends add --name ada --lang en --replace --dry-run
```

```ts
replace: false,
```

## 19. `fresh` lehnt nichts mehr ab

Zwei Stellen entschieden über einen vergebenen Namen: `fresh` und der Schreibvorgang. Jetzt entscheidet nur der Schreibvorgang. `fresh` listet die vergebenen Namen, wenn `--name` ohne Wert kommt.

Vorher:

```console
$ hello friends add --name ada --lang en | jq -r '.issues[0].code'
NAME_TAKEN
```

Nachher:

```console
$ hello friends add --name ada --lang en | jq -r '.issues[0].code'
ALREADY_EXISTS
$ hello friends add --name | jq -c '.result.values'
[{"value":"ada","taken":true}]
```

## 20. `files.update` für Befehle, die ändern

Ein Befehl, der eine Datei ändern soll, bräuchte sonst bei jedem Aufruf `--replace`. `files.update` nimmt es nicht. Es bekommt die Datei, eine Größengrenze und eine Funktion vom alten Text zum neuen. adx liest die Datei selbst. Fehlt sie, lehnt adx mit `FILE_NOT_FOUND` ab, Art `fix`: `update` legt nie etwas an.

Die Funktion ist so gewählt, dass sich die API nicht ändert, wenn adx später parallele Schreibvorgänge abstimmt.

Vorher:

```ts
apply: (_, act, note) => act.put(note.file, changed),   // ein Verb für alles
// später: files.update(file, `${await file.text(LIMIT)}${text}\n`)
```

Nachher:

```ts
plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
```

## 21. Ein Ersetzen antwortet mit `changes`

`replaces: true` sagt nicht, was sich ändert. adx kennt beide Inhalte und antwortet damit: `{ added, changed, removed, more }`. Das sind JSON-Pfade, sonst die hinzugefügten und entfernten Zeilen, höchstens 20 pro Liste. `more` zählt, was darüber hinausgeht. Ein Plan darf sein eigenes `changes` zurückgeben.

Vorher:

```console
$ notes add ... --replace --dry-run | jq -c '.result.replaces'
true
```

Nachher:

```console
$ hello friends add --name ada --lang en --replace --dry-run | jq -c '.result.changes'
{"added":[],"changed":["lang"],"removed":[],"more":0}
```

## 22. Der Ort des Datenordners kommt aus dem Namen des Tools

Der Autor schrieb den Ort bei jedem Tool selbst. Jetzt leitet adx `~/.hello` aus dem Namen ab. Ein zweites Argument setzt einen eigenen Ort. Der Standardordner darf fehlen: Der erste echte Schreibvorgang legt ihn an.

Vorher:

```ts
const home = root('home', envDir('HELLO_HOME', '~/.hello'));
```

Nachher:

```ts
const home = root('home', envDir('HELLO_HOME'));
```

```ts
const home = root('home', envDir('NOTES_HOME', '~/notes'));
```

## 23. Der Datenordner lässt sich auch mit einer Option verschieben

Vorher verschob nur die Variable den Ordner. Viele Agenten starten aber für jeden Befehl eine neue Shell, und die Variable ist dann weg. Jetzt gibt es dazu die Option `--home`. Sie gewinnt, und adx trägt den Ordner in jeden Befehl, den es nennt.

Die Option lässt sich nicht abschalten. Ein Schalter würde nichts schützen, denn ein Agent kann die Variable genauso setzen. Ein Ordner aus Variable oder Option muss existieren, sonst lehnt adx mit `ROOT_NOT_FOUND` ab, Art `ask`.

Vorher:

```console
$ HELLO_HOME=/tmp/h hello friends add --name eve --lang de | jq -r '.next[0].command'
hello greet --lang de
```

```ts
// später, ein Schalter pro Root:
const vault = root('vault', envDir('HELLO_VAULT'), { option: false });
```

Nachher:

```console
$ HELLO_HOME=/tmp/h hello friends add --name eve --lang de | jq -r '.next[0].command'
hello greet --lang de --home /tmp/h
```

## 24. Dateien bekommen feste Modi

Vorher war nicht festgelegt, mit welchen Rechten adx schreibt. Jetzt gilt `0600` für Dateien und `0700` für Ordner. Eine ersetzte Datei behält ihren Modus, und ein Schreibvorgang kann abweichen.

Vorher:

```text
nicht festgelegt
```

Nachher:

```ts
return files.write(file, names, { mode: 0o644 });
```

## 25. Gespeicherte Daten bekommen eine Formatnummer

Ein neueres Tool fand ältere Dateien vor und hatte keinen Weg, sie zu lesen. Jetzt deklariert der Autor pro Datenart eine Formatnummer und den Schritt von jedem älteren Format. Jede Datenart steht in `stored` des Tools.

Das Testkit schreibt beim ersten Lauf einen Fingerabdruck jedes Schemas in eine Datei neben der `package.json`. Danach vergleicht es und schlägt fehl, wenn sich ein Schema ohne seine Nummer ändert.

Vorher:

```text
kein Weg: eine Datei im alten Format scheiterte am neuen Schema
```

Nachher:

```ts
const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));
```

```ts
stored: [Friend],
```

```console
✖ hello keeps the agent rules > stored data
  friend: the schema changed, but its version is still 2.
  Raise it to 3 and add .from(2, ...) for the old files.
```

## 26. adx speichert keine Geheimnisse

Vorher war offen, ob adx einen Schlüsselbund oder einen `login`-Befehl bekommt. Jetzt steht fest: keines von beiden. Ein Token kommt aus einer Umgebungsvariable, und `schema` nennt nur die Variable.

Vorher:

```text
offen: ein Schlüsselbund oder ein login-Befehl
```

Nachher:

```ts
auth: bearer('TRACKER_TOKEN'),
```

## 27. Ein Dateityp, und ein Schema zum Lesen

Eine Datei aus dem Aufruf ließ sich schreiben, aber nicht lesen. Eine eigene Datei des Tools auch nicht.

Vorher:

```ts
outFile(home); // schreiben
home.file('x.json'); // nur schreiben
```

Nachher:

```ts
input: z.object({ file: inFile(home).describe('the note to show') }),
```

```ts
run: async ({ file }) => ({ file: file.rel, text: await file.text(LIMIT) }),
```

## 28. `get` ordnet einen Status mit `on` zu

Für einen 404 gab es eine eigene Methode, und jeder andere Status brauchte vier Zeilen von Hand. Jetzt nimmt `get` Optionen, nach dem Vorbild von REST: `on` ordnet einem Status einen Wert zu, und `query` steht ebenfalls dort. Mit `{ 404: undefined }` ist die Antwort der Wert oder `undefined`.

Vorher:

```ts
await api.find(['projects', project, 'issues', id], Issue);
await api.get(['projects', project, 'issues'], IssuePage, { state });
```

Nachher:

```ts
const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
```

```ts
const query = { state, cursor: page.cursor, limit: page.size };
return api.get(['projects', project, 'tickets'], TicketPage, { query });
```

## 29. Ein Lesen wird erneut versucht, ein Senden nie

Vorher stand nur fest, dass Wiederholungen in adx laufen. Jetzt stehen die Zahlen fest: Ein Lesen versucht adx bis zu 3-mal erneut, mit wachsender Pause, bei einem Netzwerkfehler, einem 429 oder einem 503. Ein Senden versucht adx nie von selbst erneut. Der Agent bekommt die Art `retry` und den `look`-Schritt.

Vorher:

```text
nicht festgelegt, wie oft und was
```

Nachher:

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' | jq -r '.kind, .state'
retry
Sent without an answer, may have taken effect: the new ticket.
```

## 30. Im Tracker-Beispiel heißt das eigene Schema `Ticket`

adx exportiert selbst einen Typ `Issue`, für ein Problem einer Ablehnung. Das Beispiel nannte sein eigenes Schema genauso. Jetzt heißt es `Ticket`, und die Befehle heißen `ticket list`, `ticket show`, `ticket create` und `ticket schedule`. Die Typnamen `File`, `Request` und `Issue` von adx bleiben.

Vorher:

```ts
const Issue = z.object({ id: id(), title: z.string(), ... });
```

Nachher:

```ts
const Ticket = z.object({
  id: id().describe('the ticket key, such as CW-112'),
  title: z.string().describe('the one-line title'),
  state: z.enum(['open', 'closed']).describe('open or closed'),
  labels: z.array(z.string()).describe('the labels'),
  body: multiline().describe('the description, Markdown'),
});
```

## 31. Ein Test-Einstieg statt zwei

Beide Funktionen prüften dasselbe. Nur das Ziel war verschieden.

Vorher:

```ts
conformance(t, tracker, samples);
binary(t, ['node', 'tracker.ts'], samples);
```

Nachher:

```ts
test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'tracker.ts'], samples));
```

## 32. Das Testkit zerlegt genannte Befehle mit `unbash`

Ein Befehl in `next` oder in einem Problem ist ein Text für die Shell. Das Testkit muss ihn so lesen wie die Shell, sonst prüft es etwas anderes, als der Agent ausführt.

Vorher:

```text
nicht festgelegt, wie das Testkit einen genannten Befehl zerlegt
```

Nachher:

```text
hello greet --lang de --name 'Ada L'
unbash: hello | greet | --lang | de | --name | Ada L
das Testkit prüft: adx kennt den Befehl, jede Option und jeden Wert
```

## 33. Das Testkit prüft vier weitere Dinge

Vorher prüfte das Testkit den Skill gegen die Codes des Tools. Das entfällt. Jetzt prüft es vier Dinge, wenn das Tool ihren Gegenstand hat.

Vorher:

```text
28 codes have no row in SKILL.md
```

Nachher:

```text
Skill: die Datei existiert und hat ein Frontmatter
Gespeicherte Daten: jedes Schema passt zu seinem Fingerabdruck
--replace: ein Effekt, der es listet und nie files.write vormerkt, schlägt fehl
Große Antworten: ein read ohne output mit langer Liste oder großem Dokument schlägt fehl
```

## 34. adx liest die Argumente mit `util.parseArgs`

adx nutzt kein CLI-Framework. Der strenge Modus eines Parsers hält beim ersten Fehler an. adx liest darum nachsichtig und prüft jedes Token selbst. So kommen alle Fehler eines Aufrufs in einer Antwort.

Vorher:

```text
nicht festgelegt: ein CLI-Framework oder ein eigener Parser
```

Nachher:

```text
util.parseArgs mit strict: false und tokens: true
eine Option, auf die eine Option folgt: ohne Wert gegeben
eine unbekannte Option: gesammelt, das Lesen geht weiter
Routing und Hilfe: aus der Befehlstabelle von adx
```

## 35. `api` läuft intern auf RxJS

Wiederholungen, Zeitlimits und das Abbrechen mehrerer Anfragen sind von Hand schwer richtig zu schreiben. In adx laufen sie auf RxJS. Der Autor sieht davon nichts, sein Code bleibt gleich.

Vorher:

```text
nicht festgelegt, worauf api intern läuft
```

Nachher:

```ts
const all = await api.get(['projects', project, 'labels'], Named);
```

## Hello World vorher

Vier Dinge: `hello.ts`, eine Skill-Datei, eine `tsconfig.json` mit sieben Optionen, und später 28 Zeilen für Codes.

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  skill: new URL('./SKILL.md', import.meta.url),
});
// hello.read({...}) wie unten
```

## Hello World nachher

Zwei Dinge: `hello.ts` und eine `tsconfig.json` mit einer Zeile.

```ts
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

Der Befehl selbst bleibt gleich. Es entfallen die Skill-Datei, die lange `tsconfig.json` und die 28 Zeilen für Codes.
