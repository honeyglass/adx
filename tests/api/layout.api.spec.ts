import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { nodeNamesOf, sourceOf } from '../utils/source.ts';
import type { Import, Source } from '../utils/source.ts';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const TYPE_ROOTS = fileURLToPath(new URL('../../node_modules/@types', import.meta.url));

/** The folders that put features together; every other folder of src/ but core/ is a feature. */
const SHELL = new Set(['tool', 'test']);

/** The adapter: the one folder that may import a module of Node or use a name only Node has. */
const ADAPTER = 'node';

// Each import of one folder that reaches a folder outside the allowed ones, itself among them.
function crossings(imports: Import[], folder: string, allowed: Set<string>) {
  return imports
    .filter(i => i.from === folder)
    .filter(i => i.to !== null && allowed.has(i.to) === false)
    .map(i => `${i.file} imports ${i.spec}`);
}

// Every folder with code that is neither core/, the shell, nor the root files.
function features(source: Source) {
  return source.folders
    .filter(name => SHELL.has(name) === false)
    .filter(name => name !== 'core' && name !== '');
}

function featureCrossings(source: Source) {
  return features(source).flatMap(name => crossings(source.imports, name, new Set(['core', name])));
}

// Each import of a module of Node, such as node:fs or fs, from outside the adapter.
function platformImports(imports: Import[]) {
  return imports
    .filter(i => i.from !== ADAPTER)
    .filter(i => i.spec !== null && isBuiltin(i.spec))
    .map(i => `${i.file} imports ${i.spec}`);
}

// A package in a temporary folder, made from a map of paths to file contents.
function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'adx-layout-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

// A package named like adx, with a src/ that breaks every rule once.
const BROKEN = {
  'package.json': JSON.stringify({
    name: '@honeyglass/adx',
    type: 'module',
    exports: { './node': { types: './dist/node/index.d.ts' } },
  }),
  'dist/node/index.d.ts': 'export {};\n',
  'src/tsconfig.json': JSON.stringify({
    compilerOptions: { module: 'nodenext', noEmit: true, types: ['node'], typeRoots: [TYPE_ROOTS] },
    include: ['.'],
  }),
  'src/index.ts': "export * from './command/read.ts';\n",
  'src/core/answer.ts': "import { read } from '../command/read.ts';\n",
  'src/core/self.ts': "import '@honeyglass/adx/node';\n",
  'src/core/env.ts': 'export const home = process.env.HOME;\nexport const max = Math.max(1, 2);\n',
  'src/core/fs.ts': "export const fs = process.getBuiltinModule('node:fs');\n",
  'src/command/read.ts': "import { Step } from '../steps/step.ts';\nimport '../core/answer.ts';\n",
  'src/command/list.mts': "import { Step } from '../steps/step.ts';\n",
  'src/command/notes.js': "import '../steps/step.ts';\n",
  'src/brand-new/a.ts': "import { readFile } from 'node:fs/promises';\nimport 'path';\n",
  'src/node/fs.ts':
    "import { readFile } from 'node:fs/promises';\nexport const cwd = process.cwd();\n",
  'src/tool/tool.ts': "import { read } from '../command/read.ts';\nimport '../node/fs.ts';\n",
  'src/steps/step.ts': "type T = import('../values/source.ts').T;\nawait import(name);\n",
};

const source = sourceOf(SRC);

test('reads src/tsconfig.json and every import of src/', () => {
  assert.deepEqual(source.issues, []);
  const unreadable = source.imports.filter(i => i.spec === null).map(i => i.file);
  assert.deepEqual(unreadable, []);
});

test('a feature imports only core/ and itself', () => {
  assert.deepEqual(featureCrossings(source), []);
});

test('core/ imports only core/', () => {
  assert.deepEqual(crossings(source.imports, 'core', new Set(['core'])), []);
});

test('only node/ imports a module of Node', () => {
  assert.deepEqual(platformImports(source.imports), []);
});

test('only node/ uses a name that only Node has', () => {
  assert.deepEqual(nodeNamesOf(SRC, ADAPTER), []);
});

test('names each import and Node name that crosses a boundary', () => {
  const root = tree(BROKEN);
  const src = join(root, 'src');
  const found = sourceOf(src);
  const names = nodeNamesOf(src, ADAPTER);
  rmSync(root, { recursive: true });
  // a new folder counts as a feature, and a .mts file is read while a .js file is not compiled
  assert.deepEqual(features(found), ['brand-new', 'command', 'node', 'steps']);
  assert.deepEqual(featureCrossings(found), [
    'command/list.mts imports ../steps/step.ts',
    'command/read.ts imports ../steps/step.ts',
    'steps/step.ts imports ../values/source.ts',
  ]);
  assert.deepEqual(crossings(found.imports, 'core', new Set(['core'])), [
    'core/answer.ts imports ../command/read.ts',
    'core/self.ts imports @honeyglass/adx/node',
  ]);
  assert.deepEqual(platformImports(found.imports), [
    'brand-new/a.ts imports node:fs/promises',
    'brand-new/a.ts imports path',
  ]);
  assert.deepEqual(
    found.imports.filter(i => i.spec === null).map(i => i.file),
    ['steps/step.ts'],
  );
  assert.deepEqual(
    names.map(n => `${n.file} uses ${n.name}`),
    [
      'core/env.ts uses process',
      'core/env.ts uses env',
      'core/fs.ts uses process',
      'core/fs.ts uses getBuiltinModule',
    ],
  );
});

test('names a tsconfig.json it cannot read', () => {
  const root = tree({ 'src/index.ts': 'export {};\n' });
  const found = sourceOf(join(root, 'src'));
  rmSync(root, { recursive: true });
  assert.equal(found.issues.length, 1);
  assert.match(found.issues[0] ?? '', /^Cannot read file '.*tsconfig\.json'/);
});
