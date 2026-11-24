/**
 * The built package's public types against the declared API, checked by `pnpm run typecheck`.
 *
 * Checked: each check, and the name it leaves in the error when it fails.
 * Denied: the same checks on samples that must fail, so the guard is seen to deny.
 *
 * The package comes in by its name, so its exports and dist/ are what is checked. Every value
 * the package exports is checked against proto/adx/index.d.ts and test.d.ts without a line
 * here. A value fits when it is assignable to its declaration and is not any. A value not
 * built yet stands in NotBuilt, and the change that builds it takes it out. Types have no list
 * of their names: each built type gets a pair in TypePairs, and fits only when both are the
 * same type. The typecheck reads dist/*.d.ts with skipLibCheck off, so a broken one fails too.
 *
 * @example type Kind = [Built.Kind, Declared.Kind]; // a pair in TypePairs, once Kind is built
 */
import type { z } from 'zod';
import type * as Built from '@honeyglass/adx';
import type * as BuiltTest from '@honeyglass/adx/test';
import type * as Declared from '../../proto/adx/index.d.ts';
import type * as DeclaredTest from '../../proto/adx/test.d.ts';

/** Compiles only for never, and names what is left in the error otherwise. */
type Nothing<T extends never> = T;

/** True for any, which fits every declaration and so would hide a broken type. */
type IsAny<T> = 0 extends 1 & T ? true : false;
/** Each name whose built value is any or not assignable to its declaration. */
type Unfit<B, D> = {
  [K in keyof B & keyof D]: IsAny<B[K]> extends true ? K : [B[K]] extends [D[K]] ? never : K;
}[keyof B & keyof D];
type Undeclared<B, D> = Exclude<keyof B, keyof D>;
type Missing<B, D> = Exclude<keyof D, keyof B>;

/** The declared values the package does not export yet; never once all are built. */
type NotBuilt =
  | 'bearer'
  | 'check'
  | 'cwd'
  | 'detailOf'
  | 'dir'
  | 'envDir'
  | 'envUrl'
  | 'fresh'
  | 'id'
  | 'inFile'
  | 'keyOf'
  | 'marker'
  | 'multiline'
  | 'needs'
  | 'outFile'
  | 'paged'
  | 'remote'
  | 'root'
  | 'stored';
/**
 * The brands of index.d.ts. A .d.ts exports each top-level name, so its brands count as values,
 * yet they exist on the type level only and the package exports none of them.
 */
type Brands =
  'builtFor' | 'follows' | 'freshBrand' | 'helps' | 'needsBrand' | 'realRun' | 'refBrand';
type NotBuiltTest = 'conformance' | 'fake' | 'reply';

/**
 * The built values whose declared type carries a brand of index.d.ts, such as the `builtFor` of
 * a Command. A brand is a `unique symbol`, one type per declaration, so no built value fits a
 * branded declaration. tests/tsconfig.json checks them by use instead: it compiles the files of
 * proto/ that a package made work against dist/, and each package adds the files it made work.
 */
type ByUse = 'after' | 'effect' | 'global' | 'hint' | 'list' | 'read' | 'tool';

/** A schema with two fields, for the types that take one. */
type Sample = z.ZodObject<{ project: z.ZodString; team: z.ZodOptional<z.ZodString> }>;
/** The input of a step with two fields, one of which has a source. */
type StepInput = { cv: string; block: string };

/** One pair per built type, the built one first, such as [Built.Kind, Declared.Kind]. */
type TypePairs = [
  [Built.Answer<unknown>, Declared.Answer<unknown>],
  [Built.Code, Declared.Code],
  [Built.CommandStep<StepInput, 'block'>, Declared.CommandStep<StepInput, 'block'>],
  [Built.Field<Sample>, Declared.Field<Sample>],
  [Built.GlobalUse<Sample>, Declared.GlobalUse<Sample>],
  [Built.Issue, Declared.Issue],
  [Built.Kind, Declared.Kind],
  [Built.Refused, Declared.Refused],
  [Built.Step, Declared.Step],
  [Built.Tool, Declared.Tool],
  [BuiltTest.Checked, DeclaredTest.Checked],
  [BuiltTest.Ran, DeclaredTest.Ran],
];
/** Each index whose built type is any or differs from its declaration in either direction. */
type UnfitTypes<P> = {
  [I in keyof P]: P[I] extends [infer B, infer D] ? (Same<B, D> extends true ? never : I) : I;
}[keyof P & number];
type Same<B, D> =
  IsAny<B> extends true ? false : [B] extends [D] ? ([D] extends [B] ? true : false) : false;

export type Checked = [
  Nothing<Unfit<Omit<typeof Built, ByUse>, typeof Declared>>,
  Nothing<Exclude<ByUse, keyof typeof Built>>,
  Nothing<Undeclared<typeof Built, typeof Declared>>,
  Nothing<Exclude<Missing<typeof Built, typeof Declared>, NotBuilt | Brands>>,
  Nothing<Exclude<NotBuilt, Missing<typeof Built, typeof Declared>>>,
  Nothing<Unfit<typeof BuiltTest, typeof DeclaredTest>>,
  Nothing<Undeclared<typeof BuiltTest, typeof DeclaredTest>>,
  Nothing<Exclude<Missing<typeof BuiltTest, typeof DeclaredTest>, NotBuiltTest>>,
  Nothing<Exclude<NotBuiltTest, Missing<typeof BuiltTest, typeof DeclaredTest>>>,
  Nothing<UnfitTypes<TypePairs>>,
];

/** any, as JSON.parse answers it, for the samples below. */
type Untyped = ReturnType<typeof JSON.parse>;

// A value of another type, a name nobody declared, a stale list and a type that differs.
export type Denied = [
  // @ts-expect-error tool answers a number where its declaration answers a string
  Nothing<Unfit<{ tool: () => number }, { tool: () => string }>>,
  // @ts-expect-error tool is any, as a type that does not resolve becomes
  Nothing<Unfit<{ tool: Untyped }, { tool: () => string }>>,
  // @ts-expect-error extra is no declared name
  Nothing<Undeclared<{ extra: 1 }, {}>>,
  // @ts-expect-error tool is built, yet still listed as not built
  Nothing<Exclude<'tool', Missing<{ tool: 1 }, { tool: 1 }>>>,
  // @ts-expect-error the built Kind has a kind its declaration lacks
  Nothing<UnfitTypes<[['fix' | 'ask' | 'blocked', 'fix' | 'ask']]>>,
  // @ts-expect-error the built Kind lacks a kind of its declaration
  Nothing<UnfitTypes<[['fix', 'fix' | 'ask']]>>,
  // @ts-expect-error the built input needs one more field than its declaration
  Nothing<UnfitTypes<[[{ name: string; lang: string }, { name: string }]]>>,
  // @ts-expect-error the built type is any
  Nothing<UnfitTypes<[[Untyped, { name: string }]]>>,
];
