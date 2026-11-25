/**
 * The built package's public types against the declared API, checked by `pnpm run typecheck`.
 *
 * Checked: each check, and the name it leaves in the error when it fails.
 * Denied: the same checks on samples that must fail, so the guard is seen to deny.
 *
 * The package comes in by its name, so its exports and dist/ are what is checked. Every value
 * the package exports is checked against proto/adx/index.d.ts and test.d.ts without a line
 * here. A value fits when it and its declaration are the same type, any inside included; one
 * of ByAssignment fits when the two are assignable to each other and it is not any. A value not
 * built yet stands in NotBuilt, and the change that builds it takes it out.
 * Types have no list of their names: each built type gets a pair in TypePairs, and fits only
 * when both are the same type. A value or type that carries a brand is checked the same way in
 * declared.api.spec.ts, which reads the build's brands as the declared ones. The typecheck reads
 * dist/*.d.ts with skipLibCheck off, so a broken one fails too.
 *
 * @example type Kind = [Built.Kind, Declared.Kind]; // a pair in TypePairs, once Kind is built
 */
import type { z } from 'zod';
import type * as Built from '@honeyglass/adx';
import type * as BuiltTest from '@honeyglass/adx/test';
import type * as Declared from '../../proto/adx/index.d.ts';
import type * as DeclaredTest from '../../proto/adx/test.d.ts';

/** Compiles only for never, and names what is left in the error otherwise. */
export type Nothing<T extends never> = T;

/** True for any, which fits every declaration and so would hide a broken type. */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * The values compared by assignability both ways, since no identity can hold. The compiler never
 * finds two declarations of a conditional type with `infer` the same, and after's types are such.
 * A declared class has no constructor of its own, while adx's Issue and Refused take their parts;
 * their instances are pairs in TypePairs.
 */
export type ByAssignment = 'after' | 'Issue' | 'Refused';

/** Each name whose built value differs from its declaration, or is any. */
export type Unfit<B, D> = {
  [K in keyof B & keyof D]: (
    K extends ByAssignment ? Assignable<B[K], D[K]> : Same<B[K], D[K]>
  ) extends true
    ? never
    : K;
}[keyof B & keyof D];
type Assignable<B, D> =
  IsAny<B> extends true ? false : [B] extends [D] ? ([D] extends [B] ? true : false) : false;
type Undeclared<B, D> = Exclude<keyof B, keyof D>;
type Missing<B, D> = Exclude<keyof D, keyof B>;

/** The declared values the package does not export yet; never once all are built. */
type NotBuilt = never;
/**
 * The brands of index.d.ts. A .d.ts exports each top-level name, so its brands count as values,
 * yet they exist on the type level only and the package exports none of them.
 */
type Brands =
  'builtFor' | 'follows' | 'freshBrand' | 'helps' | 'needsBrand' | 'realRun' | 'refBrand';
type NotBuiltTest = never;

/**
 * The built values whose declared type carries a brand of index.d.ts, such as the `builtFor` of
 * a Command. A brand is a `unique symbol`, one type per declaration, so no built value fits a
 * branded declaration here. declared.api.spec.ts checks them both ways, with the build's brands
 * read as the declared ones; tests/tsconfig.json also compiles every file of proto/ against dist/.
 */
export type ByUse =
  | 'after'
  | 'detailOf'
  | 'effect'
  | 'fresh'
  | 'global'
  | 'hint'
  | 'keyOf'
  | 'list'
  | 'needs'
  | 'read'
  | 'tool';

/** A schema with two fields, for the types that take one. */
export type Sample = z.ZodObject<{ project: z.ZodString; team: z.ZodOptional<z.ZodString> }>;
/** The input of a step with two fields, one of which has a source. */
export type StepInput = { cv: string; block: string };

/** One pair per built type, the built one first, such as [Built.Kind, Declared.Kind]. */
type TypePairs = [
  [Built.Act, Declared.Act],
  [Built.Answer<unknown>, Declared.Answer<unknown>],
  [Built.Auth, Declared.Auth],
  [Built.Changes, Declared.Changes],
  [Built.Choice, Declared.Choice],
  [Built.Code, Declared.Code],
  [Built.CommandStep<StepInput, 'block'>, Declared.CommandStep<StepInput, 'block'>],
  [Built.Dir, Declared.Dir],
  [Built.Fake, Declared.Fake],
  [Built.Field<Sample>, Declared.Field<Sample>],
  [Built.File, Declared.File],
  [Built.Files, Declared.Files],
  [Built.GlobalUse<Sample>, Declared.GlobalUse<Sample>],
  [Built.InvokeOptions, Declared.InvokeOptions],
  [Built.Issue, Declared.Issue],
  [Built.Kind, Declared.Kind],
  [Built.Listing<unknown>, Declared.Listing<unknown>],
  [Built.Page, Declared.Page],
  [Built.Refused, Declared.Refused],
  [Built.Remote, Declared.Remote],
  [Built.Request, Declared.Request],
  [Built.Root, Declared.Root],
  [Built.RootSource, Declared.RootSource],
  [Built.Step, Declared.Step],
  [Built.Stored<Sample['shape'], StepInput>, Declared.Stored<Sample['shape'], StepInput>],
  [Built.Tool, Declared.Tool],
  [Built.Written, Declared.Written],
  [BuiltTest.Checked, DeclaredTest.Checked],
  [BuiltTest.Ran, DeclaredTest.Ran],
  [BuiltTest.Reply, DeclaredTest.Reply],
  [BuiltTest.RunOptions, DeclaredTest.RunOptions],
  [BuiltTest.Samples, DeclaredTest.Samples],
];
/** Each index whose built type is any or differs from its declaration in either direction. */
export type UnfitTypes<P> = {
  [I in keyof P]: P[I] extends [infer B, infer D] ? (Same<B, D> extends true ? never : I) : I;
}[keyof P & number];
/**
 * True only when both are the same type, by the compiler's identity check: unlike assignability,
 * it tells any from every other type at any depth, such as a member that turned any.
 */
type Same<B, D> =
  (<P>() => P extends B ? 1 : 2) extends <P>() => P extends D ? 1 : 2
    ? (<P>() => P extends D ? 1 : 2) extends <P>() => P extends B ? 1 : 2
      ? true
      : false
    : false;

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
