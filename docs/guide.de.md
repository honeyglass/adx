# adx

Kommandozeilen-Tools bauen, die KI-Agenten und Menschen beide gut benutzen können. In TypeScript.

## 1. Was adx ist

adx ist ein TypeScript-Toolkit für Kommandozeilen-Tools. Du beschreibst jeden Befehl mit einem Zod-Schema für seine Eingabe und einer Funktion, die die Arbeit macht. adx liest die Argumente, prüft sie, schreibt die Antwort und setzt den Exit-Code.

Der Name steht für Agent DX: wie leicht ein KI-Agent ein Tool benutzen kann. Ein Agent ist ein Programm, oft ein Sprachmodell, das dein Tool ausführt, um eine Aufgabe zu erledigen. Er kann keinen Kollegen fragen, was eine Option bedeutet. Er liest, was das Tool antwortet.

Die Idee: Der Agent urteilt, das Tool prüft. Ein Agent kann sich irren, ohne es zu merken. Darum läuft jeder Aufruf durch Prüfungen, die ablehnen, was nicht passt, und sagen, wie es zu beheben ist. Eine Regel, die nur im Prompt des Agenten steht, kann er übergehen. Eine Regel im Tool nicht.

Was ein Tool auf adx tut, ohne Code von dir:

- **JSON in der Pipe, Text am Terminal.** `hello greet --name Ada | jq` bekommt ein JSON-Dokument. Derselbe Aufruf am Terminal gibt lesbare Zeilen aus.
- **Alle Fehler auf einmal, jeder mit seiner Lösung.** Alle Fehler eines Aufrufs kommen in einer Antwort zurück. Jeder nennt sein Feld, seine Lösung und, wo einer hilft, einen Befehl zum Ausführen.
- **Nichts geht still durch.** Ein unbekannter Befehl, eine unbekannte Option, ein überzähliges Wort oder ein unbekanntes Eingabefeld wird abgelehnt. adx rät nie.
- **Optionen, die ihre Werte listen.** `--lang` ohne Wert antwortet mit den Sprachen, die das Tool kennt.
- **Ein Schema zur Laufzeit.** `hello schema greet` gibt die genaue Eingabe aus, die der Befehl annimmt. `hello schema` gibt jeden Code aus und was jede Art von Ablehnung verlangt.
- **Probeläufe.** Jeder Befehl, der etwas ändert, nimmt `--dry-run`. Er führt dieselben Prüfungen aus, antwortet, was geschehen würde, und ändert nichts.
- **Dateien werden ganz geschrieben.** Ein Befehl schreibt alle seine Dateien oder keine. Eine vorhandene Datei wird nur mit `--replace` ersetzt, außer das Tool baut sie aus seinen Daten neu, und ein Probelauf zeigt, was das Ersetzen ändert.
- **Nächste Schritte.** Das Tool allein sagt, wo man anfängt. Ein Erfolg nennt die Befehle, die folgen können, fertig zum Ausführen.
- **Kurze Antworten als Standard.** Eine lange Liste antwortet mit einer Kurzform. Der Aufrufer nennt die Felder, die er will, oder fragt nach der nächsten Seite.
- **Eine Antwortform.** Jedes adx-Tool antwortet mit demselben JSON, mit denselben vier Arten von Ablehnung und den Exit-Codes 0, 1 und 2. Ein Agent lernt es einmal.
- **Die Person entscheidet.** Ein Token kommt aus der Umgebung der Person, nie aus einem Aufruf. Eine Ablehnung der Art `ask` hält den Agenten an, bis die Person antwortet.
- **Tippfehler, die nicht kompilieren.** Jede Stelle, an der du ein Feld nennst, etwa `values: { lang: ... }`, prüft der TypeScript-Compiler. `values: { lnag: ... }` ist ein Fehler in deinem Editor.
- **Ein Testkit.** Ein Aufruf in `node --test` prüft jeden Befehl auf alles oben Genannte.

Diese Punkte sind 15 der 16 Agent-DX-Regeln. Die sechzehnte ist ein Handbuch für Agenten, der Agent-Skill. Den schreibst du: adx prüft nur, dass eine Skill-Datei, die du nennst, eine ist.

Die Liste gilt, solange deine Dateien durch `files` gehen und deine Anfragen durch einen Remote, die beiden Wege, die adx dir gibt. Ein Handler, der selbst `node:fs` oder `fetch` aufruft, steht außerhalb. Das Testkit führt jeden Probelauf in einem Testordner gegen einen Fake-Server aus und schlägt fehl, wenn einer von beiden berührt wurde.

Übliche CLI-Frameworks wie commander, yargs, oclif oder cobra lesen Argumente für einen Menschen, der eine Fehlermeldung liest und es noch einmal versucht. Was ein Agent darüber hinaus braucht, bleibt dir überlassen, in jedem Tool. oriko, ein CV-Tool, hat es von Hand geschrieben: etwa 1.450 Zeilen (etwa 950 ohne Leer- und Kommentarzeilen) und etwa 600 Zeilen Tests dafür.

Hier ist ein Aufruf mit zwei Fehlern. Ein übliches Framework hält beim ersten an, als Fließtext auf stderr:

```console
$ hello greet --nmae Ada again
error: unknown option '--nmae'
```

Der Agent erfährt einen von zwei Fehlern und keine Lösung. adx antwortet mit beiden in einer Ablehnung der Art `fix` und sagt, was der Aufruf hinterlassen hat. Jedes Problem nennt seine Stelle, seine Lösung und einen Befehl, der weiterhilft:

```json
{
  "code": "UNKNOWN_OPTION",
  "path": "nmae",
  "message": "greet has no option --nmae (its value was Ada)",
  "hint": "Use an option the command lists",
  "command": "hello schema greet"
}
```

## 2. Schnellstart

### Installieren

adx braucht Node 24.2 oder neuer. Node führt `.ts`-Dateien dann direkt aus.

```console
$ mkdir hello && cd hello
$ pnpm init && pnpm pkg set type=module
$ printf 'autoInstallPeers: false\nstrictPeerDependencies: true\n' >> pnpm-workspace.yaml
$ pnpm add github:honeyglass/adx#<sha> github:honeyglass/utils#<sha> zod
$ pnpm add -D typescript @types/node
```

adx kommt von GitHub, nicht von npm. Du nennst es und `@honeyglass/utils` je mit dem vollen sha eines Commits. adx braucht utils und `zod` neben sich. Die zwei Einstellungen lassen die Installation mit "missing peer @honeyglass/utils" abbrechen, wenn utils fehlt, statt es selbst von GitHub zu holen.

Node entfernt die Typen und führt die Datei aus. Es prüft sie nicht. Das tut der Compiler, und der braucht eine `tsconfig.json`. Eine Zeile genügt, weil adx die Basis mitliefert:

```json
{ "extends": "@honeyglass/adx/tsconfig.json" }
```

### Ein Tool, eine Datei

Die zwei Blöcke unten sind zusammen eine Datei, `hello.ts`. Zuerst das Tool. Sein einziger Befehl steht in `commands`, der Tabelle der Befehle des Tools:

```ts
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: {
    greet: read({
      does: 'greets one person',
      input: z.object({ name: z.string().describe('who to greet') }),
      example: { name: 'Ada' },
      run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
  },
});
```

Und die Zeile, die einen Aufruf ausführt:

```ts
if (import.meta.main) await hello.main();
```

Neben der `package.json` sind diese zwei Dateien das ganze Tool: `hello.ts` und `tsconfig.json`.

### Ausführen

Am Terminal:

```console
$ node hello.ts greet --name Ada
greeting  Hello, Ada!
```

In einer Pipe zu einem anderen Programm antwortet derselbe Aufruf mit JSON:

```console
$ node hello.ts greet --name Ada | cat
{"ok":true,"result":{"greeting":"Hello, Ada!"}}
```

Der Aufruf mit zwei Fehlern wird mit beiden abgelehnt. So sieht eine Person die Ablehnung:

```console
$ node hello.ts greet --nmae Ada again
refused (fix): Nothing was changed.

UNKNOWN_OPTION at nmae
  greet has no option --nmae (its value was Ada)
  hint  Use an option the command lists
  run   hello schema greet

UNEXPECTED_ARGUMENT at again
  greet takes no word after its options
  hint  Remove the word, or pass it as the value of an option
  run   hello schema greet
$ echo $?
1
```

Das Tool allein sagt einem Neuling, wo er anfängt:

```console
$ node hello.ts
hello 0.1.0: greets people

Commands:
  greet   greets one person

Next:
  hello schema   shows every command and its input
```

Der Rest dieser Anleitung schreibt `hello` für `node hello.ts`. [Wie wird ein Tool ausgeliefert und gestartet?](#7-faq) zeigt, wie es in den Pfad kommt.

### Was gerade passiert ist

1. `read` hat einen Befehl gemacht, der nur liest, und der Schlüssel `greet` in `commands` ist das Wort, das ihn aufruft. Seine Eingabe ist ein Zod-Schema. `.describe()` gibt jedem Feld den Text, den `schema` und `--help` ausgeben.
2. `run` bekommt die geprüfte Eingabe. Ihr Typ, `{ name: string }`, kommt aus dem Schema. Du schreibst ihn nie. Schreibst du `({ nmae })`, lehnt der Compiler es ab.
3. adx hat aus dem Feld `name` die Option `--name` gemacht. Ein Feld ohne `.optional()` oder `.default()` ist Pflicht. Dieselbe Eingabe geht auch als Ganzes hinein, als `--json '{"name":"Ada"}'`.
4. Deine Funktion hat einen Wert zurückgegeben. adx hat ihn geschrieben: Text am Terminal, ein JSON-Dokument in der Pipe. Dein Code schreibt nie selbst auf stdout.
5. Der fehlerhafte Aufruf hat deine Funktion nie erreicht. adx hat jedes Argument gelesen, jeden Fehler gesammelt und alle zusammen mit Exit-Code 1 beantwortet.
6. `example` ist eine gültige Eingabe, typisiert durch dasselbe Schema. adx prüft sie beim Start, gibt sie in `hello schema greet` aus, und das Testkit nutzt sie als Aufruf, der gelingen muss.
7. `import.meta.main` ist nur wahr, wenn Node diese Datei startet. So kann ein Test `hello` importieren, ohne es auszuführen.

## 3. Grundlagen

Dieses Kapitel erweitert `hello` um je eine Fähigkeit. Jeder Abschnitt zeigt nur den neuen Teil. Jeder Name von adx im Code, etwa `id` oder `root`, ist ein Import aus `@honeyglass/adx`.

### Ein Befehl, der liest

`read` nimmt eine Funktion von der Eingabe zur Ausgabe. Hier lernt `greet` drei Sprachen. Der Befehl zieht aus der Tabelle in eine Konstante, damit spätere Abschnitte ihn nennen können:

```ts
const hellos = { en: 'Hello', de: 'Hallo', eo: 'Saluton' };

const greet = read({
  does: 'greets one person',
  input: z.object({
    name: z.string().describe('who to greet'),
    lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
  }),
  example: { name: 'Ada' },
  run: ({ name, lang }) => ({ greeting: `${hellos[lang]}, ${name}!` }),
  text: out => out.greeting,
});
```

Das Tool listet die Konstante unter dem Wort, das sie aufruft. `{ greet }` ist die Kurzschreibweise für `{ greet: greet }`:

```ts
commands: { greet },
```

- `read` gibt den Befehl zurück. Die Konstante ist sein Handle: Spätere Abschnitte nennen den Befehl über ihn, in nächsten Schritten und in Tests.
- Das Schema steht im Befehl, dort, wo du es liest. Ein Schema, das mehrere Befehle lesen, bekommt einen eigenen Namen.
- `lang` hat einen Standardwert. Darum sieht `run` immer einen der drei Codes, während `example` das Feld weglassen darf. adx typisiert `example` nach dem, was ein Aufrufer schreibt, und `run` nach dem, was das Schema antwortet.
- `text` legt die Form am Terminal fest. Ohne `text` gibt adx jedes Feld in einer Zeile aus.

```console
$ hello greet --name Ada --lang de
Hallo, Ada!
$ hello greet --json '{"name":"Ada","lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
```

Optionen und `--json` gehen in einem Aufruf zusammen. Beide füllen dasselbe Objekt. So kann ein Agent JSON an einen Befehl anhängen, den das Tool vorgeschlagen hat, ohne ihn umzuschreiben. Ein Feld, das beide geben, wird abgelehnt:

```console
$ hello greet --name Ada --json '{"lang":"de"}' | cat
{"ok":true,"result":{"greeting":"Hallo, Ada!"}}
$ hello greet --name Ada --json '{"name":"Bob"}' | jq -r '.issues[0].code'
REPEATED_OPTION
```

Jedes Programm kann fragen, was der Befehl annimmt:

```console
$ hello schema greet | jq -c '.result.input.required'
["name"]
$ hello schema greet | jq -c '.result.input.properties.lang.enum'
["en","de","eo"]
```

adx gibt das JSON Schema desselben Zod-Objekts aus, mit dem es prüft. So weichen die beiden nie voneinander ab. Ein unbekanntes Feld wird abgelehnt, nie verworfen. Ein `z.string()` nimmt eine sichtbare Zeile. Für Text mit Zeilenumbrüchen gibt es das Schema `multiline()` von adx.

### Optionen und ihre Werte

Sag adx, woher die Werte einer Option kommen, und drei Dinge folgen. Die Option ohne Wert listet sie. Ein Wert außerhalb der Liste wird abgelehnt. Die Ablehnung nennt den Befehl, der sie listet.

Eine feste Liste ist ein `z.enum`, wie `lang` oben. Mehr ist nicht zu schreiben:

```console
$ hello greet --lang
option  lang
values  en, de, eo
$ hello greet --name Ada --lang xx | jq -c '.issues[0] | {code, command}'
{"code":"NOT_IN_LIST","command":"hello greet --name Ada --lang"}
```

Eine Liste, die erst bei Bedarf berechnet wird, ist eine Funktion. Angenommen, `hello` wächst auf 42 Sprachen, die in einer Tabelle im Code stehen:

```ts
const LANGUAGES = [
  { code: 'ar', name: 'Arabic', hello: 'Marhaba', formal: 'As-salamu alaykum' },
  { code: 'de', name: 'German', hello: 'Hallo', formal: 'Guten Tag' },
  { code: 'en', name: 'English', hello: 'Hello', formal: 'Good day' },
  { code: 'eo', name: 'Esperanto', hello: 'Saluton' },
  // ...and 38 more
];
const byCode = (code: string) => LANGUAGES.find(l => l.code === code);
```

Eine Quelle ist eine Funktion, die mit Auswahlwerten antwortet. Jeder hat einen `value` und kann in `does` sagen, was er bedeutet:

```ts
const languageChoices = () => LANGUAGES.map(l => ({ value: l.code, does: l.name }));
```

`lang` wird im Schema ein einfacher String, und `values` des Befehls nennt seine Quelle:

```ts
lang: z.string().default('en').describe('the language code'),
```

```ts
values: { lang: languageChoices },
```

Die Schlüssel von `values` sind Felder der Eingabe. `values: { lnag: languageChoices }` kompiliert nicht. Eine Quelle bekommt die Eingabe des Aufrufs, soweit sie bekannt ist. So kann eine Liste von einem anderen Feld abhängen. Der [Tracker](#eine-remote-api-einbinden) zeigt das.

### Falsche Eingaben mit einem Hinweis ablehnen

Manche Prüfungen brauchen dein Wissen. Hier bekommt `greet` eine zweite Option, und nicht jede Sprache hat eine förmliche Begrüßung:

```ts
style: z.enum(['casual', 'formal']).default('casual').describe('how to greet'),
```

Lege einen Code einmal an, mit seiner Art und einem Hinweis, und lehne damit ab, wo er zutrifft:

```ts
const noFormal = code(
  'NO_FORMAL_GREETING',
  'fix',
  'Greet casually, or pick a language with a formal greeting',
);
```

Die Art sagt dem Aufrufer, was als Nächstes zu tun ist:

| Art     | Exit | Bedeutung                         |
| :------ | :--- | :-------------------------------- |
| `fix`   | 1    | der Aufrufer ändert die Eingabe   |
| `ask`   | 1    | nur die Person kann es lösen      |
| `retry` | 1    | ein späterer Aufruf kann gelingen |
| `bug`   | 2    | das Tool ist kaputt               |

Jeder Handler bekommt `(input, ctx)`. Die Eingabe steht vorn, und `ctx` hält, was dieser Handler nutzen darf. Hier ist das `refuse`. `run` gibt entweder seine Antwort oder eine Ablehnung zurück, und `.at()` nennt das Feld:

```ts
run: ({ name, lang, style }, { refuse }) => {
  const l = byCode(lang);
  if (l === undefined)
    throw new RefusalError({
      kind: 'bug',
      step: 'greet',
      reason: `no language ${lang}, though adx checked it against its list`,
      next: 'report the bug to the maintainer of hello',
      state: 'Nothing was greeted.',
    });
  if (style === 'formal' && l.formal === undefined)
    return refuse(noFormal.at('style', `${l.name} has no formal greeting`));
  const word = style === 'formal' ? l.formal : l.hello;
  return { greeting: `${word}, ${name}!` };
},
```

```console
$ hello greet --name Ada --lang eo --style formal | jq -c '.kind, .issues[0].message'
"fix"
"Esperanto has no formal greeting"
```

- Das Feld wird geprüft. Eine Ablehnung an `'styl'` kompiliert nicht, und der Compiler meldet sie in der Zeile des Tippfehlers.
- Das zweite Argument von `.at()` ist die Meldung. Ohne es wiederholt die Meldung den Hinweis des Codes.
- adx hat ein unbekanntes `lang` schon vor `run` abgelehnt, weil `lang` eine Quelle hat. Der Compiler kann das nicht wissen. Darum wirft der Code in dem Zweig, den adx schon ausgeschlossen hat. Er wirft einen `RefusalError` der Art `bug` aus `@honeyglass/utils`, nie einen nackten `Error`, damit die Antwort sagt, wer als Nächstes handelt: Exit 2, Art `bug`.
- Eine Ablehnung, die kein Feld betrifft, etwa ein abgeschaltetes Konto, nutzt `.issue(message)` statt `.at()`. Sie hat keinen `path`. Der [Tracker](#eine-remote-api-einbinden) zeigt eine.
- Ein Feld, das eine Liste oder ein Objekt hält, lässt sich an einem Teil davon ablehnen. `.at()` nimmt dann eine Liste, die mit dem Feld beginnt. [Eine Eingabe mit Teilen](#eine-eingabe-mit-teilen) zeigt es.

Wird ein Code an einem Feld mit einer Quelle ausgelöst, füllt adx `command` für dich: der Aufruf, der die Werte des Feldes listet. [Befehle, die adx nennt](#6-was-jedes-tool-bekommt) sagt, was ein solcher Befehl mitträgt.

Für eine Regel, die das Schema nicht ausdrücken kann, oder eine über mehrere Felder gibst du dem Befehl ein `check`. Es gibt alle Probleme auf einmal zurück. Alle drei Arten von Befehlen nehmen es:

```ts
const blankName = code('BLANK_NAME', 'fix', 'Pass a name with a letter in it');
```

```ts
check: ({ name }) => (name.trim() === '' ? [blankName.at('name')] : []),
```

adx prüft in Schichten: die Argumente, dann das Schema, dann jeden Wert gegen seine Liste, dann dein `check`, dann dein Handler. Jede Schicht sammelt alle ihre Probleme, und eine spätere Schicht läuft nur, wenn die früheren bestanden sind.

Netzwerk- und Dateisystemfehler brauchen keinen Code von dir, und kein `try`. adx ordnet sie einer Art zu (siehe [Fehler, die du nicht zugeordnet hast](#6-was-jedes-tool-bekommt)).

### Ein Befehl, der eine lange Liste liefert

Eine Liste kann ohne Ende wachsen, und jede Zeile, die ein Agent liest, nimmt Platz, den er für die Aufgabe braucht. Darum antwortet ein `list` mit einer Kurzform: den wenigen Feldern, die jeder Eintrag als Standard zeigt. Der Aufrufer nennt weitere Felder mit `--fields`, und lange Listen kommen in Seiten.

```ts
const Language = z.object({
  code: id().describe('the language code, such as de'),
  name: z.string().describe('the language in English'),
  hello: z.string().describe('the casual greeting'),
  formal: z.string().optional().describe('the formal greeting'),
});
```

```ts
const languages = list({
  does: 'lists the languages hello speaks',
  item: Language,
  key: 'code',
  outline: ['name'],
  pageSize: 10,
  run: (_, { page }) => paged(LANGUAGES, page),
});
```

- `id()` ist ein Name aus Buchstaben, Ziffern, `-` und `_`. Er ist sicher in einem Pfad und in einer URL, und adx lehnt alles andere ab.
- `key` ist das Feld, das einen Eintrag benennt. adx stellt es in der Kurzform immer an die erste Stelle.
- `outline` listet die weiteren Felder der Kurzform. Beide nennen Felder von `Language`: `outline: ['nmae']` kompiliert nicht.
- Der `ctx` einer Liste hält `page`. `paged` schneidet eine Seite aus einem ganzen Array.
- Ein Befehl ohne Eingabe, wie `languages`, lässt `input` und `example` weg.
- Die Konstante einer Liste heißt nach dem, was sie listet, hier `languages`, denn `list` ist schon die Funktion.

```console
$ hello languages | jq -c '.result.items[0], .result.total'
{"code":"ar","name":"Arabic"}
42
$ hello languages | jq -c '.next[]'
{"does":"the following page","command":"hello languages --page 10"}
{"does":"shows one language in full","command":"hello language","needs":["code"]}
```

Der zweite Schritt kommt von dem Befehl, der einen Eintrag zeigt. `detailOf(languages)` ist eine Quelle: Sie sagt, dass das Feld `code` einen Schlüssel dieser Liste nimmt und dass dieser Befehl einen Eintrag ganz zeigt.

```ts
const unknownLanguage = code('UNKNOWN_LANGUAGE', 'fix', 'Use a code the list answers');
```

```ts
const language = read({
  does: 'shows one language in full',
  input: z.object({ code: id().describe('the language code') }),
  example: { code: 'de' },
  values: { code: detailOf(languages) },
  run: ({ code }, { refuse }) => byCode(code) ?? refuse(unknownLanguage.at('code')),
});
```

Zwei Tatsachen prüft adx beim Start: Eine Liste, deren Kurzform ein Feld verbirgt, braucht genau einen solchen Befehl, und jedes `id()`-Feld braucht eine Quelle. So hat jeder Name in deinem Tool einen Befehl, der die echten Namen listet.

Nenne die Felder, die du willst, und jedes kommt ganz zurück:

```console
$ hello languages --fields code,formal | jq -c '.result.items[0]'
{"code":"ar","formal":"As-salamu alaykum"}
$ hello languages --fields | jq -c '[.result.values[].value]'
["code","name","hello","formal"]
```

`--page` nimmt den Cursor, den die vorige Antwort genannt hat. Ein Handler, der auf seinem eigenen Server blättert, liest `page.cursor` und `page.size` und gibt `{ items, next, total }` zurück. Ein fehlendes `next` beendet die Liste. Der [Tracker](#eine-remote-api-einbinden) macht das so.

### Ein Befehl, der etwas ändert

Ein `effect` nimmt eine Funktion `plan`. Sie führt jede Prüfung aus, merkt die Dateien vor, die zu schreiben sind, und antwortet, was geschehen wird. adx schreibt die vorgemerkten Dateien, nachdem `plan` zurückgekehrt ist. Im Probelauf schreibt adx nichts.

`hello` lernt, sich Freunde und ihre Sprache zu merken, eine Datei pro Freund. Die Dateien liegen in einem Root: einem Ordner, den das Tool nutzen darf. Lege ihn an und liste ihn im Tool:

```ts
const home = root('home', envDir('HELLO_HOME'));
```

```ts
roots: [home],
```

`envDir` leitet den Ort aus dem Namen des Tools ab: `~/.hello`. Zwei Helfer nennen die Datei eines Freundes und die Freunde, die es gibt:

```ts
const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);
```

```ts
const add = effect({
  does: 'remembers a friend',
  input: z.object({
    name: id().describe("the friend's short name"),
    lang: z.string().describe("the friend's language code"),
  }),
  example: { name: 'ada', lang: 'de' },
  values: { name: fresh(friendNames) },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});
```

Die Tabelle listet den Befehl in einer Gruppe. Eine Gruppe ist eine Tabelle in der Tabelle:

```ts
commands: {
  friends: { add },
},
```

- `files.write` merkt eine Datei vor und antwortet `{ file, bytes, replaces }`. Das ist auch die Antwort des Befehls.
- `fresh` ist die Quelle für einen neuen Namen. Ein neuer Name hat keine Liste gültiger Werte, aber eine Liste der schon vergebenen Namen. `fresh` antwortet mit diesen, wenn `--name` ohne Wert kommt. Es lehnt nichts ab.
- Die Gruppe macht den Aufruf `hello friends add`, und `hello friends` allein listet ihre Aktionen.

```console
$ hello friends add --name ada --lang de --dry-run | jq -c '.applied, .result'
false
{"file":"friends/ada.json","bytes":26,"replaces":false}
$ hello friends add --name ada --lang de --dry-run | jq -r '.next[0].command'
hello friends add --name ada --lang de
```

```console
$ hello friends add --name ada --lang de
file      friends/ada.json
bytes     26
replaces  false
applied   true
```

Der Probelauf und der echte Lauf antworten mit denselben Feldern. Nur `applied` unterscheidet sich. adx gibt `--dry-run` jedem `effect`, für jede Kombination von Argumenten, und es lässt sich nicht abschalten. Befehle aus `read` und `list` lehnen es ab wie jede unbekannte Option.

Derselbe Aufruf noch einmal schreibt nichts. Die Datei enthält diese Bytes schon, also kann nichts verloren gehen, und der Aufruf braucht kein `--replace`. Die Antwort meldet `unchanged: true`, auch im Probelauf. Der echte Lauf antwortet trotzdem `applied: true`, weil die Datei danach im gewünschten Zustand ist:

```console
$ hello friends add --name ada --lang de | jq -c '.result'
{"file":"friends/ada.json","bytes":26,"replaces":false,"unchanged":true}
```

Ein Aufruf, der anderen Inhalt unter denselben Namen schreibt, wird abgelehnt, weil die Datei jetzt existiert. Ob eine Datei ersetzt wird, entscheidet allein der Schreibvorgang. Die Ablehnung kommt schon in `plan`, also zeigt sie auch ein Probelauf:

```console
$ hello friends add --name ada --lang en | jq -c '.issues[0] | {code, hint}'
{"code":"ALREADY_EXISTS","hint":"add --replace to overwrite friends/ada.json"}
$ hello friends add --name ada --lang en | jq -r '.issues[0].command'
hello friends add --name ada --lang en --replace --dry-run
```

Der Befehl ist ein Probelauf. Er zeigt, was das Ersetzen ändert, bevor etwas überschrieben wird:

```console
$ hello friends add --name ada --lang en --replace --dry-run
file      friends/ada.json
bytes     26
replaces  true
changes   changed: lang
applied   false
next      hello friends add --name ada --lang en --replace
```

Ohne `--dry-run` ersetzt derselbe Aufruf die Datei. Ob ein Agent die Daten der Person überschreiben darf, sagt sein Skill. Die meisten Skills fragen zuerst die Person.

Jeder Effekt nimmt `--replace`. Ein Aufruf mit `--replace` auf einen neuen Namen geht durch. Ein Aufruf mit `--replace`, dessen Plan kein `files.write` vormerkt, wird mit `UNKNOWN_OPTION` abgelehnt. Ein Effekt, der nie eine Datei ersetzt, schaltet die Option mit `replace: false` ab. `schema` listet sie dann nicht. Schreibt ein solcher Befehl doch über eine vorhandene Datei, lautet der Hinweis "pick another name", nie "add --replace". Eine Datei, die das Tool aus seinen Daten neu baut, braucht gar kein `--replace`: siehe [Eine Datei, die das Tool neu baut](#eine-datei-die-das-tool-neu-baut).

Ein Effekt, der etwas sendet, etwa eine Anfrage an einen Server, bekommt eine zweite Funktion, `apply`. Im Probelauf läuft nur `plan`. Der [Tracker](#eine-remote-api-einbinden) zeigt das.

### Nächste Schritte

Ein Erfolg kann nennen, was folgt. Ein Schritt entsteht aus einem Befehls-Handle und einer Teileingabe. Darum kann er nur einen echten Befehl nennen, mit Feldern, die dieser Befehl hat. `next` bekommt die Antwort und die Eingabe:

```ts
next: (_, friend) => [greet.step({ lang: friend.lang })],
```

```console
$ hello friends add --name bob --lang de | jq -c '.next[0]'
{"does":"greets one person","command":"hello greet --lang de","needs":["name"]}
```

- adx leitet `needs` ab: die Pflichtfelder von `greet`, die der Schritt offen lässt.
- `.needs('style')` schreibst du nur für ein optionales Feld, das der Schritt noch braucht. Es nimmt Felder des Zielbefehls: `.needs('nmae')` kompiliert nicht.
- adx setzt jeden Wert für die Shell in Anführungszeichen.
- `next` läuft nur nach einem echten Lauf. Ein Probelauf antwortet mit dem Schritt, der denselben Aufruf echt ausführt.

Lass die Schritte den Tatsachen der Antwort folgen, und gib keinen zurück, wenn nichts folgt. Ein Schritt für die Person, etwa ein Upload von Hand, ist `tell('upload the file in the web console')`: Er hat ein `does` und kein `command`.

Auch ein Problem kann einen Schritt tragen. `.command()` hängt einen Befehl an, der weiterhilft. Hier zeigt das Problem von `greet` auf die Sprache:

```ts
.command(language.step({ code: l.code })),
```

```console
$ hello greet --name Ada --lang eo --style formal | jq -r '.issues[0].command'
hello language --code eo
```

`language` wird in der Datei weiter unten angelegt als `greet`. Das geht, weil `run` es erst nutzt, wenn es läuft.

Die ersten Schritte des Tools selbst kommen aus `start`, einer Eigenschaft des Tools. Die Befehle stehen über dem Tool. So kann `start` sie nennen, und es kann den Datenordner lesen:

```ts
start: async () => {
  const friends = await friendNames();
  return friends.length === 0 ? [add.step()] : [greet.step()];
},
```

Ist noch kein Freund gespeichert, legt der erste Schritt einen an:

```console
$ hello | jq -c '.next[0]'
{"does":"remembers a friend","command":"hello friends add","needs":["name","lang"]}
```

Ohne `start` nennt die Startantwort die Befehle und den Schritt zu `schema`.

### Das Tool erklärt sich selbst

Ein Tool auf adx enthält keinen Anleitungstext und keinen freien Hilfetext. Ein Agent lernt es aus vier Antworten, die alle aus deinen Deklarationen entstehen:

- Das Tool allein nennt seine Befehle und die ersten Schritte (`start`).
- `hello schema` nennt jeden Befehl, jeden Code mit Art und Hinweis, und was jede Art vom Aufrufer verlangt.
- Jeder Erfolg nennt seine nächsten Schritte.
- Jede Ablehnung nennt die Lösung und einen Befehl, der weiterhilft.

```console
$ hello schema | jq -c '.result.kinds.ask, .result.codes[0]'
{"exit":1,"does":"only the person can solve it: stop and ask"}
{"code":"UNKNOWN_COMMAND","kind":"fix","hint":"Use a command the tool lists"}
```

Was kein Schritt ist, gehört in einen Agent-Skill: wann man das Tool nutzt, der Ablauf einer typischen Aufgabe, wann man anhält und die Person fragt. Ein Skill ist ein Markdown-Handbuch für Agenten. Er ist die eine Agent-DX-Regel, die adx nicht einbaut: Der Skill gehört dir, und das Tool öffnet ihn nie, bettet ihn nie ein und gibt ihn nie aus.

Ein Tool kann seinen Skill mit `skill` nennen, mit dem Namen des Skills: Kleinbuchstaben, Ziffern und Bindestriche, ab einem Buchstaben oder einer Ziffer, höchstens 64 Zeichen, wie Claude Code Skills benennt. Jede andere Form ist beim Start ein `DECLARATION`-Fehler. Der Skill liegt, wo Claude Code ihn sucht, in `~/.claude/skills/<name>/SKILL.md`, und die eigene Installation des Tools legt ihn dorthin. Das ist das Tool dieses Kapitels im Ganzen. `count` ist ein weiterer Befehl der Gruppe `friends`: Er zählt die Freunde.

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  skill: 'hello',
  roots: [home],
  commands: {
    greet,
    languages,
    language,
    friends: { add, count },
  },
  start: async () => {
    const friends = await friendNames();
    return friends.length === 0 ? [add.step()] : [greet.step()];
  },
});
```

```console
$ hello | jq -c '.result | {name, skill}'
{"name":"hello","skill":"hello"}
```

Ohne `skill` zeigt die Startantwort `"skill": null`, und nichts wird geprüft. Mit `skill` nennt der Test die `SKILL.md` des Repositorys in `samples.skillFile`, relativ zum Arbeitsordner des Tests; ein Test, der keine nennt, fällt durch die Prüfung. Das Testkit kopiert die Datei in ein Scratch-Home nach `.claude/skills/<name>/SKILL.md`, findet sie dort über ihren Namen, liest ihren Anfang und prüft zwei Tatsachen: Die Datei existiert, und sie ist ein Skill. Das heißt, sie beginnt mit einem Frontmatter, das `name` und `description` hat:

```markdown
---
name: hello
description: Greets people in their language. Use it when the user wants a greeting.
---
```

Das Testkit liest die Befehle, Optionen und Codes in der Datei nicht. Willst du einen Test, der das Handbuch gegen das Tool prüft, schreibst du ihn selbst.

## 4. Der Datenordner

Ein Tool speichert Daten, damit ein späterer Aufruf sie wiederfindet. Das kann der nächste Befehl sein, eine neue Sitzung oder die Person. Für einen Agenten ist der Datenordner oft das Einzige, was von einer Sitzung zur nächsten bleibt: Er hält gespeicherte Abfragen, Vorlagen oder Profile.

Viele Tools brauchen keinen Datenordner. Ein Linter liest Code und antwortet. Ein Tool, das nur einen Server fragt, hält seine Daten auf dem Server. Lass den Datenordner weg, wenn dein Tool nichts für später speichert.

### Wo der Ordner liegt

Der Ordner ist ein Root aus `envDir`, einmal angelegt und in `roots` gelistet:

```ts
const home = root('home', envDir('HELLO_HOME'));
```

- adx leitet den Ort aus dem Namen des Tools ab: `hello` hält seine Daten in `~/.hello`. `~` ist auf jedem System der Home-Ordner. Unter Windows ist der Ordner also `C:\Users\<name>\.hello`.
- Ein zweites Argument setzt einen eigenen Ort, etwa `envDir('NOTES_HOME', '~/notes')`.
- adx trennt Einstellungen nicht von sich aus von Daten, und es liest keine `XDG_*`-Variable und kein `%APPDATA%`.
- Der Standardordner darf fehlen. Er gilt dann als leer. Ein Lesebefehl und ein Probelauf legen nichts an. Der erste echte Schreibvorgang legt den Ordner an.
- Ein Root muss in `roots` stehen. `schema` listet ihn dann, und das Testkit kann ihn auf einen Testordner richten.

### Den Ordner verschieben

Der Ordner lässt sich auf zwei Wegen verschieben: mit der Variable, die der Root nennt, hier `HELLO_HOME`, und mit einer Option, die wie der Root heißt, hier `--home`. Jeder Befehl des Tools nimmt die Option, und sie lässt sich nicht abschalten. Sind beide gegeben, gewinnt die Option.

Ist der Ordner nicht der Standardordner, trägt adx ihn in jeden Befehl, den es nennt, in einem nächsten Schritt und in einem Problem. Das gilt, ob die Variable oder die Option ihn gesetzt hat:

```console
$ HELLO_HOME=/tmp/h hello friends add --name eve --lang de | jq -r '.next[0].command'
hello greet --lang de --home /tmp/h
```

Der Grund: Viele Agenten führen jeden Befehl in einer neuen Shell aus, und eine Variable überlebt nicht von einem Shell-Aufruf zum nächsten. Ohne die Option würde ein genannter Befehl, Wort für Wort befolgt, in den echten Daten landen.

Ein Ordner, den die Variable oder die Option nennt, muss existieren, als absoluter Pfad oder mit `~`. Ein leerer Wert, ein relativer Pfad, eine Datei und ein fehlender Ordner werden mit `ROOT_NOT_FOUND` abgelehnt, Art `ask`. adx weicht nie auf `~/.hello` aus.

```console
$ HELLO_HOME= hello friends add --name | jq -r '.issues[0].code'
ROOT_NOT_FOUND
$ hello friends add --name --home /tmp/nope | jq -r '.issues[0].code'
ROOT_NOT_FOUND
```

### Eine Datei ändern mit `files.update`

Manche Befehle sind dazu da, eine Datei zu ändern: ein Bearbeiten, ein Aktualisieren, ein Anhängen. Sie nutzen `files.update`. Es nimmt die Datei, eine Größengrenze für das Lesen und eine Funktion vom alten Text zum neuen:

```ts
const friendChoices = async () => (await friendNames()).map(name => ({ value: name }));
```

`friends edit` nimmt dieselbe Eingabe wie `friends add`. Vier Befehle dieses Kapitels lesen dieses Schema, darum hat es jetzt einen Namen:

```ts
const FriendIn = z.object({
  name: id().describe("the friend's short name"),
  lang: z.string().describe("the friend's language code"),
});
```

```ts
const edit = effect({
  does: "changes a friend's language",
  input: FriendIn,
  example: { name: 'ada', lang: 'en' },
  values: { name: friendChoices },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => JSON.stringify({ ...JSON.parse(old), lang })),
});
```

- adx liest die Datei selbst und ruft deine Funktion mit ihrem Text auf. `LIMIT` ist deine eigene Zahl, etwa 65.536: Das Lesen hört bei dieser Größe auf.
- `files.update` nimmt kein `--replace`. Darum sagt der Befehl `replace: false`.
- Es legt nie eine Datei an. Fehlt die Datei, lehnt adx mit `FILE_NOT_FOUND` ab, Art `fix`.
- Eine Änderung, die den Text antwortet, den die Datei schon enthält, schreibt nichts. Die Antwort meldet dann `replaces: false` und `unchanged: true`, wie bei einem `write` mit denselben Bytes.
- Wie bei `write` kommt die Ablehnung in `plan`, die Antwort zeigt, was sich ändert, und ein Probelauf schreibt nichts.

```console
$ hello friends edit --name ada --lang en --dry-run | jq -c '.result.changes.changed'
["lang"]
```

Welches von beiden ein Befehl nutzt, folgt aus seinem Zweck:

| Der Befehl                         | Nutzt          |
| :--------------------------------- | :------------- |
| fügt hinzu, legt an, speichert     | `files.write`  |
| bearbeitet, aktualisiert, hängt an | `files.update` |

Bekannte CLIs trennen genauso: `docker context create` und `docker context update`, `gh alias set` mit `--clobber`, `git config` mit `--append` und `--replace-all`.

### Eine Datei, die das Tool neu baut

Manche Dateien sind abgeleitet: Das Tool baut sie aus dem neu, was es speichert, etwa einen Export oder ein gebautes Dokument. Jeder Aufruf schreibt eine solche Datei neu. Ein `--replace`, das jeder Aufruf braucht, wird ohne Nachdenken angehängt, und dann schützt es nichts.

`friends export` schreibt die Namen aller Freunde in eine Datei, die andere lesen. Der Befehl sagt `replace: 'always'`:

```ts
replace: 'always',
plan: async ({ file }, { files }) => {
  const names = (await friendNames()).join('\n');
  return files.write(file, names, { mode: 0o644 });
},
```

- Jedes `files.write` des Befehls ersetzt eine vorhandene Datei ohne `--replace`. Die Antwort sagt es, wie bei jedem Ersetzen: `replaces: true`, und `changes`. Ein Probelauf antwortet dasselbe, bevor die Datei angefasst wird.
- Der Befehl ist die einzige Stelle, die es sagt. `files.write` nimmt dafür keine Option, und `schema` liest dieselbe Zeile.
- Der Befehl nimmt kein `--replace`, wie mit `replace: false`.
- Es gilt für jede Datei, die der Befehl schreibt. Ein Befehl, der in einem Aufruf eine abgeleitete und eine gepflegte Datei schreibt, kann es nicht nutzen: Teile ihn in zwei Befehle, oder lass ihn hinter `--replace`.
- Es ist nur für abgeleitete Dateien da. Daten, die jemand pflegt, etwa ein Freund, bleiben hinter `--replace`.

```console
$ hello friends export --file public/friends.txt | jq -c '.result | {file, replaces}'
{"file":"public/friends.txt","replaces":true}
$ hello schema friends export | jq -c '.result.replace'
"always"
```

`mode` erklärt [Dateien](#6-was-jedes-tool-bekommt).

### Eine Datei lesen

`home.file(...)` antwortet mit einem `File`. Es hat `rel`, `exists`, `text(limit)`, `bytes(limit)` und `json(limit, schema)`. Jedes Lesen nimmt eine Grenze und hört dort auf, und `json` prüft den Inhalt gegen das Schema:

```ts
run: ({ name }) => friendFile(name).json(LIMIT, FriendIn),
```

Ein Pfad bleibt in seinem Root und folgt keinem Link hinaus.

### Keine Geheimnisse

adx speichert keine Geheimnisse. Ein Tool liest ein Token aus einer Umgebungsvariable, die es deklariert, etwa `bearer('TRACKER_TOKEN')`. `schema` nennt die Variable, nie ihren Wert. Eine fehlende Variable ist eine Ablehnung der Art `ask`: Nur die Person kann ein Token liefern. Ein Token geht nur über `https`, oder über `http` an die Maschine selbst (`localhost`, `127.0.0.1`, `[::1]`). Jede andere `http`-Adresse einer Remote mit Token wird mit `URL_NOT_ALLOWED` abgelehnt, bevor eine Anfrage hinausgeht; eine, die im Tool fest steht, ist beim Start ein `DECLARATION`-Fehler. adx hat keinen Schlüsselbund und keinen `login`-Befehl.

### Was noch nicht abgedeckt ist

adx kann eine gespeicherte Datei noch nicht löschen, und es stimmt zwei Aufrufe nicht ab, die dieselbe Datei im selben Moment schreiben. [Bekannte Grenzen](#8-bekannte-grenzen) sagt, was das für ein Tool bedeutet.

[Dateien](#6-was-jedes-tool-bekommt) in der Referenz hat die Einzelheiten: Dateimodi und die Liste der Änderungen. [Gespeicherte Daten, die ihr Format ändern](#gespeicherte-daten-die-ihr-format-ändern) zeigt, wie ein neueres Tool ältere Dateien liest.

## 5. Fortgeschritten

Jeder Anwendungsfall unten ist ein ganzes Tool, Stück für Stück gezeigt.

### Eine Remote-API einbinden

`tracker` liest und erstellt Tickets in einem Ticket-Tracker über dessen JSON-API. Die meisten Aufrufe arbeiten an einem Projekt, hier `checkout-web`.

Vier neue Teile kommen dazu:

- **Ein Remote**: `remote()` bindet das Tool an einen Host. Dein Code liest darüber mit `get`, und jede Antwort läuft durch ein Zod-Schema, bevor dein Code sie sieht. Eine Anfrage, die etwas ändert, wird mit `post` gebaut und nur von `act.send` in `apply` gesendet. Ein Probelauf kann sie also nicht senden.
- **Eine globale Eingabe**: `global()` deklariert Eingabe, die jeder Befehl teilt, etwa das Projekt. adx trägt sie in jeden Befehl, den es nennt.
- **Eine lange Liste als Quelle**: `detailOf` und `keyOf` richten ein Feld auf `ticket list`, weil es zu viele Ticket-Schlüssel zum Ausgeben gibt.
- **Ordner**: `tracker` hat sieben Befehle, zu viele, um sie in einer Datei zu lesen. Es ist nach Features geschnitten, und eine Datei hält das Tool.

**Der Aufbau.** adx liest keinen Ordnernamen, keinen Dateinamen und keine Reihenfolge von Importen. Ein Befehl ist ein Wert, und die Tabelle des Tools nimmt ihn, wo immer er liegt. Der Schnitt ist also deiner. Dieser hält eine einfache Regel: Ein Feature-Ordner importiert nur aus `core/` und aus sich selbst, und nur `cli/` fügt Features zusammen.

```text
tracker/
├── bin/tracker.ts          the program: runs the tool
├── cli/tracker.ts          the tool and the table of its commands
├── tickets/                one feature
│   ├── ticket.schema.ts    the schema five commands read
│   ├── list.ts             ticket list
│   ├── show.ts             ticket show
│   ├── create.ts           ticket create
│   ├── schedule.ts         ticket schedule
│   ├── close.ts            ticket close
│   └── stats.ts            stats
├── user/whoami.ts          a second feature: whoami
├── core/tracker.ts         what features share: the server and the project
└── tests/tracker.test.ts   the tests
```

**Was die Features teilen**, liegt in `core/tracker.ts`. Zuerst der Remote, mit der Variable für seine Adresse und der Variable für sein Token:

```ts
export const api = remote('tracker', {
  url: envUrl('TRACKER_URL', 'https://tracker.example.com/api'),
  auth: bearer('TRACKER_TOKEN'),
});
```

Dann die globale Eingabe. `global()` deklariert sie einmal und antwortet mit den drei Arten von Befehlen, in denen das Projekt in jeden Handler typisiert ist. Die Features nehmen `read`, `list` und `effect` von hier, nicht von adx:

```ts
export const project = global({
  input: z.object({
    project: id().describe('the project key, such as checkout-web'),
  }),
  example: { project: 'checkout-web' },
  values: { project: projects },
});

// read, list and effect, with the project typed into every handler
export const { read, list, effect } = project;
```

`projects` ist die Quelle für die Werte des Projekts. Sie fragt den Server und antwortet mit Auswahlen:

```ts
export const Named = z.array(z.object({ name: z.string(), description: z.string().default('') }));

const projects = async () =>
  (await api.get(['projects'], Named)).map(p => ({
    value: p.name,
    does: p.description,
  }));
```

**Was der Server antwortet**, ist für ein Ticket ein Schema, das fünf Befehle lesen. Darum hat es einen Namen und eine eigene Datei im Feature, `tickets/ticket.schema.ts`:

```ts
export const Ticket = z.object({
  id: id().describe('the ticket key, such as CW-112'),
  title: z.string().describe('the one-line title'),
  state: z.enum(['open', 'closed']).describe('open or closed'),
  labels: z.array(z.string()).describe('the labels'),
  body: multiline().describe('the description, Markdown'),
});
```

**Die Liste**, in `tickets/list.ts`. Der Server blättert, und der Handler reicht dessen Cursor durch. `project` steht in der Eingabe neben den eigenen Feldern des Befehls. Das Schema einer Seite liest nur dieser Befehl, darum steht es in dieser Datei:

```ts
const TicketPage = z.object({
  items: z.array(Ticket),
  next: z.string().optional(),
  total: z.number(),
});
```

```ts
export const tickets = list({
  does: 'lists the tickets of a project',
  input: z.object({
    state: z.enum(['open', 'closed']).default('open').describe('open or closed'),
  }),
  item: Ticket,
  key: 'id',
  outline: ['title', 'state'],
  run: ({ project, state }, { page }) => {
    const query = { state, cursor: page.cursor, limit: page.size };
    return api.get(['projects', project, 'tickets'], TicketPage, { query });
  },
});
```

Die Konstante heißt `tickets`, nach dem, was der Befehl listet. Die Tabelle des Tools gibt dem Befehl sein Wort, `list`.

**Der Befehl, der ein Ticket zeigt**, in `tickets/show.ts`:

```ts
const noTicket = code('TICKET_NOT_FOUND', 'fix', 'Use a key the list command answers');
```

```ts
export const show = read({
  does: 'shows one ticket in full',
  input: z.object({ id: id().describe('the ticket key') }),
  example: { id: 'CW-112' },
  values: { id: detailOf(tickets) },
  output: Ticket,
  run: async ({ project, id }, { refuse }) => {
    const path = ['projects', project, 'tickets', id];
    const ticket = await api.get(path, Ticket, { on: { 404: undefined } });
    return ticket ?? refuse(noTicket.at('id', `${project} has no ticket ${id}`));
  },
});
```

- Ein Pfad ist ein Array aus Teilen, und adx kodiert jeden. Ein Wert kann der Adresse nie ein `/` oder ein `?` hinzufügen.
- `on` ordnet einem Status den Wert zu, mit dem `get` dafür antwortet. Mit `{ 404: undefined }` ist die Antwort ein Ticket oder `undefined`. Jeder andere Status kann dort auch stehen, etwa ein 409. Ohne `on` ist ein 404 ein Fehler wie jeder andere.
- `output` ist das Schema der Antwort. Ein Ticket kann lang sein, darum deklariert der Befehl es: Der Aufrufer kann die Antwort dann mit `--fields` kürzen, und `schema` zeigt die Form. `run` muss antworten, was `output` deklariert.

**Der Befehl, der ein Ticket erstellt**, in `tickets/create.ts`. Er sendet, also hat er `apply` neben `plan`:

```ts
export const create = effect({
  does: 'files a new ticket',
  input: z.object({
    title: z.string().describe('the one-line title'),
    body: multiline().default('').describe('the description, Markdown'),
    label: z.array(z.string()).default([]).describe('a label; may repeat'),
  }),
  example: { title: 'Pay button overlaps the footer', label: ['bug'] },
  values: {
    label: async ({ project }) => {
      if (project === undefined) return needs('project');
      const all = await api.get(['projects', project, 'labels'], Named);
      return all.map(l => ({ value: l.name, does: l.description }));
    },
  },
  replace: false,
  plan: ({ project, title, label }) => ({ project, title, labels: label }),
  apply: async ({ project, title, body, label }, { act }) => {
    const data = { title, body, labels: label };
    const request = api.post(['projects', project, 'tickets'], data);
    return { ticket: await act.send('the new ticket', request, Ticket) };
  },
  look: () => tickets.step(),
  next: ({ ticket }) => [show.step({ id: ticket.id })],
});
```

- Die Labels gehören zu einem Projekt. Ihre Quelle braucht also zuerst das Projekt und sagt das mit `needs`. Die Quelle steht in `values`, und adx typisiert ihre Eingabe aus dem Befehl: `project` ist ein String oder `undefined`, und `needs('projekt')` kompiliert nicht.
- `plan` antwortet, was gesendet wird. Das ist die Antwort des Probelaufs.
- `apply` gibt nur zurück, was der echte Lauf hinzufügt. adx antwortet `{ ...planned, ...applied }`: alles, was der Probelauf geantwortet hat, und dazu `ticket`. So kann ein Agent, der den Probelauf gelesen hat, die echte Antwort mit demselben Code lesen.
- `act` gibt es nur im `ctx` von `apply`, und adx ruft `apply` im Probelauf nie auf. `act` sendet nur. Dateien werden in `plan` vorgemerkt. So kann keine Ablehnung wegen einer Datei nach einem Senden kommen.
- `next` bekommt die zusammengeführte Antwort. `ticket` ist also ohne Prüfung da.
- `look` ist der Schritt, den adx nennt, wenn es nicht wissen kann, was ein gescheiterter Aufruf hinterlassen hat. adx startet nicht, wenn ein Befehl `apply` hat und kein `look`.
- `replace: false`: Dieser Befehl schreibt keine Datei, also nimmt er kein `--replace`.

**Das Tool**, in `cli/tracker.ts`, ist die einzige Datei, die jedes Feature sieht:

```ts
export const tracker = tool({
  name: 'tracker',
  version: '1.2.0',
  does: 'reads and files tickets',
  remotes: [api],
  global: project,
  commands: {
    ticket: { list: tickets, show, create, schedule, close },
    whoami,
    stats,
  },
  next: [after(whoami, () => [tickets.step()])],
  start: () => [tickets.step()],
});
```

- `global: project` gibt jedem Befehl die Option `--project`. Ein Befehl, der ohne die globale Eingabe gemacht ist, kompiliert in dieser Tabelle nicht.
- Ein Schlüssel von `commands` ist ein Wort des Aufrufs, und eine Tabelle in der Tabelle ist eine Gruppe: `tracker ticket list`, `tracker ticket show`, `tracker whoami`.
- Ein Ordner und ein Wort sind unabhängig. `stats.ts` liegt in `tickets/`, und sein Aufruf ist `tracker stats`.
- `next` und `after` zeigt das Ende dieses Abschnitts, unter "Ein Schritt über Ordner hinweg".

Und `bin/tracker.ts` ist das ganze Programm:

```ts
import { tracker } from '../cli/tracker.ts';

await tracker.main();
```

Das Token kommt aus `TRACKER_TOKEN`. Die Person setzt es, und `tracker schema` nennt die Variable, nie ihren Wert. Ein Test richtet `TRACKER_URL` auf einen Fake-Server.

**Tickets auflisten.** Die Kurzform hält den Schlüssel und die zwei Felder, die die Liste genannt hat:

```console
$ tracker ticket list --project checkout-web | jq -c '.result.items[0], .result.total'
{"id":"CW-131","title":"Coupon field accepts expired codes","state":"open"}
73
$ tracker ticket list --project checkout-web | jq -r '.next[].command'
tracker ticket list --project checkout-web --page eyJvIjo1MH0
tracker ticket show --project checkout-web
```

Der zweite Schritt braucht noch den Schlüssel: Sein `needs` ist `["id"]`.

**Ein Ticket, auf zwei Felder gekürzt.** `ticket show` hat ein `output`, also nimmt es `--fields`:

```console
$ tracker ticket show --project checkout-web --id CW-131 --fields title,state | jq -c '.result'
{"title":"Coupon field accepts expired codes","state":"open"}
```

**Ein Schlüssel, den es nicht gibt.** Dein Code hat nur mit `TICKET_NOT_FOUND` an `id` abgelehnt. Weil `id` eine Quelle hat, fügt adx den Listenbefehl hinzu, mit dem Projekt des Aufrufs:

```console
$ tracker ticket show --project checkout-web --id CW-999 | jq -c '.issues[0] | {code, command}'
{"code":"TICKET_NOT_FOUND","command":"tracker ticket list --project checkout-web"}
```

`tracker ticket show --project checkout-web --id`, mit leerem Schlüssel, antwortet mit demselben `command` und dem Code `MISSING_VALUE`. 73 Schlüssel sind zu viele zum Ausgeben, also zeigt adx auf die Liste.

**Labels brauchen zuerst das Projekt.** Die Label-Quelle hat `needs('project')` zurückgegeben. adx lehnt mit einem Problem `MISSING_VALUE` am fehlenden Feld ab, und dessen `command` listet die Werte:

```console
$ tracker ticket create --label | jq -c '.issues[] | {code, path, command}'
{"code":"MISSING_VALUE","path":"project","command":"tracker ticket create --project"}
$ tracker ticket create --project checkout-web --label | jq -c '[.result.values[].value]'
["bug","checkout","design","payments"]
```

**Ein Ticket erstellen.** Der Probelauf prüft die Labels gegen den Server und sendet nichts. Der echte Lauf antwortet mit denselben Feldern und fügt das Ticket hinzu:

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' --label bug --dry-run | jq -c '.applied, .result'
false
{"project":"checkout-web","title":"Totals round twice","labels":["bug"]}
$ tracker ticket create --project checkout-web --title 'Totals round twice' --label bug | jq -c '.result | keys'
["labels","project","ticket","title"]
```

Der Schritt des Probelaufs ist derselbe Aufruf ohne `--dry-run`, mit dem Titel in Anführungszeichen. Der Schritt des echten Laufs ist `tracker ticket show --project checkout-web --id CW-132`.

**Ein überlasteter Server.** Du hast keinen Status zugeordnet. adx versucht ein Lesen bis zu 3-mal erneut, mit wachsender Pause, bei einem Netzwerkfehler, einem 429 oder einem 503. Bleibt der Server überlastet:

```console
$ tracker ticket list --project checkout-web | jq -c '{kind, state, code: .issues[0].code}'
{"kind":"retry","state":"Nothing was changed.","code":"SERVER_BUSY"}
```

**Ein Senden versucht adx nie erneut.** Die Verbindung bricht ab, nachdem `ticket create` seine Anfrage gesendet hat. adx kann nicht wissen, ob das Ticket existiert, sagt das und nennt den `look`-Schritt:

```console
$ tracker ticket create --project checkout-web --title 'Totals round twice' | jq -r '.kind, .state'
retry
Sent without an answer, may have taken effect: the new ticket.
$ tracker ticket create --project checkout-web --title 'Totals round twice' | jq -r '.issues[0].command'
tracker ticket list --project checkout-web
```

Mit dem Label, das du `act.send` gegeben hast, "the new ticket", benennt `state` die Anfrage. Sendet ein Befehl mehrere Anfragen, wird jede als beantwortet, abgelehnt oder ohne Antwort gesendet gelistet.

**Ein Server, der etwas anderes antwortet.** Lässt der Server ein Feld weg oder sendet er `"state": "archived"`, erfüllt die Antwort das Schema `Ticket` nicht. adx lehnt mit `REMOTE_REFUSED` ab, Art `ask`, mit den Problemen des Schemas in der Meldung. Dein Code sieht den falschen Wert nie.

**Kein Token.** Ohne `TRACKER_TOKEN` wird jeder Aufruf, der den Server erreicht, mit `ENV_MISSING` abgelehnt, Art `ask`.

**Eine Liste, die zwei Felder braucht.** Die Meilensteine von `tracker` gehören zu einem Team eines Projekts. Ihre Quelle steht in `tickets/schedule.ts`. Sie hat einen Namen, also sagt sie mit dem Typ `Source` von adx, welche Felder sie liest. Sie nennt jedes Feld, das an dieser Stelle sicher fehlt:

```ts
const milestones: Source<{ project: string; team: string }> = async ({ project, team }) => {
  if (project === undefined && team === undefined) return needs('project', 'team');
  if (project === undefined) return needs('project');
  if (team === undefined) return needs('team');
  const path = ['projects', project, 'teams', team, 'milestones'];
  return (await api.get(path, Named)).map(m => ({ value: m.name }));
};
```

`ticket schedule` legt ein Ticket in einen Meilenstein. Seine Eingabe hat die Felder `id`, `team` und `milestone`. `keyOf(tickets)` sagt, dass `id` einen Schlüssel der Liste nimmt. Anders als `detailOf` macht es diesen Befehl nicht zu dem, der einen Eintrag zeigt. `team` hat auch eine Quelle mit Namen, `teams`:

```ts
values: { id: keyOf(tickets), team: teams, milestone: milestones },
```

Er sendet wie `ticket create`. Sein `look` ist eine Funktion der Eingabe und kann darum den Eintrag nennen: Nach einem Verbindungsabbruch ist der Schritt `tracker ticket show` mit dem Schlüssel des Aufrufs.

```ts
look: ({ id }) => show.step({ id }),
```

adx antwortet mit allen fehlenden Feldern auf einmal, ein Problem pro Feld. Der Agent spart einen Aufruf pro Feld:

```console
$ tracker ticket schedule --milestone | jq -c '.issues[] | {path, command}'
{"path":"project","command":"tracker ticket schedule --project"}
{"path":"team","command":null}
$ tracker ticket schedule --milestone | jq -r '.issues[1].hint'
Give --project first: the teams depend on it
```

adx fragt die Quelle jedes fehlenden Feldes, was diese Quelle ihrerseits braucht. Die Teams brauchen das Projekt, und das fehlt auch. Darum hat das zweite Problem kein `command`: adx nennt einen Befehl nur, wenn er so läuft, wie er dasteht. Ist das Projekt gegeben, nennt das Problem für `team` den Befehl `tracker ticket schedule --project checkout-web --team`.

Nenne nur, was sicher fehlt. Ob ein zweites Feld nötig ist, kann vom Wert des ersten abhängen: Hätten nur manche Projekte Teams, gäbe die Quelle zuerst `needs('project')` zurück. `needs` nimmt Felder, die die Quelle liest: `needs('tema')` kompiliert nicht, und der Compiler meldet es an der Quelle.

**Ein Befehl ohne das Projekt.** `global` gilt für jeden Befehl, und ein Befehl kann abweichen. `whoami`, in `user/whoami.ts`, nimmt kein globales Feld. Er hat gar keine Eingabe. Seine Ablehnung betrifft also kein Feld und nutzt `.issue()`:

```ts
const inactive = code('USER_INACTIVE', 'ask', 'Ask an admin to activate the account');
```

```ts
export const whoami = read({
  does: 'names the signed-in user',
  global: false,
  run: async (_, { refuse }) => {
    const user = await api.get(['user'], z.object({ login: z.string(), active: z.boolean() }));
    return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
  },
});
```

```console
$ tracker whoami | jq -c '.result'
{"login":"ada","active":true}
$ tracker whoami --project checkout-web | jq -r '.issues[0].code'
UNKNOWN_OPTION
```

`project` in diesem `run` zu lesen, kompiliert nicht. Ein Befehl kann ein globales Feld auch optional machen, wie `stats`, das die Tickets eines Projekts oder aller zählt. `run` sieht dann `string | undefined`:

```ts
global: { project: 'optional' },
```

`tracker schema <command>` zeigt, ob ein Befehl die Option nimmt, und adx trägt den Wert nur in Schritte zu Befehlen, die sie haben.

**Ein Schritt über Ordner hinweg.** Ein guter Schritt nach `whoami` ist die Liste der Tickets. Aber `whoami` liegt in `user/`, die Liste liegt in `tickets/`, und nach der Regel dieses Aufbaus importiert ein Feature kein anderes. Darum steht der Schritt dort, wo die Features zusammenkommen: am Tool, mit `after`.

```ts
next: [after(whoami, () => [tickets.step()])],
```

```console
$ tracker whoami | jq -c '.next[0]'
{"does":"lists the tickets of a project","command":"tracker ticket list","needs":["project"]}
```

- Ein `next`, dessen Schritte im eigenen Ordner des Befehls bleiben, steht am Befehl, wie in `ticket create`. Ein `next` zu einem Befehl eines anderen Ordners steht am Tool.
- `after` nimmt einen Befehl und eine Funktion wie `next`. Die Funktion bekommt die Antwort des echten Laufs und die Eingabe, beide vom Befehl typisiert.
- `after` nimmt statt eines Befehls auch eine Liste von Befehlen: `after([create, close], fn)` gibt beiden dieselben Schritte. Die Funktion muss zu jedem Befehl der Liste passen, also liest sie nur, was alle antworten und nehmen. Eine leere Liste kompiliert nicht.
- Seine Schritte folgen den Schritten des eigenen `next` des Befehls.
- Ein `after` für einen Befehl, den das Tool nicht listet, ist ein `DECLARATION`-Fehler beim Start.
- In einem größeren Tool bekommt die Liste von `next` eine eigene Datei in `cli/`.

**Ein Hinweis über Ordner hinweg.** Der Befehl eines Problems hat dieselbe Grenze. `.command(step)` steht im Handler, also nennt es einen Befehl aus dem eigenen Ordner des Handlers. `tracker` braucht nicht mehr. Ein größeres Tool schon. Angenommen, ein Tool, das Apps ausliefert, lehnt eine eingefrorene Umgebung mit einem Code ab, `ENV_FROZEN`, aus zwei Features. Der Code liegt in `core/`, und der Befehl, der hilft, die Liste der Umgebungen, liegt im Feature `env/`. Weder `core/` noch das andere Feature darf ihn importieren. Darum steht der Befehl am Tool, mit `hint`, in einer eigenen Liste in `cli/`:

```ts
export const hints = [
  // core/ to env/: the list of environments shows which are frozen
  hint(frozen, () => envs.step()),
];
```

Das Tool nimmt die Liste als `hints`, neben `next`.

- `hint` nimmt einen Code und eine Funktion, die mit einem Schritt zu einem Befehl antwortet. adx hängt diesen Befehl an jedes Problem mit dem Code.
- Ein `.command(step)` am Problem gewinnt gegen den Hinweis. Der Hinweis gewinnt gegen den Befehl, den adx aus der Quelle des Feldes ableitet.
- Die Funktion bekommt nichts, also ruft adx sie beim Start auf. Ein Hinweis für einen Befehl, den das Tool nicht listet, ist ein `DECLARATION`-Fehler, und ein zweiter Hinweis für einen Code auch.
- Ein Schritt aus `tell` kompiliert hier nicht: Der `command` eines Problems ist ein Befehl.

Der Befehl, der hilft, muss oft wissen, woran der abgelehnte Aufruf gearbeitet hat. oriko, ein CV-Tool, lehnt einen unbekannten Block mit einem Code aus `core/` ab, und der Befehl, der hilft, listet die Blöcke des CVs, den dieser Aufruf genannt hat. Der Schritt nimmt den CV und das Profil aus dem abgelehnten Aufruf, mit `.carry`, und nennt `--block` ohne Wert, mit `.lists`:

```ts
hint(unknownBlock, () => show.step().carry('cv', 'profile').lists('block')),
```

- `.carry` nimmt Felder des Zielbefehls: `.carry('cvs')` kompiliert nicht.
- adx nimmt den Wert des gleichnamigen Feldes aus dem abgelehnten Aufruf nur, wenn der Zielbefehl ihn in einem echten Aufruf annehmen würde. Kann adx das nicht prüfen, bleibt der Wert weg.
- Der Wert muss das Schema des Zielbefehls erfüllen. Ein Aufruf mit `--cv jane` antwortet mit `oriko show --cv jane --block`.
- Hat das Feld im Zielbefehl eine Quelle, muss der Wert auch in ihrer Liste stehen. `oriko profile set --profile initech` nennt ein neues Profil, das `show` nicht listet, also lässt sein Hinweis `--profile` weg.
- Ist diese Quelle `fresh`, bleibt ein Name weg, der schon vergeben ist, denn der Zielbefehl würde ihn ohne `--replace` ablehnen. Ein freier Name wird übernommen.
- Eine Quelle, die `needs(...)` antwortet, kann ihre Werte noch nicht listen, also bleibt der Wert weg.
- adx sperrt jeden Remote, während es eine Ablehnung beantwortet. Eine Quelle, die einen aufruft, sendet keine Anfrage, und der Wert bleibt weg. So sendet eine Ablehnung nie eine Anfrage.
- Sonst bleibt das Feld aus dem Befehl weg.
- `.lists` nennt die Option eines Feldes ohne Wert, also listet der Aufruf die Werte, die das Feld nimmt. Es kompiliert nur für ein Feld, das in `values` des Zielbefehls eine Quelle hat, wie `block` in `show`.
- Ein Feld, das der Schritt listet, steht nicht in seinem `needs`: Der Schritt listet die Werte, und der Agent wählt einen. Ein Schritt, der dem Feld einen Wert gibt, kann es nicht auch listen, also kompiliert `show.step({ block: 'x' }).lists('block')` nicht. Ebenso wenig ein Schritt, der ein Feld in `.needs` und in `.lists` nennt, in beiden Reihenfolgen.
- Ein globales Feld lässt sich nicht mit `.lists` listen: Seine Quelle steht in `global`, nicht in `values` des Befehls.

### Ein Checker für eine Codebasis

`lintkit` prüft die Go-Dateien eines Ordners gegen Hausregeln. Es liest nur, und seine Antwort wächst mit dem Code: 47 Funde in einem Paket sind normal. Zwei neue Teile:

- **Ein Root aus einem Marker**: `marker('go.mod')` ist der nächste Ordner am oder über dem Arbeitsverzeichnis, der eine `go.mod` enthält. Er folgt dem Arbeitsverzeichnis, also hat er keine Variable und keine Option.
- **Pfad-Schemas**: `dir(root)` ist ein Zod-Schema für einen Ordner in einem Root. Der Aufrufer schreibt einen Pfad, und `run` bekommt ein `Dir`. `walk` besucht jede reguläre Datei darunter in sortierter Reihenfolge, und `text` hört an der Grenze auf, die du angibst.

```ts
const gomod = root('module', marker('go.mod'));
```

`Finding` ist das Zod-Schema eines Funds. Seine Felder sind `id`, `rule`, `file`, `line`, `message` und `source`, die Zeilen um den Fund. Eine Funktion liest die Dateien und sammelt die Funde:

```ts
const SOURCE_BYTES = 1_048_576; // no Go file of ours is larger than 1 MiB

async function findAll(folder: Dir, only: readonly string[]) {
  const all: z.output<typeof Finding>[] = [];
  for await (const file of folder.walk('.go')) {
    const source = await file.text(SOURCE_BYTES);
    all.push(...check(file.rel, source, only));
  }
  return all;
}
```

`check` und `RULES` kommen aus `rules.ts`, deinem eigenen Modul. `RULES` ist die Liste der Regelnamen, `as const`, und `check` baut jeden Fund, mit einer id, die aus Regel, Datei und Zeile gehasht ist. Eine zu große Datei oder ein Link, der aus dem Modul hinausführt, lässt `file.text` oder `walk` die eigene Ablehnung von adx werfen, die die Datei schon nennt. Du fängst sie nicht.

Die Liste, mit einer Regel über zwei Felder in `check` und einem eigenen Schritt in `next`:

```ts
const noRule = code('NO_RULE', 'fix', 'Name a rule, or leave --strict out');
const noFinding = code('FINDING_NOT_FOUND', 'fix', 'Run the check again and use an id it lists');
```

```ts
const findings = list({
  does: 'checks the Go files of a folder',
  input: z.object({
    dir: dir(gomod).describe('the folder to check'),
    rule: z.array(z.enum(RULES)).default([]).describe('a rule; may repeat'),
    strict: z.boolean().default(false).describe('refuse a check of all rules'),
  }),
  example: { dir: '.' },
  item: Finding,
  key: 'id',
  outline: ['rule', 'file', 'line'],
  check: ({ rule, strict }) => (strict && rule.length === 0 ? [noRule.at('rule')] : []),
  run: async ({ dir, rule }, { page }) => paged(await findAll(dir, rule), page),
  next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : []),
});
```

Die eigenen Schritte einer Liste kommen nach denen, die adx ableitet: der folgenden Seite und dem Aufruf für einen Eintrag. Ohne Fund folgt nichts, also nennt die Liste keinen eigenen Schritt.

Der Befehl `finding` zeigt einen Fund ganz, wie `language` in `hello`. Seine `id` nimmt einen Schlüssel der Prüfung:

```ts
values: { id: detailOf(findings) },
```

Das Tool listet beide. Die Konstante der Liste heißt `findings`, und ihr Wort ist `check`:

```ts
export const lintkit = tool({
  name: 'lintkit',
  version: '0.4.0',
  does: 'checks Go files against house rules',
  roots: [gomod],
  commands: { check: findings, finding },
});
```

**Ein Paket prüfen.** Die Kurzform hält 47 Funde bei je wenigen Feldern:

```console
$ cd ~/src/shop
$ lintkit check --dir ./internal/billing | jq -c '.result.items[0], .result.total'
{"id":"f-7c2e91","rule":"error-wrap","file":"internal/billing/invoice.go","line":41}
47
$ lintkit check --dir ./internal/billing | jq -r '.next[] | .command // .does'
lintkit finding --dir internal/billing
fix the findings, then check again
```

Alle 47 passen auf die Standardseite von 50, also gibt es keinen Schritt zu einer folgenden Seite. Der Schritt für einen Eintrag braucht noch die id, und er trägt `--dir`, weil `finding` ein Feld mit demselben Namen hat. Der Ordner kommt als `internal/billing` zurück: adx bereinigt jeden Pfad und zeigt ihn relativ zum Root. `./internal/billing` und `internal/billing` sind also überall derselbe Wert.

**Ein Fund ganz**, mit seinen Quellzeilen:

```console
$ lintkit finding --dir internal/billing --id f-7c2e91 | jq -r '.result.source'
39	if err != nil {
40		log.Print(err)
41		return fmt.Errorf("charge failed: %v", err)
```

**Pfade außerhalb des Moduls** werden abgelehnt, bevor dein Code läuft:

```console
$ lintkit check --dir ../secrets/key.go | jq -c '.issues[0] | {code, path}'
{"code":"PATH_OUTSIDE","path":"dir"}
```

Aus einem Ordner ohne `go.mod` darüber wird jeder Aufruf mit `ROOT_NOT_FOUND` abgelehnt, Art `ask`.

### Dateien, die der Aufruf nennt

`notes` hält Markdown-Notizen in einem Ordner. Sein Root hat einen eigenen Ort, `~/notes`. Hier nennt der Aufrufer die Datei. Darum kommen zwei weitere Pfad-Schemas dazu: `outFile(root)` für eine Datei zum Schreiben und `inFile(root)` für eine Datei zum Lesen, die existieren muss.

```ts
const home = root('home', envDir('NOTES_HOME', '~/notes'));
```

```ts
const NoteIn = z.object({
  file: outFile(home).describe('where the note goes, such as ideas/q3.md'),
  title: z.string().describe("the note's title"),
  text: multiline().describe('the note itself, Markdown'),
});
const sample = {
  file: 'ideas/q3.md',
  title: 'Q3 roadmap',
  text: '- ship saved carts',
};
```

```ts
const add = effect({
  does: 'stores one note',
  input: NoteIn,
  example: sample,
  plan: (note, { files }) => files.write(note.file, render(note)),
});
```

`render` ist deine eigene Funktion: Sie antwortet mit dem Markdown-Text einer Notiz. Bevor dein Plan läuft, prüft adx das Ziel: Der Pfad bleibt im Root, und kein Ordner steht dort, wo die Datei hinkommt. Fehlende Elternordner werden mit der Datei angelegt.

Ein zweites `notes add` auf dieselbe Datei wird mit `ALREADY_EXISTS` abgelehnt, wie in `hello`. Das Problem steht an dem Feld, das die Datei genannt hat. Sein `path` ist also `file`. Ein Pfad, der den Ordner verlässt, etwa `--file ../.ssh/config`, wird mit `PATH_OUTSIDE` abgelehnt. Ein Link, der schon am Ziel steht, wird durch den Schreibvorgang ersetzt. adx schreibt nie durch einen Link hindurch.

`notes append` ist dazu da, eine Datei zu ändern, also nutzt es `files.update`:

```ts
const append = effect({
  does: 'adds text to the end of a note',
  input: z.object({
    file: inFile(home).describe('the note to add to'),
    text: multiline().describe('the text to add, Markdown'),
  }),
  example: { file: 'ideas/q3.md', text: '- ship gift cards' },
  replace: false,
  plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
});
```

```console
$ notes append --file ideas/q3.md --text '- ship gift cards' --dry-run | jq -c '.result.changes.added'
["- ship gift cards"]
```

`outFile`, `inFile` und `home.file(...)` antworten mit einem Typ, `File`. So lässt sich jeder Datei-Handle mit einer Grenze lesen und vormerken.

**Mehrere Dateien.** Jede Datei, die in einem `plan` vorgemerkt ist, wird mit den anderen geschrieben, alle oder keine. Der Befehl `add-indexed` speichert die Notiz und führt einen Index, eine eigene Datei des Tools. Die erste Notiz legt den Index an, und die späteren aktualisieren ihn, weil `update` nie eine Datei anlegt. `indexWith` ist deine eigene Funktion: Sie antwortet mit dem Indextext samt der Zeile der Notiz.

```ts
plan: async (note, { files }) => {
  const index = home.file('index.md');
  return {
    note: files.write(note.file, render(note)),
    index: index.exists
      ? await files.update(index, LIMIT, old => indexWith(old, note))
      : files.write(index, indexWith('', note)),
  };
},
```

Die Tabelle von `notes` listet beide Befehle. `add` ist ein Befehl, also kann es nicht zugleich eine Gruppe sein: Der zweite Befehl ist ein Wort, `add-indexed`. Ein Schlüssel mit Bindestrich steht in Anführungszeichen:

```ts
commands: { add, 'add-indexed': addIndexed, append, show },
```

adx schreibt jede Datei ganz neben ihren Platz und benennt sie dann nacheinander um. Ein Absturz oder eine volle Platte hinterlässt nie eine halbe Notiz. Zwei Umbenennungen sind kein atomarer Schritt. Scheitert eine spätere, nennt `state` die Dateien, die schon verschoben sind:

```console
$ notes add-indexed --file ideas/q4.md --title Q4 --text '- tbd' | jq -r '.state'
Moved in: ideas/q4.md. Not moved: index.md. No temporary file is left.
```

**Eine volle Platte.** Die Antwort sagt, was übrig ist:

```console
$ notes add --file ideas/q5.md --title Q5 --text '- tbd' | jq -c '.kind, .state, .issues[0].code'
"ask"
"Nothing was changed. The temporary file was removed."
"SYSTEM_REFUSED"
```

Die Art ist `ask`: Eine volle Platte oder ein fehlendes Recht behebt die Person, der Agent versucht es nicht erneut.

### Eine Eingabe mit Teilen

`hello greet-all` grüßt mehrere Personen in einem Aufruf. Seine Eingabe ist eine Liste von Objekten, also kommt sie über `--json`. Zwei neue Teile:

- **Ein Pfad unterhalb eines Feldes**: `.at()` nimmt statt eines Feldes eine Liste. Der erste Teil ist das Feld, und jeder weitere Teil ist ein Schlüssel oder ein Index. So nennt ein Problem genau den Teil, der falsch ist.
- **Ein Shape**: ein Schema, das ein Aufrufer schreibt und das kein Befehl als Ganzes nimmt. Das Tool meldet es unter einem Namen an, und `schema` gibt es aus.

Eine Person ist ein solches Shape. Der Befehl nimmt eine Liste davon:

```ts
const Person = z.object({
  name: z.string().describe('who to greet'),
  lang: z.enum(['en', 'de', 'eo']).default('en').describe('the language code'),
});

const twice = code('NAME_TWICE', 'fix', 'Name each person once');

const greetAll = read({
  does: 'greets several people',
  input: z.object({ people: z.array(Person).describe('the people to greet') }),
  example: { people: [{ name: 'Ada', lang: 'de' }] },
  check: ({ people }) =>
    people.flatMap((person, i) =>
      people.findIndex(p => p.name === person.name) < i
        ? [twice.at(['people', i, 'name'], `${person.name} is named twice`)]
        : [],
    ),
  run: ({ people }) => ({
    greetings: people.map(person => `${hellos[person.lang]}, ${person.name}!`),
  }),
});
```

Das Tool listet das Shape in `shapes`, unter dem Wort, das es benennt:

```ts
export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  shapes: { person: Person },
  commands: { 'greet-all': greetAll },
});
```

**Ein Name, der zweimal kommt.** Das Schema kann diese Regel nicht sagen, also sagt sie `check`, und es zeigt auf die zweite Stelle, an der der Name steht:

```console
$ hello greet-all --json '{"people":[{"name":"Ada"},{"name":"Bob"},{"name":"Ada"}]}' | jq -c '.issues[0] | {code, path}'
{"code":"NAME_TWICE","path":"people.2.name"}
```

- Die Antwort schreibt den Pfad mit Punkten. Ein Index ist eine Zahl, in der Liste und im Pfad.
- Der erste Teil wird geprüft wie ein flacher Pfad: `.at(['persons', 2, 'name'])` kompiliert nicht, in `check` und in `refuse`.
- Die flache Form bleibt. `.at('people')` ist das Problem am Feld selbst.
- Hat das Feld eine Quelle, füllt adx `command` daraus, wie bei einem flachen Pfad.

**Das Shape in `schema`.** `hello schema` listet die Shapes neben den Befehlen, und `hello schema person` gibt eines als JSON Schema aus:

```console
$ hello schema | jq -c '.result.shapes'
["person"]
$ hello schema person | jq -c '.result.shape.required'
["name"]
```

**Ein Teil, der sein Schema nicht erfüllt.** adx lehnt ihn mit `SCHEMA` ab, an derselben Art von Pfad. Der Teil liegt in einem Shape, also zeigt der Befehl des Problems dieses Shape, nicht die ganze Eingabe des Befehls:

```console
$ hello greet-all --json '{"people":[{"name":"Ada","lang":"xx"}]}' | jq -c '.issues[0] | {code, path, command}'
{"code":"SCHEMA","path":"people.0.lang","command":"hello schema person"}
```

- adx erkennt den Teil am Schema-Wert: Dasselbe `Person` steht in `shapes` und in der Eingabe.
- Die ganze Eingabe eines Befehls braucht kein Shape. `hello schema greet-all` gibt sie schon aus.
- Ein Shape ist auch der Ort für eine Datei, die jemand von Hand bearbeitet. So zeigt `schema`, was die Datei enthalten darf.
- Ein Schlüssel von `shapes` ist ein Wort, und ein Shape und ein Befehl können kein Wort teilen. Das ist ein `DECLARATION`-Fehler beim Start.
- Die Startantwort listet keine Shapes und hält keine Daten des Tools: Sie nennt die Befehle und die ersten Schritte. Daten kommen aus einem Befehl.

**Ein Teil, den nur der Handler prüfen kann.** Manche Teile haben eine Form, die von gespeicherten Daten abhängt. Angenommen, ein Freund ist ein Kollege oder ein Verwandter, und was ein Aufrufer über einen Freund sagt, hängt von dieser Art ab:

```ts
// What a caller says about a friend, by the kind of friend. No command takes one whole.
const Colleague = z.object({ team: z.string().describe('the team you share') });
const Relative = z.object({ relation: z.string().describe('such as aunt or cousin') });
const ABOUT = { colleague: Colleague, relative: Relative };
```

Das Schema der Eingabe kann die Art nicht kennen, also sagt es für `about` nur `z.unknown()`. Der Handler prüft den Teil mit `check`, sobald er den Freund gelesen hat:

```ts
plan: async ({ name, about }, { files, refuse }) => {
  const friend = await friendFile(name).json(LIMIT, Friend);
  // The stored kind picks the shape, so the schema of the input cannot check this part.
  const said = check(ABOUT[friend.kind], about, ['about']);
  if (said.issues !== null) return refuse(...said.issues);
  const described = JSON.stringify({ ...friend, about: said.data });
  return files.update(friendFile(name), LIMIT, () => described);
},
```

```console
$ hello friends describe --name ada --json '{"about":{"team":7}}' | jq -c '.issues[0] | {code, path, command}'
{"code":"SCHEMA","path":"about.team","command":"hello schema colleague"}
```

- `check(shape, value, path)` antwortet `{ data, issues }`: der geprüfte Wert mit `issues: null`, oder `data: null` mit mindestens einem Problem.
- Jedes Problem hat den Code `SCHEMA`, wie die Probleme aus adx' eigener Prüfung. Es steht an dem Pfad, den du angibst, plus der Stelle im Teil.
- Der Pfad ist eine Liste, die mit einem Feld des Befehls beginnt, wie bei `.at()`.
- Das Tool listet `colleague` und `relative` in `shapes`, also zeigt der Befehl des Problems das Shape. Bei einem Shape, das das Tool nicht listet, zeigt der Befehl die Eingabe des Befehls, der lief.
- `check` lehnt nichts ab. Der Handler gibt `refuse(...)` zurück, und ein `refuse` nimmt die Probleme mehrerer Prüfungen.

Ein geprüftes Shape, das das Tool nicht listet, kann ein gelistetes nennen, mit einem vierten Argument. oriko prüft einen Eintrag gegen das Shape, das die Art seines Blocks nimmt. Das Tool listet kein Shape pro Art, aber es listet `item`, das alle zeigt:

```ts
export const itemOf = (block: Block, value: unknown) =>
  check(ITEM[block.kind], value, ['value'], { as: Item });
```

- `as` nimmt ein Shape, das das Tool in `shapes` listet, den Wert selbst und nicht seinen Namen.
- Der Befehl jedes Problems zeigt dann dieses Shape: hier `oriko schema item`.
- `as` ändert nur den Befehl. Der Wert wird weiter gegen das erste Argument geprüft.

**Ein Schritt zu `schema`.** Ein Schritt kommt aus einem Befehl, und `schema` ist adx' eigener Befehl. `schema.step(name)` ist der Schritt dorthin. `friends add` nennt zuerst das Shape, das der nächste Aufruf nimmt, und dann diesen Aufruf:

```ts
next: (_, { name, kind }) => [schema.step(kind), describe.step({ name })],
```

```console
$ hello friends add --name ada --kind colleague | jq -r '.next[].command'
hello schema colleague
hello friends describe --name ada
```

- Der Name ist ein Shape oder ein Befehl, so wie ein Aufrufer ihn nach `schema` schreibt.
- adx prüft den Namen beim Start. Ein Name, den `schema` nicht kennt, ist ein `DECLARATION`-Fehler.

### Gespeicherte Daten, die ihr Format ändern

Ein Tool ändert sich, und mit ihm die Felder, die es speichert. `hello` 0.2 hat eine Sprache pro Freund gespeichert. `hello` 0.3 speichert mehrere. Der Ordner der Person enthält dann Dateien beider Formate.

`stored` gibt einer Art gespeicherter Daten eine Formatnummer. `.from` deklariert ein älteres Format und den Schritt zum nächsten:

```ts
const FriendV1 = z.object({ name: id(), lang: z.string() });
const FriendV2 = z.object({ name: id(), langs: z.array(z.string()) });

const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));
```

Liste jede Datenart im Tool. `hello schema` zeigt dann die Nummer, in der jede Datenart geschrieben wird, und das Testkit prüft sie. Beim Start sieht adx nicht, welche Datenarten ein Handler liest. Eine Datenart, die fehlt, wird darum beim Aufruf abgelehnt, als `DECLARATION`-Fehler, sobald `file.json` oder `parse` auf sie trifft.

```ts
stored: [Friend],
```

Dann lies und schreibe über die Datenart. `friends show` liest, und `friends learn` fügt einem Freund eine Sprache hinzu:

```ts
run: ({ name }) => friendFile(name).json(LIMIT, Friend),
```

```ts
plan: ({ name, lang }, { files }) =>
  files.update(friendFile(name), LIMIT, old => {
    const friend = Friend.parse(old);
    return Friend.stringify({ ...friend, langs: [...friend.langs, lang] });
  }),
```

- `Friend.stringify` schreibt `"version": 2` in den Text. `Friend.parse` und `file.json` lesen es zurück. Eine Datei ohne das Feld ist Format 1.
- Ein Lesen wandelt eine ältere Datei nur im Speicher um. Der nächste echte Schreibvorgang legt das neue Format ab.
- Eine Datei in einem neueren Format wird mit `NEWER_VERSION` abgelehnt, Art `ask`. So schreibt ein altes Tool nie eine Datei ohne die Felder zurück, die es nicht kennt.
- Eine Datei, die ihr Schema nicht erfüllt, wird mit `STORED_INVALID` abgelehnt, Art `ask`. adx rät nie.

```console
$ cat ~/.hello/friends/ada.json
{"name":"ada","lang":"de"}
$ hello friends show --name ada | jq -c '.result'
{"name":"ada","langs":["de"]}
$ hello friends learn --name ada --lang eo | jq -c '.applied'
true
$ cat ~/.hello/friends/ada.json
{"version":2,"name":"ada","langs":["de","eo"]}
```

Die Nummer zählt das Format einer Datenart, nicht die Version des Tools:

- Du erhöhst sie von Hand, und nur, wenn sich die gespeicherten Felder ändern.
- Sie sinkt nie und wird nie zweimal vergeben. Auch eine Beta, die die Felder ändert, nimmt die nächste Nummer.
- Jede Datenart hat ihre eigene Nummer. Eine Änderung an einer Datenart `template` lässt die `friend`-Dateien unberührt.

Gibt es mehrere ältere Formate, nenne sie vom neuesten abwärts. Jeder Schritt antwortet mit dem Format nach ihm:

```ts
const Friend3 = stored('friend', 3, FriendV3)
  .from(2, FriendV2, old => ({ ...old, nick: old.name }))
  .from(1, FriendV1, old => ({ name: old.name, langs: [old.lang] }));
```

Das Testkit bewacht die Nummer. Bei seinem ersten Lauf schreibt es einen Fingerabdruck jedes gespeicherten Schemas, pro Formatnummer, in eine Datei neben der `package.json`. Checke diese Datei ein. Danach vergleicht das Testkit nur noch. Ändert sich ein Schema, aber nicht seine Nummer, schlägt der Test fehl:

```console
✖ hello keeps the agent rules > stored data
  friend: the schema changed, but its version is still 2.
  Raise it to 3 and add .from(2, ...) for the old files.
```

### Dein Tool testen

Das Testkit, `@honeyglass/adx/test`, prüft jeden Befehl deines Tools auf das Verhalten, das diese Anleitung beschreibt: mehrere Fehler in einem Aufruf, jede Option leer gelassen, unbekannte Felder, ein Wert außerhalb jeder Liste, Probeläufe, die nichts ändern, Schritte, die laufen, Hinweise, die laufen. Du gibst ihm, was nur du weißt: Startdateien, Fake-Server und Variablen. Es läuft auf `node:test`, also ist nichts weiter zu installieren.

Hier ist die Testdatei für `tracker`, `tests/tracker.test.ts`. Sie importiert das Tool aus `cli/` und einzelne Befehle aus ihrem Feature:

```ts
import { tracker } from '../cli/tracker.ts';
import { api } from '../core/tracker.ts';
import { create } from '../tickets/create.ts';
import { tickets } from '../tickets/list.ts';
```

Zuerst der Fake-Server, eine Tabelle von Routen:

```ts
const ticket = {
  id: 'CW-112',
  title: 'Totals round twice',
  state: 'open',
  labels: ['bug'],
  body: '',
};
const project = '/projects/checkout-web';
```

```ts
const routes = {
  'GET /user': { login: 'ada', active: true },
  'GET /stats': { open: 73, closed: 412 },
  [`GET ${project}/stats`]: { open: 73, closed: 412 },
  'GET /projects': [{ name: 'checkout-web' }],
  [`GET ${project}/labels`]: [{ name: 'bug' }, { name: 'payments' }],
  [`GET ${project}/teams`]: [{ name: 'web' }],
  [`GET ${project}/teams/web/milestones`]: [{ name: 'q3' }],
  [`GET ${project}/tickets`]: { items: [ticket], total: 1 },
  [`GET ${project}/tickets/CW-112`]: ticket,
  [`POST ${project}/tickets`]: { ...ticket, id: 'CW-132' },
  [`PATCH ${project}/tickets/CW-112`]: { ...ticket, state: 'closed' },
};
```

Dann die Samples und die Tests. `conformance`, `fake` und `reply` sind Importe aus `@honeyglass/adx/test`:

```ts
const samples = {
  env: { TRACKER_TOKEN: 'test-token' },
  fakes: [fake(api, routes)],
};

test('tracker keeps the agent rules', t => conformance(t, tracker, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/tracker.ts'], samples));
```

```ts
test('a busy server is a retry', async () => {
  const busy = fake(api, { [`GET ${project}/tickets`]: reply(503) });
  const options = { ...samples, fakes: [busy] };
  const answer = await tickets.invoke({ project: 'checkout-web' }, options);
  assert.equal(answer.kind, 'retry');
  assert.equal(answer.issues?.[0]?.code, 'SERVER_BUSY');
  assert.equal(answer.state, 'Nothing was changed.');
});
```

Die gültigen Aufrufe kommen aus den Beispielen deiner Befehle. Der Fake muss sie also beantworten: `CW-112`, das Label `bug`, das Team `web` und der Meilenstein `q3` stehen an beiden Stellen.

```console
$ node --test
▶ tracker keeps the agent rules
  ✔ raw JSON input
  ✔ schema at run time
  ✔ JSON when piped
  ✔ dry runs
  ✔ hints that run
  ...
✔ tracker keeps the agent rules (412ms)
✔ the program keeps them too (2.9s)
✔ a busy server is a retry (14ms)
```

**`conformance` mit einem Tool** führt jede Prüfung im selben Prozess aus, jede in einem frischen Testordner. Es vergleicht den Ordner vor und nach jedem Aufruf. Ein Probelauf, der eine Datei geschrieben hat, schlägt also fehl. Der Fake sitzt hinter einem Rekorder. So sieht das Testkit, dass ein Probelauf von `ticket create` kein `POST` gesendet hat und dass ein Verbindungsabbruch im echten Lauf mit dem richtigen `state` beantwortet wird. Das Testkit beobachtet auch stdout. Eine vergessene Debug-Zeile lässt den Test fehlschlagen:

```console
✖ JSON when piped
  tracker ticket create --project checkout-web --label wrote 33 bytes to stdout beside its answer:
  labels [ { name: 'bug', description: '' }, ... ]
```

**`conformance` mit einer Kommandozeile** führt dieselben Prüfungen gegen das echte Programm aus, gestartet als Prozess in einem frischen Testordner für Home, Temp und Arbeitsverzeichnis. Es liest `tracker schema` und leitet jeden Aufruf daraus ab. So fängt es auch, was nur der Prozess tut, etwa ein Schreiben direkt auf `process.stdout`. Es stellt die Fakes auf einem lokalen Port bereit und richtet `TRACKER_URL` darauf. Ein Build-Schritt ist vorher nicht nötig: Node führt `bin/tracker.ts` aus, wie es ist.

**Genannte Befehle.** Das Testkit zerlegt jeden Befehl, den das Tool nennt, in einem `next`-Schritt oder in einem Problem, mit `unbash` in Shell-Wörter. Dann prüft es, dass adx jeden Aufruf kennt: den Befehl, jede Option und jeden Wert. Ein Schritt ohne `needs` muss so laufen, wie er dasteht.

**`invoke`** führt einen Befehl ohne argv und ohne stdout aus und antwortet mit demselben Objekt, das das Tool ausgibt. Es ist eine Methode des Befehls-Handles, also ist seine Eingabe typisiert: `tickets.invoke({ projekt: 'checkout-web' })` kompiliert nicht. Ein Befehl läuft als Teil seines Tools. Darum importiert die Testdatei auch das Tool. Nutze es für die Fälle, die nur du kennst, etwa einen überlasteten Server. Seine Optionen nehmen die Samples, dazu `dryRun` und `replace` für die zwei Optionen eines Effekts.

**Ein Tool mit einem Datenordner** nennt einen `seed`: einen Ordner mit den Dateien, die das Tool vorfinden soll. Das Testkit kopiert ihn in den Testordner jeder Prüfung. Dieses Tool nennt auch einen `skill`, also nennen die Samples seine `SKILL.md` als `skillFile`:

```ts
const samples = { seed: 'test/seed', skillFile: 'SKILL.md' }; // the seed holds the friend ada

test('hello keeps the agent rules', t => conformance(t, hello, samples));

test('a taken name needs --replace', async () => {
  const friend = { name: 'ada', lang: 'en' };
  const refused = await add.invoke(friend, samples);
  assert.equal(refused.issues?.[0]?.code, 'ALREADY_EXISTS');
  const options = { ...samples, replace: true };
  const replaced = await add.invoke(friend, options);
  assert.equal(replaced.result?.replaces, true);
});
```

**`run`** führt einen ganzen Aufruf im Prozess des Tests aus, von den Argumenten bis zum Exit-Code. Es ist ein weiterer Import aus `@honeyglass/adx/test`. Nutze es für das, was nur ein ganzer Aufruf zeigt: den Text, den eine Person liest, eine Eingabe über stdin, eine Gruppe allein, den Exit-Code. Es antwortet mit `exit`, `out` und `err`, dem Exit-Code und dem, was der Aufruf auf stdout und auf stderr geschrieben hat:

```ts
test('a person at a terminal reads text', async () => {
  const { exit, out } = await run(hello, ['greet', '--name', 'Ada'], { ...samples, tty: true });
  assert.equal(exit, 0);
  assert.equal(out, 'Hello, Ada!\n');
});

test('the input can come through stdin', async () => {
  const stdin = '{"name":"Ada","lang":"de"}';
  const { out } = await run(hello, ['greet', '--json', '-'], { ...samples, stdin });
  assert.equal(JSON.parse(out).result.greeting, 'Hallo, Ada!');
});
```

- Seine Optionen nehmen die Samples und die drei Dinge, die ein Aufruf aus seiner Umgebung bekommt.
- `tty` sagt, ob stdout ein Terminal ist. `true` antwortet mit Text. Der Standard ist `false`, also JSON.
- `stdin` ist der Text, den der Aufruf liest. Der Standard ist `null`: Nichts kommt über eine Pipe.
- `cwd` ist das Arbeitsverzeichnis. Der Standard ist ein frischer Testordner.
- Der Datenordner ist ein Testordner, in den der Seed kopiert ist, wie in jeder Prüfung.
- `run` startet kein Programm, also kosten viele Aufrufe wenig. Es zeigt nicht, was nur der Prozess tut. `conformance` mit einer Kommandozeile bleibt der Test des echten Programms.

Vier weitere Prüfungen laufen, wenn das Tool ihren Gegenstand hat:

- **Der Skill.** Nennt das Tool einen `skill`, muss die `SKILL.md` existieren, die `samples.skillFile` nennt, und mit einem Frontmatter beginnen, das `name` und `description` hat.
- **Gespeicherte Daten.** Jedes Schema einer `stored`-Datenart muss zum Fingerabdruck passen, der für seine Formatnummer eingecheckt ist.
- **`--replace`.** Ein Effekt, der `--replace` listet und in keiner Prüfung ein `files.write` vormerkt, schlägt fehl, mit der Lösung: `replace: false` ergänzen.
- **Große Antworten.** Ein `read`, das ohne `output` mit einer langen Liste oder einem großen Dokument antwortet, schlägt fehl.

Dieselbe Prüfung läuft als Befehl, für CI oder für ein Tool, das jemand anderes auf adx gebaut hat:

```console
$ pnpm exec adxcheck report --env TRACKER_TOKEN=test-token -- node bin/tracker.ts
Raw JSON input      met
Schema at run time  met
JSON when piped     met
Input hardening     met
Dry runs            not probed   no recorder for "tracker": pass a fake to probe sends
Agent skill         none named
...
Hints that run      not probed   TICKET_NOT_FOUND was never raised
```

`report` berichtet nur und endet mit 0. `adxcheck run` lehnt stattdessen ab: Jedes geprüfte Verhalten, das nicht erfüllt ist, ist eine Ablehnung mit Exit 1, ein Problem pro gescheiterter Prüfung, jedes mit dem Aufruf, der es gezeigt hat.

"Not probed" ist ehrlich: Die Blackbox ohne Fake-Server kann nicht sehen, ob ein Probelauf sendet, und ein Code, den keine Prüfung ausgelöst hat, kann nicht beweisen, dass sein Hinweis läuft. Löse solche Codes in einem eigenen Test aus. "None named" ist auch ehrlich: Der Agent-Skill gehört dir, und adx zählt ein Tool ohne Skill nicht so, als hätte es diese Regel erfüllt.

## 6. Was jedes Tool bekommt

**Aufrufe**

- `tool`: Name, Version, der Name des Skills oder `null`, die Befehle und die ersten Schritte.
- `tool <group>`: die Aktionen der Gruppe.
- `tool schema`: jeder Befehl, die Shapes, die gemeinsamen Optionen, die vier Arten, jeder Code mit Art und Hinweis, die Roots mit Variable und Option, die Variablen, die gespeicherten Datenarten mit ihrer Formatnummer, die Grenzen.
- `tool schema <command>`: das Eingabeschema, die globalen Felder, die der Befehl nimmt, die Optionen, die er nimmt, welche Felder Listen haben, Schlüssel, Felder und Kurzform einer Liste, die Felder eines `read` mit `output`, die Seitengröße, `replace: 'always'` eines Effekts, der eine abgeleitete Datei ersetzt, das Beispiel.
- `tool schema <shape>`: ein Shape als JSON Schema.
- `tool <command> --help`: dieselben Tatsachen als Text für Menschen.
- `tool --version`: die Version.

Routing und Hilfe kommen aus der Befehlstabelle von adx, die die `commands` deines Tools füllen. Einen Hilfetext schreibst du nicht.

**Optionen**

- `--json '{...}'`, an jedem Befehl: die Eingabe als ein Objekt. `--json -` liest sie von stdin.
- `--output text` oder `--output json`, an jedem Befehl: erzwingt die Form. Sonst Text am Terminal, JSON in der Pipe.
- `--dry-run`, an jedem `effect`: führt nur `plan` aus und antwortet `"applied": false`.
- `--replace`, an einem `effect` ohne `replace: false` oder `replace: 'always'`: erlaubt `files.write`, eine vorhandene Datei zu ersetzen.
- `--fields a,b`, an einer `list` und an einem `read` mit `output`: die genannten Felder, jedes ganz. Allein listet es die Felder.
- `--page <cursor>`, an einer `list`: die Seite, die die vorige Antwort genannt hat.
- `--home <folder>`, an jedem Befehl eines Tools mit einem solchen Root: verschiebt den Root. Die Option heißt wie der Root.
- `--<option>` allein, für ein Feld mit einer Liste: listet seine Werte oder nennt den Befehl, der das tut.

**Wie adx einen Aufruf liest**

adx nutzt kein CLI-Framework. Es liest die Argumente mit `util.parseArgs` von Node im nachsichtigen Modus und prüft jedes Token selbst:

- Befehlswörter stehen vorn, Optionen danach: `tracker ticket list --project checkout-web`.
- Ein Feld wird zu einer Option mit demselben Namen, in Kebab-Case: Das Feld `dueDate` ist `--due-date`.
- Ein boolesches Feld ist ein Schalter: `--strict` setzt es, und es nimmt keinen Wert. Eine Zahl wird aus ihrem Text gelesen.
- `--name=value` wirkt wie `--name value`. So gibt man einen Wert, der mit einem Bindestrich beginnt.
- Eine Option, auf die eine weitere Option folgt, gilt als ohne Wert gegeben.
- Eine unbekannte Option wird gesammelt, und das Lesen geht weiter. Alle Fehler eines Aufrufs kommen in einer Antwort zurück.
- Eine Option darf nur für ein Array-Feld mehrfach kommen, etwa `--label bug --label payments`.
- Optionen und `--json` füllen ein Objekt. Ein Feld, das beide geben, wird mit `REPEATED_OPTION` abgelehnt.
- Objekte und Arrays von Objekten gehen nur über `--json` hinein.
- Ein Feld darf nicht wie eine Option heißen, die adx seinem Befehl gibt. `json`, `output`, `dry-run`, `replace` und `help` sind an jedem Befehl vergeben, `page` an einem `list`, und `fields` an einem `list` und an einem `read` mit `output`. Ein `effect` darf also ein Feld `page` nennen. `version` ist an jedem Befehl frei, denn `--version` gehört zum Tool allein. Ein Zusammenstoß kompiliert nicht: Der Compiler meldet ihn an `input`. Ein globales Feld erreicht jede Art von Befehl, also nimmt es keinen dieser Namen.
- Ein Feld darf auch nicht wie ein Root heißen, etwa `home`. Das ist ein `DECLARATION`-Fehler beim Start. Benenne das Feld um, oder den Root.

**Befehle, die adx nennt**

Jeder Befehl in einem Schritt oder in einem Problem ist vollständig. So kann ein Agent ihn Wort für Wort ausführen:

- Ein Schritt, den du schreibst, trägt die Felder, die du ihm gegeben hast. Als Befehl eines Problems trägt er auch die Felder, die er mit `.carry` aus dem abgelehnten Aufruf nimmt. Mit `.lists` nennt er die Option eines Feldes ohne Wert.
- Ein Befehl, den adx ableitet, trägt die Felder des Aufrufs, die der genannte Befehl unter demselben Namen hat. Abgeleitete Befehle sind die Liste der Werte eines Feldes, die folgende Seite und der Befehl für einen Eintrag einer Liste.
- Jeder genannte Befehl trägt die globalen Felder, die das Ziel nimmt, und den Datenordner, wenn er nicht der Standardordner ist.
- Jeder Wert steht für die Shell in Anführungszeichen.

**Die Antwort**

```json
{
  "ok": true,
  "applied": true,
  "result": {},
  "next": [{ "does": "...", "command": "...", "needs": ["..."] }]
}
```

```json
{
  "ok": false,
  "kind": "fix",
  "state": "Nothing was changed.",
  "issues": [{ "code": "...", "path": "...", "message": "...", "hint": "...", "command": "..." }]
}
```

`applied` erscheint nur bei Befehlen, die etwas ändern. Der echte Lauf eines Effekts antwortet mit allem, was sein Probelauf geantwortet hat, und dazu mit dem, was `apply` zurückgegeben hat. Eine Ablehnung hält nur Probleme: `next` gehört zu einem Erfolg. Der `path` eines Problems ist ein Feld oder eine Stelle darunter, mit Punkten geschrieben, etwa `people.2.name`. Ein Problem aus `.issue()` hat keinen `path`, und `command` steht nur dort, wo ein Befehl hilft. Exit-Codes: 0 Erfolg, 1 eine Ablehnung der Art `fix`, `ask` oder `retry`, 2 die Art `bug`.

**Dateien**

- Eine neue Datei bekommt den Modus `0600`, und ein Ordner, den adx anlegt, bekommt `0700`. Eine ersetzte oder geänderte Datei behält ihren Modus. So behält eine Person, die eine Datei für eine Gruppe geöffnet hat, diese Wahl. Unter Windows werden die Modi nicht angewendet.
- Eine Datei, die andere lesen müssen, nennt ihren eigenen Modus. Der gilt dann auch bei einem Ersetzen:

```ts
return files.write(file, names, { mode: 0o644 });
```

- Ein `files.write`, dessen Bytes der vorhandenen Datei gleichen, schreibt nichts und antwortet `replaces: false` und `unchanged: true`. Ebenso ein `files.update`, dessen Funktion den Text antwortet, den die Datei enthält.
- Ein Schreiben, das nichts schreibt, setzt auch keinen Modus, auch wenn sein `mode` vom Modus der Datei abweicht.
- Ein echter Lauf, in dem jede Datei unverändert bleibt, antwortet trotzdem `applied: true`, weil die Dateien danach im gewünschten Zustand sind. `unchanged` steht pro Datei, `applied` für den ganzen Aufruf.
- `files.write` und `files.update` antworten `{ file, bytes, replaces }`. Ersetzt die Datei eine andere, fügt adx `changes` hinzu:

```console
$ hello friends edit --name ada --lang en --dry-run | jq -c '.result.changes'
{"added":[],"changed":["lang"],"removed":[],"more":0}
```

- Sind der alte und der neue Inhalt beide JSON, halten die Listen JSON-Pfade, etwa `langs.0`. Bei anderem Inhalt halten sie die hinzugefügten und die entfernten Zeilen.
- Jede Liste hält höchstens 20 Einträge. `more` zählt, was diese Grenze weggelassen hat.
- Ein Plan, der es in den Worten des Tools sagen kann, gibt sein eigenes `changes` zurück, und adx behält dieses:

```ts
plan: async ({ name, lang }, { files }) => {
  const next = (old: string) => JSON.stringify({ ...JSON.parse(old), lang });
  const written = await files.update(friendFile(name), LIMIT, next);
  const changes = { added: [], changed: ['language'], removed: [], more: 0 };
  return { ...written, changes };
},
```

**Die eigenen Codes von adx**

`tool schema` gibt diese Liste in jedem Tool aus, jeden Code mit Art und Hinweis.

- `fix`: `UNKNOWN_COMMAND`, `OPTION_BEFORE_COMMAND`, `UNKNOWN_OPTION`, `UNEXPECTED_ARGUMENT`, `UNEXPECTED_VALUE`, `REPEATED_OPTION`, `MISSING_VALUE`, `MISSING_INPUT`, `INVALID_JSON`, `INPUT_TOO_LARGE`, `SCHEMA`, `NOT_IN_LIST`, `PATH_OUTSIDE`, `FILE_NOT_FOUND`, `NOT_A_FILE`, `NOT_A_FOLDER`, `ALREADY_EXISTS`, `URL_NOT_ALLOWED`
- `ask`: `ROOT_NOT_FOUND`, `ENV_MISSING`, `SYSTEM_REFUSED`, `ACCESS_REFUSED`, `REMOTE_REFUSED`, `NEWER_VERSION`, `STORED_INVALID`
- `retry`: `NETWORK_FAILED`, `SERVER_BUSY`
- `bug`: `DECLARATION`, `UNKNOWN_ERROR`, `PANIC`

`SCHEMA` deckt jedes Problem mit der Form der Eingabe ab. Sein `path` unterscheidet sie. Ein Handler löst es mit `check` aus. `MISSING_VALUE` steht an einem Feld, dessen Option ohne Wert kam und das keine Liste zum Ausgeben hat, und an jedem Feld, das eine Liste zuerst braucht. `DECLARATION` heißt, dass der Aufbau des Tools selbst falsch ist, auf eine Weise, die der Compiler nicht sehen kann, etwa ein `id()`-Feld ohne Quelle, ein Beispiel, das ein `.regex()` nicht erfüllt, ein `apply` ohne `look` oder ein Schritt zu einem Befehl, den kein Tool listet. adx prüft den Aufbau bei jedem Start. Du siehst es also beim ersten Lauf.

**Fehler, die du nicht zugeordnet hast**

- Keine Verbindung, ein Zeitlimit oder der Status 408, 429, 502, 503 oder 504: `NETWORK_FAILED` oder `SERVER_BUSY`, Art `retry`.
- Der Status 401 oder 403, oder die Token-Variable ist nicht gesetzt: `ACCESS_REFUSED` oder `ENV_MISSING`, Art `ask`.
- Jeder andere Status außerhalb von 2xx, oder eine Antwort, die ihr Schema nicht erfüllt: `REMOTE_REFUSED`, Art `ask`.
- Ein Systemfehler auf einem Pfad, etwa eine volle Platte: `SYSTEM_REFUSED`, Art `ask`.
- Ein `RefusalError` aus `@honeyglass/utils`, der nicht von adx stammt: `UNKNOWN_ERROR`, mit der Art, die er trägt, seinem reason als Meldung und seinem next als Hinweis.
- Jeder andere geworfene Fehler: `UNKNOWN_ERROR`, Art `bug`.

Ein Lesen wird bis zu 3-mal erneut versucht, bevor es abgelehnt wird, mit wachsender Pause, bei einem Netzwerkfehler, einem 429 oder einem 503. Ein Senden versucht adx nie erneut: Der Agent bekommt die Art `retry` und den `look`-Schritt. Jede Ablehnung behält den Fehler, der zu ihr geführt hat, als ihre `cause`.

adx behandelt jeden dieser Fehler intern, dort, wo er entsteht. Ein Handler schreibt darum kein `try` für das, was durch adx läuft: `api.get` antwortet mit einem Wert, `files.update` übergibt den Text, und ein Fehlschlag beendet den Aufruf mit der Ablehnung von adx.

Auch dein eigener Code kann auf eine Art scheitern, die du erwartest: ein Status eines Sendens, eine Datei, die du selbst liest, ein Parser, der wirft. Nimm einen solchen Fehler als Wert, mit `$try` für ein Promise und `trySync$` für einen synchronen Aufruf, der werfen kann. Beide sind Importe aus `@honeyglass/utils/ts`. Prüfe den Fehler in der nächsten Zeile, antworte mit `refuse` und wirf weiter, was du nicht erwartet hast. `ticket close` des Trackers erwartet einen 409, solange jemand anderes am Ticket arbeitet, und lehnt mit seinem Code `STILL_OPEN` ab:

```ts
const sent = await $try(act.send('the closed ticket', request, Ticket));
if (sent.error === null) return { ticket: sent.data };
// The server answers 409 while someone else works on the ticket. Any other error flies on.
if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
throw sent.error;
```

- Schreibe keinen nativen `try`-Block und kein `.catch`.
- Lege kein `$try` um einen Bug, etwa einen Tippfehler in deinem eigenen Code. Lass ihn fliegen.
- adx fängt einen Bug einmal, in `main()`, und antwortet mit `UNKNOWN_ERROR`, Art `bug`, und Exit-Code 2.

## 7. FAQ

**Wie funktioniert die Typsicherheit?**
Die Typen jedes Befehls kommen aus seinem Zod-Schema. `run`, `plan` und `check` bekommen `z.output` des Schemas: Standardwerte eingesetzt, Pfade in `Dir` oder `File` umgewandelt. `example`, `step()` und `invoke()` nehmen `z.input`: was ein Aufrufer schreibt. Ein Feld mit Standardwert darf also fehlen, und ein Pfad ist ein String. Jede Stelle, die ein Feld nennt, nimmt `keyof` dieses Typs. Ein Tippfehler ist also ein Compilerfehler. Werte kann der Compiler nicht sehen: ein `id()`-Feld ohne Quelle, ein Beispiel, das ein `.regex()` nicht erfüllt, oder eine Route in einem Fake-Server. Die ersten beiden prüft adx beim Start. Die dritte findet das Testkit.

**Darf ich auf stdout schreiben?**
Nein. Gib einen Wert zurück und lass adx ihn schreiben. Ergänze `text` für die Form am Terminal. Fortschritt und Logs gehen auf stderr, zum Beispiel mit `console.error`. Das Testkit lässt ein vergessenes `console.log` fehlschlagen, weil eine zusätzliche Zeile jedes Programm bricht, das die Antwort liest.

**Was, wenn mein Effekt weder eine Datei noch eine HTTP-Anfrage ist?**
Führe ihn in `apply` aus, damit ein Probelauf ihn überspringt, und gib dem Befehl einen `look`-Schritt. Scheitert er, wirf `failed(state, error)` mit einem Satz, der sagt, was der Aufruf hinterlassen hat, etwa `failed('The migration ran up to step 3.', error)`. adx ordnet den Fehler einer Art zu, wie bei jedem Fehler, den du nicht zugeordnet hast. Für Dateien und Anfragen schreibt adx diesen Satz für dich.

**Warum nutzt `api` nicht einfach `fetch`?**
Weil `api` vier Dinge tut, die `fetch` nicht tut. Es prüft jede Antwort gegen ein Schema. Es ordnet einem Status eine Art zu. Es sendet nur über `act.send` in `apply`, also kann ein Probelauf nicht senden. Und das Testkit kann den Server durch einen Fake ersetzen. Wiederholungen, Zeitlimits und das Abbrechen mehrerer Anfragen laufen darin, auf RxJS. Dein Code sieht davon nichts: `api.get` antwortet mit einem Promise.

**Kann ich meinen eigenen HTTP-Client oder ein SDK eines Anbieters nutzen?**
Ja, aber adx kann nicht hindurchsehen. Das Senden gehört dann in `apply` mit `failed`, die Antworten brauchen dein eigenes Zod-Schema, und das Testkit kann sie in einem Probelauf nicht zählen. `remote` spricht JSON über HTTP. Für diesen Fall ist es der kürzere Weg.

**Braucht mein Tool einen Agent-Skill?**
Nein. Das Tool läuft und besteht seine Tests ohne. Schreib einen Skill, wenn der Agent mehr wissen muss als Schritte: wann man das Tool nutzt, den Ablauf einer Aufgabe, wann man anhält und die Person fragt. Nenne ihn mit `skill`, und die Startantwort zeigt seinen Namen.

**Braucht adx einen bestimmten Ordneraufbau?**
Nein. adx liest keinen Ordnernamen, keinen Dateinamen und keine Reihenfolge von Importen. Ein Befehl ist ein Wert, und die Tabelle des Tools nimmt ihn, wo immer er liegt. Ein kleines Tool ist eine Datei, wie `hello`. Ein größeres lässt sich nach Features schneiden, wie der [Tracker](#eine-remote-api-einbinden): `bin/` für den Einstieg, `cli/` für das Tool, ein Ordner pro Feature und `core/` für das, was Features teilen. Eine Regel, welcher Ordner welchen importieren darf, ist deine eigene. adx kennt und prüft sie nicht.

**Wie wird ein Tool ausgeliefert und gestartet?**
In seinem eigenen Repository führt Node die `.ts`-Datei aus, wie sie ist. Ergänze `#!/usr/bin/env node` als erste Zeile der Datei, die `main()` aufruft, führe `chmod +x bin/tracker.ts` aus und verlinke die Datei in deinen Pfad. Oder nenne sie unter `bin` in der `package.json` und führe `pnpm link --global` aus. Für npm kompilierst du zuerst nach JavaScript (`tsc` mit `rewriteRelativeImportExtensions` und einem `outDir`): Node entfernt keine Typen aus Dateien in `node_modules`, eine veröffentlichte `.ts`-Datei läuft also nicht. In beiden Fällen braucht die Maschine Node 24.2 oder neuer.

## 8. Bekannte Grenzen

- **Eine gespeicherte Datei lässt sich über adx nicht löschen.** Ein `files.remove` gibt es noch nicht. Ein Befehl, der löscht, muss in `apply` selbst `fs` von Node aufrufen und `failed` mit einem eigenen Satz werfen. Ein solches Löschen hat keine Prüfung in `plan`, und es gehört nicht zu "alle oder keine" mit anderen Dateien.
- **Parallele Schreibvorgänge sind nicht abgedeckt.** Zwei Aufrufe, die dieselbe Datei im selben Moment schreiben, werden nicht abgestimmt. Der spätere Schreibvorgang gewinnt, und `files.update` kann eine Änderung verlieren, die zwischen seinem Lesen und seinem Schreiben geschieht.
- **Ein Handler kann an adx vorbeigehen.** Ein Handler, der selbst `node:fs` oder `fetch` aufruft, kann eine halbe Datei schreiben oder in einem Probelauf senden. adx schützt nur, was durch `files` und einen Remote geht.
- **Zwei Befehle, die einander nennen, brauchen einen Typ.** Nennt ein Befehl einen zweiten in `next` oder in `.command()`, und der zweite nennt den ersten, hält der Compiler mit "implicitly has type 'any'" an. `(): Step[] =>` an einer der beiden Funktionen behebt es, aber die Meldung sagt das nicht.
- **Zwei Dateien, die einander beim Laden brauchen, scheitern an der Reihenfolge der Importe.** `detailOf(tickets)` und `keyOf(tickets)` lesen die Liste, wenn ihre Datei lädt. Importiert die Datei der Liste ihrerseits diese Datei, entscheidet die Datei, die zuerst lädt, ob es die Liste rechtzeitig gibt. Ein Befehl, der in einer Funktion genannt wird, etwa in `next`, `look` oder `run`, wird erst gelesen, wenn die Funktion läuft. Die Liste braucht keinen Import ihres Befehls für einen Eintrag: adx leitet diesen Schritt ab.
- **Ein `look` nennt einen Befehl seines eigenen Ordners.** `after` verlegt ein `next` über Ordner hinweg an das Tool, und `hint` verlegt den Befehl eines Problems dorthin. Das `look` eines Effekts steht im Handler. Unter einer Regel, nach der Features einander nicht importieren, kann es keinen Befehl eines anderen Features nennen.
- **Der Compiler weiß nicht, was adx geprüft hat.** adx hat ein unbekanntes `lang` schon abgelehnt, aber `byCode(lang)` gibt weiter eine Sprache oder `undefined` zurück. Der Code braucht also einen Zweig allein für den Compiler.
- **Zwei Eingabetypen sind auseinanderzuhalten.** `example: { dir: '.' }` ist ein String, während `run` ein `Dir` bekommt. Ein Feld mit Standardwert ist in `example` optional und in `run` vorhanden.
- **Eine Quelle mit Namen und ohne `Source` meldet einen Tippfehler in `needs` weit weg.** Eine Quelle, die in `values` steht, und eine Quelle mit Namen und dem Typ `Source<...>` melden den Tippfehler an der Quelle. Eine Quelle mit Namen und einem eigenen Parametertyp meldet ihn an der `values`-Zeile, die die Quelle benutzt, in etwa zehn Zeilen und ohne Vorschlag.
- **Manche Tatsachen zeigen sich erst beim Start, beim Aufruf oder in einem Test.** Ein `id()`-Feld ohne Quelle, ein Beispiel, das ein `.regex()` nicht erfüllt, ein Root, der in `roots` fehlt, eine Datenart, die in `stored` fehlt (beim Aufruf, der sie liest), ein Feld, das wie ein Root heißt, ein Hinweis für einen Befehl, den kein Tool listet, ein `apply` ohne `look`, ein Befehl, der in `commands` fehlt, und eine Fake-Route, die nicht zum Pfad in `api.get` passt.
- **Eine gespeicherte Datei, die an ihrer Datenart vorbei geschrieben wurde, hat keine Nummer.** Einer Datei, die mit `JSON.stringify` statt mit `Friend.stringify` geschrieben wurde, fehlt `"version"`, und das nächste Lesen hält sie für Format 1.
- **Ein Status eines Sendens wird von Hand zugeordnet.** `on` gibt es nur für `get`. Bei einem Senden nimmst du den Fehler mit `$try` und liest `status(error)`, wie [Fehler, die du nicht zugeordnet hast](#6-was-jedes-tool-bekommt) zeigt.
- **Ein Schalter lässt sich nicht mit einer Option auf false setzen.** Ein boolesches Feld mit dem Standardwert `true` wird nur über `--json` abgeschaltet.
- **`schema` zeigt keine Antwortform für einen `effect` und für ein `read` ohne `output`.** Ihr Antworttyp wird aus deinem Code abgeleitet.
- **Der Skill wird nicht gegen das Tool geprüft.** Das Testkit prüft, dass die Datei ein Skill ist. Es bemerkt keinen Befehl und keinen Code, den der Skill nennt und den das Tool nicht mehr hat.
- **Node prüft keine Typen.** `node hello.ts` führt Code mit Typfehlern aus. Die Sicherheit gilt nur dort, wo `tsc --noEmit` läuft: im Editor, in einem Pre-Commit-Hook und in CI.
- **Startzeit.** Node, eine `.ts`-Datei und Zod brauchen etwa 65 ms, bevor adx lädt. Ein Agent, der ein Tool in einer Aufgabe 40-mal aufruft, wartet allein dafür etwa 2,5 s.
- **Ausliefern braucht Node 24.2.** Es gibt keine einzelne Datei, die man auf eine Maschine kopiert, und ein Paket für npm muss zuerst kompiliert werden.
- **Unter Windows werden Dateimodi nicht angewendet.**
