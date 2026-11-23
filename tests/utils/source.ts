/**
 * What the layout test reads of a source tree, through the TypeScript compiler.
 *
 * Import, Source, sourceOf: the folders with code, each import with the folder it stands in and
 * the folder it reaches, and what the compiler could not read.
 * NodeName, nodeNamesOf: each name outside node/ that only Node declares, such as process.
 *
 * The files are the ones the tree's tsconfig.json compiles, whatever their extension. A package
 * specifier is resolved as the compiler resolves it, so a self-reference, such as
 * '@honeyglass/adx/node', reaches dist/, outside the tree. An import() whose path is no literal
 * has no spec, since nothing can tell where it leads.
 *
 * @example const { folders, imports } = sourceOf(join(ROOT, 'src'));
 */
import { isBuiltin } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

/**
 * One import of one file. `from` is the top-level folder of the file, '' for a file at the root.
 * `to` is the top-level folder the import reaches, '' for a root file, '..' outside the tree,
 * and null for a library or a module of Node. `spec` is null for an import() of no literal.
 */
export type Import = { file: string; from: string; spec: string | null; to: string | null };

export type Source = { folders: string[]; imports: Import[]; issues: string[] };

/** A name that only @types/node declares, used in a file outside node/. */
export type NodeName = { file: string; name: string };

/**
 * @param root - the folder with a tsconfig.json, such as src/
 * @returns the top-level folders with a compiled file, '' for the root, every import, and the
 * diagnostics of the tsconfig.json
 */
export function sourceOf(root: string): Source {
  const config = configOf(root);
  const files = config.fileNames.map(path => fileOf(root, path));
  const folders = [...new Set(files.map(folderOf))].sort();
  const imports = files.flatMap(file => importsOf(root, file, config.options));
  return { folders, imports, issues: config.errors.map(messageOf) };
}

/**
 * @param root - the folder with a tsconfig.json, such as src/
 * @param adapter - the folder that may use Node, such as node
 * @returns each file outside the adapter and each name in it whose every declaration is Node's
 */
export function nodeNamesOf(root: string, adapter: string): NodeName[] {
  const config = configOf(root);
  const program = ts.createProgram(config.fileNames, config.options);
  const checker = program.getTypeChecker();
  return config.fileNames
    .filter(path => folderOf(fileOf(root, path)) !== adapter)
    .flatMap(path => namesOf(program.getSourceFile(path), checker))
    .filter(found => onlyNode(found.symbol))
    .map(found => ({ file: fileOf(root, found.path), name: found.name }))
    .filter((found, i, all) => all.findIndex(other => same(other, found)) === i);
}

function configOf(root: string) {
  const path = join(root, 'tsconfig.json');
  const read = ts.readConfigFile(path, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, ts.sys, root, undefined, path);
  return read.error === undefined ? parsed : { ...parsed, errors: [read.error, ...parsed.errors] };
}

const messageOf = (diagnostic: ts.Diagnostic) =>
  ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

// A path from the root with /, as the answers show it.
const fileOf = (root: string, path: string) => relative(root, path).split(sep).join('/');

const folderOf = (file: string) => (file.includes('/') ? (file.split('/')[0] ?? '') : '');

const same = (a: NodeName, b: NodeName) => a.file === b.file && a.name === b.name;

function importsOf(root: string, file: string, options: ts.CompilerOptions): Import[] {
  const path = join(root, file);
  const text = ts.sys.readFile(path) ?? '';
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest);
  const specs: (string | null)[] = [];
  collect(source, specs);
  return specs.map(spec => ({
    file,
    from: folderOf(file),
    spec,
    to: spec === null ? null : targetOf(root, path, spec, options),
  }));
}

// The first part of the target from the root: a folder, '' for a root file, or '..'.
function targetOf(root: string, path: string, spec: string, options: ts.CompilerOptions) {
  const target = spec.startsWith('.')
    ? resolve(path, '..', spec)
    : packageTarget(path, spec, options);
  if (target === null) return null;
  const parts = relative(root, target).split(sep);
  return parts.length === 1 ? '' : (parts[0] ?? '');
}

// The file a package specifier reaches, or null for a library, a module of Node or no file.
function packageTarget(path: string, spec: string, options: ts.CompilerOptions) {
  if (isBuiltin(spec)) return null;
  const resolved = ts.resolveModuleName(spec, path, options, ts.sys).resolvedModule;
  if (resolved === undefined || resolved.isExternalLibraryImport === true) return null;
  return resolved.resolvedFileName;
}

/**
 * Walks the syntax tree for every path a file loads code from.
 *
 * Covers import and export declarations, import() calls and import('…').Type references.
 *
 * @param node - the node to search, the whole file at first
 * @param specs - collects each path as written, and null for an import() no tool can follow
 */
function collect(node: ts.Node, specs: (string | null)[]) {
  const spec = specOf(node);
  if (spec !== undefined) specs.push(spec);
  ts.forEachChild(node, child => collect(child, specs));
}

// A path as written, null for an import() no tool can follow, undefined for any other node.
function specOf(node: ts.Node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    const spec = node.moduleSpecifier;
    return spec !== undefined && ts.isStringLiteral(spec) ? spec.text : undefined;
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    const literal = node.argument.literal;
    return ts.isStringLiteral(literal) ? literal.text : undefined;
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [first] = node.arguments;
    return first !== undefined && ts.isStringLiteralLike(first) ? first.text : null;
  }
  return undefined;
}

type Named = { path: string; name: string; symbol: ts.Symbol | undefined };

// Every identifier of a file with the symbol the checker binds it to.
function namesOf(source: ts.SourceFile | undefined, checker: ts.TypeChecker): Named[] {
  if (source === undefined) return [];
  const found: Named[] = [];
  visit(source, node => {
    if (ts.isIdentifier(node) === false) return;
    found.push({
      path: source.fileName,
      name: node.text,
      symbol: checker.getSymbolAtLocation(node),
    });
  });
  return found;
}

function visit(node: ts.Node, each: (node: ts.Node) => void) {
  each(node);
  ts.forEachChild(node, child => visit(child, each));
}

// A name exists only on Node when @types/node declares it, and neither TypeScript's lib nor the tree.
function onlyNode(symbol: ts.Symbol | undefined) {
  const files = (symbol?.declarations ?? []).map(d => d.getSourceFile().fileName);
  if (files.length === 0) return false;
  return files.every(file => file.includes('/node_modules/@types/node/'));
}
