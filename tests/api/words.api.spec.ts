// The kit reads a command a tool names with wordsOf, and a refused line is "no plain call of one
// program" in conformance. No public call hands the kit a line by itself, so this test opens
// wordsOf in dist/, and lineOf, with which adx writes the command of a step.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineOf, optionWords } from '../../dist/steps/line.js';
import { wordsOf } from '../../dist/core/words.js';

test('a line that runs more or other than one call of a program is no plain call', () => {
  const lines = [
    'hello x | cat',
    'hello x; hello y',
    'hello x && hello y',
    'hello x &',
    'hello x > out',
    'hello *',
    'hello a?',
    'hello $(date)',
    'hello `date`',
    'hello $HOME',
    'hello "$HOME"',
    "hello $'a'",
    'hello {a,b}',
    'hello ~/x',
    // bash expands a ~ after = and :, so no word holds one outside quotes
    'hello a=~',
    'hello --x=~',
    'hello x:~',
    'hello a=b:~',
    'hello a#b~c',
    // only the signs adx writes bare stand outside quotes, anywhere in a word: zsh with
    // extendedglob expands x#y
    'hello greet x#y',
    'hello a^b',
    'hello a!b',
    'hello a]b',
    // zsh expands a leading = to the path of a program, and ^ under extendedglob negates a glob
    'hello =ls',
    '=hello x',
    'hello ^x',
    'X=1 hello',
    '! hello',
    'time hello',
    'if true; then hello; fi',
    'hello "open',
    '',
    '   ',
  ];
  for (const line of lines) assert.equal(wordsOf(line), undefined, JSON.stringify(line));
});

test('anything before or after the command, a comment or a blank line among it, is no plain call', () => {
  const lines = ['hello x # c', '# c\nhello x', '\nhello x', 'hello x\n', 'hello x\n# c'];
  for (const line of lines) assert.equal(wordsOf(line), undefined, JSON.stringify(line));
});

test('a line whose words differ between shells is no plain call', () => {
  // a backslash at the end: dash and bash 5 keep it, bash 3.2 and zsh drop it
  const lines = [
    'hello x\\',
    'hello x\\\\\\',
    'hello x a\rb',
    'hello x\r',
    'hello \x01',
    'hello\x7f',
  ];
  for (const line of lines) assert.equal(wordsOf(line), undefined, JSON.stringify(line));
});

test('a plain call is split as sh splits it', () => {
  assert.deepEqual(wordsOf("  hello greet --name 'Ada O'\\''Hara'  "), [
    'hello',
    'greet',
    '--name',
    "Ada O'Hara",
  ]);
  assert.deepEqual(wordsOf("hello \"C:\\path\\x\" C:\\\\p 'a#b' --name='~c' x\\\\ \\~d"), [
    'hello',
    'C:\\path\\x',
    'C:\\p',
    'a#b',
    '--name=~c',
    'x\\',
    '~d',
  ]);
  assert.deepEqual(wordsOf('hello ex\\\nact\t"a\rb"'), ['hello', 'exact', 'a\rb']);
});

test('every line adx writes for a step reads back as its words', () => {
  const values = ["Ada O'Hara", 'a b', '', 'a\rb', 'a\nb', '\x01', '*', '~x', '#x', '{a,b}'];
  const more = ['$x', '`x`', '=x', '!x', 'C:\\p', 'ü', 'a|b', '--opt=-x'];
  for (const value of [...values, ...more]) {
    const words = ['hello', 'greet', ...optionWords('name', value)];
    assert.deepEqual(wordsOf(lineOf(words)), words, JSON.stringify(value));
  }
  assert.deepEqual(optionWords('name', '-x'), ['--name=-x']);
});
