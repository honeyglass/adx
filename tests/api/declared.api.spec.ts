import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { z } from 'zod';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const Manifest = z.object({
  exports: z.record(z.string(), z.union([z.string(), z.object({ types: z.string() })])),
});

// Each name a declaration file exports by its own word; a .d.ts exports every other top-level
// name too, such as a brand, yet those are no part of the API.
function declaredNames(file: string) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const names = source.statements.flatMap(statement => {
    const exported = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      : false;
    if (exported !== true) return [];
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.map(d => d.name.getText(source));
    }
    if (isNamed(statement)) return statement.name === undefined ? [] : [statement.name.text];
    // a kind of export this test does not read fails the comparison by its name
    return [`an export of the kind ${ts.SyntaxKind[statement.kind]}`];
  });
  return [...new Set(names)].sort();
}

const isNamed = (
  statement: ts.Statement,
): statement is
  | ts.ClassDeclaration
  | ts.FunctionDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration =>
  ts.isClassDeclaration(statement) ||
  ts.isFunctionDeclaration(statement) ||
  ts.isInterfaceDeclaration(statement) ||
  ts.isTypeAliasDeclaration(statement);

// Each name, type or value, that an entry of the package exports, as a tool's compiler sees it.
function packageNames(entries: readonly string[]) {
  const options = { module: ts.ModuleKind.NodeNext, strict: true, skipLibCheck: true };
  const program = ts.createProgram(entries, options);
  const checker = program.getTypeChecker();
  return entries.map(entry => {
    const source = program.getSourceFile(entry);
    const module = source === undefined ? undefined : checker.getSymbolAtLocation(source);
    const names = module === undefined ? [] : checker.getExportsOfModule(module);
    return names.map(symbol => symbol.name).sort();
  });
}

const typesOf = (manifest: z.output<typeof Manifest>, entry: string) => {
  const target = manifest.exports[entry];
  return join(ROOT, typeof target === 'string' ? target : (target?.types ?? ''));
};

test('the package exports every name proto/adx declares, and no other', () => {
  const manifest = Manifest.parse(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')));
  const [main, kit] = packageNames([typesOf(manifest, '.'), typesOf(manifest, './test')]);
  assert.deepEqual(main, declaredNames(join(ROOT, 'proto/adx/index.d.ts')));
  assert.deepEqual(kit, declaredNames(join(ROOT, 'proto/adx/test.d.ts')));
});

const CHECK = join(ROOT, 'tests/api/declared.check.ts');
const INDEX = join(ROOT, 'proto/adx/index.d.ts');

/**
 * The branded values of the build and its branded types against their declarations, both ways.
 * It compiles in memory only, since it fits only where the brands are the declared ones.
 */
const CHECKED = `
import type * as Built from '@honeyglass/adx';
import type * as Declared from '../../proto/adx/index.d.ts';
import type { ByUse, Nothing, Sample, StepInput, Unfit, UnfitTypes } from './declared.api.types.ts';
type Out = { id: string };
export type Branded = [
  Nothing<Unfit<Pick<typeof Built, ByUse>, typeof Declared>>,
  Nothing<UnfitTypes<[
    [Built.After<Sample>, Declared.After<Sample>],
    [Built.Command<Sample, Out, Sample, {}, Out, 'project'>, Declared.Command<Sample, Out, Sample, {}, Out, 'project'>],
    [Built.Commands<Sample>, Declared.Commands<Sample>],
    [Built.EffectSpec<Sample, Sample, Out, Out>, Declared.EffectSpec<Sample, Sample, Out, Out>],
    [Built.Entry<Sample>, Declared.Entry<Sample>],
    [Built.Fresh<StepInput>, Declared.Fresh<StepInput>],
    [Built.Global<Sample>, Declared.Global<Sample>],
    [Built.Hint, Declared.Hint],
    [Built.Kinds<Sample>, Declared.Kinds<Sample>],
    [Built.ListCommand<Sample, Sample, Sample, {}, 'project'>, Declared.ListCommand<Sample, Sample, Sample, {}, 'project'>],
    [Built.ListRef, Declared.ListRef],
    [Built.ListSpec<Sample, Sample, Sample>, Declared.ListSpec<Sample, Sample, Sample>],
    [Built.Needs<'cv'>, Declared.Needs<'cv'>],
    [Built.ReadSpec<Sample, Sample, Out>, Declared.ReadSpec<Sample, Sample, Out>],
    [Built.Source<StepInput>, Declared.Source<StepInput>],
    [Built.ToolSpec<Sample>, Declared.ToolSpec<Sample>],
    [Built.Values<Sample, Sample>, Declared.Values<Sample, Sample>],
  ]>>,
];
`;

// A brand of the build, such as `declare const builtFor: unique symbol`, becomes the brand of the
// same name in index.d.ts, so a branded value can fit its declaration.
const BRAND = /^(export )?declare const (\w+): unique symbol;$/gm;
const declaredBrands = (text: string) =>
  text.replace(BRAND, (_, exported: string | undefined, name: string) =>
    [
      `import { ${name} } from ${JSON.stringify(INDEX.replace(/\.d\.ts$/, '.js'))};`,
      ...(exported === undefined ? [] : [`export { ${name} };`]),
    ].join(' '),
  );

const DIST = join(ROOT, 'dist');

// What the program in memory reads: the check, dist/ with the declared brands, else the disk.
function textOf(file: string) {
  if (file === CHECK) return CHECKED;
  const text = ts.sys.readFile(file);
  return text !== undefined && file.startsWith(DIST) ? declaredBrands(text) : text;
}

function brandedDiagnostics() {
  const config = ts.getParsedCommandLineOfConfigFile(
    join(ROOT, 'tests/tsconfig.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  );
  const options = config?.options ?? {};
  const host = ts.createCompilerHost(options);
  host.fileExists = file => file === CHECK || ts.sys.fileExists(file);
  host.readFile = textOf;
  host.getSourceFile = (file, version) => {
    const text = textOf(file);
    return text === undefined ? undefined : ts.createSourceFile(file, text, version);
  };
  const program = ts.createProgram([CHECK], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

test('every branded value and type of the build fits its declaration, both ways', () => {
  assert.deepEqual(brandedDiagnostics(), []);
});
