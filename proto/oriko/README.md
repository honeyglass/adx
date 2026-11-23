# oriko on adx

`oriko` keeps master CVs as JSON, tailors one profile per job posting, and builds a .docx or a
PDF. This folder shows oriko as it would stand on adx: its 25 commands with their real inputs,
codes, files, next steps and hints, in the folders oriko has today. It has types only:
`pnpm run typecheck` checks it against `../adx/index.d.ts` and `../adx/test.d.ts`, and nothing
runs. The source is oriko at 3c3adc4, and its golden file `tests/fixtures/behavior.json`.

What oriko computes is not shown: how a CV is checked, placed on its pages, drawn and set as a
.docx. Those functions are declared with what they answer and have no body. What adx carries is
shown in full: the command table, every input schema, every code, every file a command stages,
every step and every hint.

## Folders

```text
oriko/
├── bin/
│   └── oriko.ts              the program: runs the tool on the arguments of the call
├── cli/                      the only folder that combines features
│   ├── oriko.ts              the tool: roots, shapes, command table, start
│   ├── plan.ts               plan
│   ├── build.ts              preview and build, which need a look of classic/ or terminal/ and pdf/
│   ├── next.ts               the steps that lead from one folder into another, with after
│   ├── hints.ts              the commands that help with a refusal and lie in another folder, with hint
│   └── issues.ts             WRONG_EXTENSION, CREDITS_NEED_TERMINAL
├── core/                     what several features share; imports only core/
│   ├── home.ts               the data folder ~/.oriko and the working directory, and the files in them
│   ├── cv.schema.ts          Master, Profile, NewCv, Block, Item and ContactItem, and the parts by kind
│   ├── cv.limits.ts          the block kinds, the icons and the sizes of a CV
│   ├── files.limits.ts       the largest input, photo and read file
│   ├── options.ts            the options --cv and --profile, with the one text each has
│   ├── sources.ts            cvChoices, profileChoices, blockChoices
│   ├── issues.ts             the codes core raises and those several features raise
│   ├── load.ts               the CV and the profile a command names, found, read and checked
│   └── place.ts              the page plan, and whether a CV fits its pages
├── cv/
│   ├── list.ts               cvs
│   ├── init.ts               init
│   ├── show.ts               show
│   └── issues.ts             CV_EXISTS
├── profile/
│   ├── list.ts               profiles
│   ├── set.ts                profile set
│   ├── show.ts               profile show
│   └── issues.ts             UNKNOWN_PROFILE for a name with neither a profile nor a posting
├── edit/
│   ├── commands.ts           the table of edit/: the groups block, item, cv and contact
│   ├── block.ts              block add, update, remove, move
│   ├── item.ts               item add, update, remove, move
│   ├── cv.ts                 cv update
│   ├── contact.ts            contact add, update, remove, move
│   ├── edit.schema.ts        INPUT, the input of each of the 13 edits
│   ├── save.ts               the plan every edit shares: apply, stage the CV file, say whether it fits
│   ├── apply.ts              one edit applied to a CV (declared), and its checks of a part by kind
│   └── issues.ts             NOTHING_TO_DO, BOTH_ANCHORS, OTHER_COLUMN, INDEX_OUT_OF_RANGE
├── read/
│   ├── documents.ts          read, as far as adx carries it
│   ├── sources.ts            how a source becomes text: oriko's own code
│   ├── issues.ts             the codes of read
│   └── limits.ts             the limits of a Word file and a download
├── classic/
│   ├── photo.ts              photo set
│   ├── docx.ts               the classic look as a .docx (declared)
│   ├── images.ts             the picture of photo set, read and squared: oriko's own code
│   └── issues.ts             PHOTO_UNREADABLE
├── terminal/
│   ├── sheets.ts             the pages as text, for preview (declared)
│   ├── docx.ts               the terminal look as a .docx (declared)
│   └── credits.ts            the credits block (declared)
├── pdf/
│   ├── convert.ts            the PDF through LibreOffice (declared)
│   ├── issues.ts             NOT_INSTALLED, CONVERSION_FAILED
│   └── limits.ts             the seconds one run of LibreOffice may take
└── tests/
    ├── oriko.test.ts         conformance of the tool and of the program, seven tests with run, one with invoke
    ├── types.ts              what must not compile
    ├── seed/                 the data folder the tests find: the CV jane, the profiles acme and broken
    └── work/                 posting.txt, in the working directory of one test, and the picture me.png
```

The import rule is oriko's own and holds here with no exception: a feature folder imports only
from `core/` and from itself, `core/` only from `core/`, and only `cli/` combines features.

## Commands

The 25 commands of `oriko schema` today, each with the file that holds it here.

```text
oriko                       the start answer: cli/oriko.ts, start
oriko schema                adx's own command; no file
oriko cvs                   cv/list.ts
oriko init                  cv/init.ts
oriko show                  cv/show.ts
oriko profiles              profile/list.ts
oriko plan                  cli/plan.ts
oriko preview               cli/build.ts
oriko build                 cli/build.ts
oriko read                  read/documents.ts
oriko profile set           profile/set.ts
oriko profile show          profile/show.ts
oriko photo set             classic/photo.ts
oriko block add             edit/block.ts
oriko block update          edit/block.ts
oriko block remove          edit/block.ts
oriko block move            edit/block.ts
oriko item add              edit/item.ts
oriko item update           edit/item.ts
oriko item remove           edit/item.ts
oriko item move             edit/item.ts
oriko cv update             edit/cv.ts
oriko contact add           edit/contact.ts
oriko contact update        edit/contact.ts
oriko contact remove        edit/contact.ts
oriko contact move          edit/contact.ts
```

Three kinds of command carry them:

- `list`: `cvs` and `profiles`. The key is `name`, and the outline holds every field, so there
  is no command for one item.
- `read`: `show`, `plan`, `preview` and `profile show`. Each declares its answer with `output`.
- `effect`: `init`, `build`, `read`, `profile set`, `photo set` and the 13 edits. None of them
  sends, so none has `apply`: every file is staged in `plan`, and a dry run writes nothing.

How each effect writes:

- `init` writes the CV as a new file and says `replace: false`. It also writes the shared
  placeholder photo `placeholder.png`, directly in the data folder, only when that file is
  missing. A name that is taken is refused with oriko's own `CV_EXISTS`.
- `profile set` writes the profile with `files.write`. A stored profile needs `--replace`. The
  same profile sent again needs none: nothing is written, and the answer says `unchanged: true`.
- `photo set` writes the photo, `cvs/NAME.png` or `profiles/NAME.png`, with `files.write`, and
  points the CV or the profile at it with `files.update`.
- The 13 edits change the CV file with `files.update` and say `replace: false`. An edit that
  leaves the file as it is writes nothing, and the answer says `unchanged: true`.
- `read` writes the posting with `files.write` and appends notes with `files.update`.
- `build` writes its one file and says `replace: 'always'`.

## What changes on purpose against today's oriko

Each line names the change and the adx decision behind it.

From the six decisions of oriko's move:

- **Issues stand below a field** (69). A block that a profile names and the CV lacks is refused
  at `blocks.nobody` in `profile set`, where `blocks` is a field of the input, as today. In
  `plan`, `preview` and `build` the block stands in a stored profile, and a path starts with a
  field of the call, so it is `profile.blocks.nobody`. An issue inside the stored CV starts with
  `cv`, such as `cv.pages` for `PAGE_OVERFLOW`. Today these are `blocks.nobody` and `pages`,
  paths into the file.
- **`build` says `replace: 'always'`** (70). It replaces its `--out` file without `--replace`,
  as today. The line covers every file the command writes, and `build` writes one.
- **`init` writes one shared placeholder photo** (70). Today `init` writes `cvs/NAME.png` for
  every CV. Here it writes `placeholder.png` once, directly in the data folder
  (`~/.oriko/placeholder.png`), when it is missing, and the new CV names that file as its photo.
  So `init` replaces nothing, and a CV never names a photo that is not there. The file lies
  outside `cvs/`, so no name of a CV can meet it, `init --cv placeholder` included.
- **A second `photo set` needs `--replace`** (70). A photo is kept data. The first `photo set`
  for a CV writes `cvs/NAME.png` as a new file and points the CV at it, so it needs no
  `--replace`. A second one finds the file and needs it. A profile is the same: its first photo,
  `profiles/NAME.png`, is a new file.
- **`block move` keeps `page`** (71). It is an effect, and only a list has `--page` from adx.
- **Shapes** (72). `master`, `profile`, `block`, `item` and `contact` stand in `shapes` of the
  tool. Four of them share their word with a group: `oriko schema profile` prints the shape, and
  `oriko schema profile set` the command.
- **The start answer holds no data** (72). `home`, `cvs` and `profiles` are gone from it.
  `oriko cvs` and `oriko profiles` list them. The first steps stay, from `start`.
- **Hints across folders** (73). `NO_CV`, `UNKNOWN_CV` and `UNKNOWN_BLOCK` lie in `core/`, and
  their commands `init`, `cvs` and `show` lie in `cv/`. They stand in `cli/hints.ts`. `NO_CV`
  names `oriko init`, where it names `oriko schema init` today.
- **The hint for `UNKNOWN_BLOCK` takes the CV and the profile from the refused call** (79). Its
  step is `show.step().carry('cv', 'profile').lists('block')`, so a call with `--cv jane`
  answers `oriko show --cv jane --block`, the block ids of that CV, as today. `--block` of
  `show` has a source that reads them. `oriko plan --profile broken` answers
  `oriko show --profile broken --block`. A profile that is not stored yet, as in `profile set`
  with a new name, stays out of the command: the source of `--profile` in `show` does not list
  it.
- **Tests** (74). `tests/oriko.test.ts` runs whole calls with `run`, beside `conformance` for
  the tool and for the program. oriko's golden file over the real process stays.

From the five decisions that settle what did not fit:

- **Steps to `schema`** (77). `read` names `oriko schema profile` before `oriko profile set`
  after a posting, and `oriko schema init` after an old CV. `profiles` names
  `oriko schema profile` when no profile is stored. All three are as today, made with
  `schema.step(name)` in `cli/next.ts`.
- **A part by kind is checked with `check`** (78). The kind of a stored block picks the shape of
  an item, of the fields `block update` sets and of a patch in a profile. `edit/apply.ts` and
  `profile/set.ts` check such a part with `check`, and the issue has the code `SCHEMA`, as
  today. The shapes by kind, `PATCH`, `ITEM` and `ITEM_PATCH`, lie in `core/cv.schema.ts`. They
  stand in no `shapes`, so each check names the shape to show, with `{ as: Item }` or
  `{ as: Block }`, and the command of the issue is `oriko schema item` or `oriko schema block`,
  as today. Where the shape does not depend on stored data, the input uses the shape itself
  (`block`, the `value` of `item add` and of `contact add`), and adx answers `SCHEMA` with the
  shape's command.
- **One `after` for the 13 edits** (80). Each edit names `preview` and `build` when the CV still
  fits its pages, as today.
- **The same profile again writes nothing** (81). `profile set` with the stored profile answers
  `replaces: false` and `unchanged: true`, and needs no `--replace`. Today oriko refuses the
  call without `--replace`, and writes nothing with it.

From what adx gives every tool:

- **`oriko schema` is adx's command** (rule 2). oriko's own `cli/describe.ts` goes. The schema
  also lists every code with its kind and hint, and the roots.
- **One answer shape.** A success answers `{ ok, applied, result, next }`. oriko's `written`
  is `applied`, its `command` field is gone, and the fields of a command lie in `result`.
  `cvs` and `profiles` answer `{ items, total }` and take `--fields` and `--page`.
- **A write answers `{ file, bytes, replaces }`**, and `changes` on a replace (19, 40).
  `profile set` returns its own `changes`, the parts it adds, changes and removes, as today.
- **`ALREADY_EXISTS` replaces two codes** (10, 31). `PROFILE_EXISTS` and `POSTING_EXISTS` are
  gone. The command of the refusal is the same call with `--replace --dry-run`.
- **A value outside a list is `NOT_IN_LIST`** (rule 13). `--cv`, `--profile`, `--style` and the
  `--block` of `show` have a source, so adx refuses an unknown value before the handler runs.
  `UNKNOWN_STYLE` is gone. `UNKNOWN_CV`, `UNKNOWN_PROFILE` and `UNKNOWN_BLOCK` stay for the
  places adx cannot see: a name inside a profile or inside the JSON of an edit.
- **Input through stdin is `--json -`.** Today a command without `--json` reads stdin.
- **`photo set --file me.png`.** Today the picture is a word after the command. adx has
  command words first and options after, and no word after a command.
- **The data folder** (13, 35). `ORIKO_HOME` moves it too. A folder named by `--home` or the
  variable must exist, or the call is refused with `ROOT_NOT_FOUND`, kind `ask`. Today a missing
  folder answers `NO_CV`.
- **A missing folder of `--out` is created.** `FOLDER_NOT_FOUND` is gone.
- **A code has one hint.** Where oriko's hint names the field or the column, that part moves
  into the message.
- **Five codes get a name of their own**, because adx owns theirs: `NOTHING_TO_READ` and
  `PROFILE_NEEDED` in `read` (today `MISSING_INPUT` and `MISSING_OPTION`), `SOURCE_NOT_FOUND`
  in `read` and `NO_PICTURE` in `photo set` (today `FILE_NOT_FOUND`), `CONVERSION_FAILED` for
  LibreOffice (today `SYSTEM_REFUSED`). `photo set` without a file is adx's own refusal for a
  missing field.
- **No `try` block** (76). What goes through adx needs none. oriko's own code in
  `read/sources.ts` and `classic/images.ts` takes an error it expects with `$try` or `trySync$`:
  a missing file becomes an issue, any other error of the read is thrown on with `failed`, and
  a bug flies on to `main()`.

## Planned for later

- **A format number for the CV and the profile.** The move onto adx does not change the format
  of the two files, so both stay plain JSON, written with `files.write` and `files.update`, with
  no stored kind and no `"version"`. `stored` (adx decision 21) comes when the format of the CV
  or of the profile changes (oriko TODO #29).

## What does not fit yet

- **`read` reads what adx cannot** (adx TODO #6). A source is a file the person names, anywhere
  on the disk, or an https address the person names. adx reads a file only inside a root and
  talks only to a server the tool declares. So `read/sources.ts` stays oriko's own code: the
  file through `node:fs`, the download with its checks, and the text of a PDF, a Word file or an
  HTML page. What adx carries of `read` is in `read/documents.ts`: the input, the two checks,
  where the posting and the notes go, `--replace` for a stored posting, and the answer. Until
  adx can read such a source, the test kit cannot fake the download, and adx cannot promise that
  a dry run of `read` sends nothing. `read` migrates last.
- **`photo set` has the same gap.** The picture may lie anywhere on the disk, as today. adx
  reads a file only inside a root, so `--file` is a plain path, and `classic/images.ts` stays
  oriko's own code that reads and squares the picture, as `read/sources.ts` does for `read`. It
  stays so until adx TODO #6 settles "a file the person names". A candidate there is an
  allow-list of the folders the person opens.
- **A tool cannot raise a code adx owns.** oriko's own code for files and downloads answers
  `FILE_NOT_FOUND`, `NOT_A_FILE`, `INPUT_TOO_LARGE`, `URL_NOT_ALLOWED`, `NETWORK_FAILED` and
  `SERVER_BUSY`. `code()` declares a code of the tool, and adx exports none of its own. A missing
  file has a stand-in here, `SOURCE_NOT_FOUND` and `NO_PICTURE`. As long as `read` keeps its own
  code, the other five have no declaration (`read/issues.ts`).
- **A path cannot point into a stored file on its own.** It starts with a field of the call
  (69). That works where a field names the file, as `--profile` does. `cvs` and `profiles` have
  no field, so `NO_CV` is raised with `.issue()` and has no path, where it has `home` today.
- **Two files of the package lie in no root.** `init` copies `assets/placeholder.png`, and the
  classic look reads its icons from `assets/`. A root is a folder of the person. Reading the
  package's own files stays oriko's code.
- **LibreOffice runs outside adx.** `build` starts the program `soffice` for a PDF, in `plan`,
  so a dry run answers the bytes the real run writes, as today. adx neither runs nor sees it.
- **`show` has two answers.** Without `--block` it answers the outline, with it one block. adx
  would cut this into a list and a command for one item. It is kept as oriko has it, with one
  `output` whose fields are all optional.
- **`--cv` and `--profile` are no global input.** `init` takes a new name as `--cv`, and a
  global field with a source would refuse it. So each command declares the two itself, from
  `core/options.ts`, and each step names them.
