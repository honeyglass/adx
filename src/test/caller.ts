/**
 * How conformance calls a tool in the process of the test, the same way for every probe.
 *
 * Asked, Called, Session, Caller: one call a probe asks for, what it left, the scratch folder
 * that calls share, and what makes such folders.
 * Context: what conformance uses of the test it runs in.
 * toolCaller: the caller of a tool that tool() made.
 * changedIn: each path two snapshots of a folder hold differently.
 *
 * Each session is a fresh scratch folder with the seed copied in, and each call in it goes
 * through the same call as main(), so what a probe sees is what the program answers. A session
 * notes what each call changed in its scratch folder and at the top of the test's working
 * directory, where a handler that writes around adx lands, and which requests reached the fakes.
 * What a handler writes with console stands before the answer, as in the program.
 *
 * @example const caller = toolCaller(tracker, samples);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import type { Surroundings } from '../core/index.ts';
import { captured, snapshot, testFolder, tokensOf } from '../node/index.ts';
import { heard } from '../remote/index.ts';
import { call, inScratch, specOf } from '../tool/index.ts';
import type { Shell } from '../tool/index.ts';
import type { Checked, Samples } from './run.ts';

/** `command` names the command the probe calls, by its words, for the checks of its kind. */
export type Asked = { argv: readonly string[]; stdin?: string; command?: string };

export type Called = Asked & {
  exit: number | null;
  out: string;
  err: string;
  /** Each path of the scratch folder the call made, changed or removed. */
  changed: string[];
  /** Each request a fake answered, such as `POST /tickets`. */
  sent: string[];
};

export interface Session {
  call(asked: Asked): Promise<Called>;
}

/**
 * What conformance uses of the TestContext of node:test: a subtest per probe, a cleanup when the
 * test ends, and a todo for a probe that cannot run yet.
 */
export interface Context {
  test(name: string, run: (t: Context) => Promise<void>): Promise<unknown>;
  after(run: () => void): void;
  todo(message: string): void;
}

export interface Caller {
  /** Runs the work in a fresh scratch folder with the seed copied in. */
  session<T>(work: (session: Session) => Promise<T>): Promise<T>;
  /** Which folders a call's `changed` covers, for a finding about what it changed. */
  readonly watched: string;
}

/**
 * @param tool - the value tool() returned
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a fix RefusalError for a tool that tool() did not make
 */
export function toolCaller(tool: Checked, samples: Samples): Caller {
  const shell = specOf(tool);
  if (shell === undefined) {
    throw new RefusalError({
      kind: 'fix',
      step: 'conformance',
      reason: 'the tool was not made by tool() of this adx',
      next: 'pass the value that tool() returned',
    });
  }
  const sent: string[] = [];
  const fakes = (samples.fakes ?? []).map(made => heard(made, route => sent.push(route)));
  const scene = { ...samples, fakes };
  return {
    session: work => inScratch(shell, scene, around => work(sessionIn(shell, around, sent))),
    watched:
      'in the process the kit watches the scratch folder and the top of the working directory of the test, not the temp folder; conformance with the command line watches every folder the program gets',
  };
}

// The requests of one call are those the fakes heard while it ran: calls of a session run one
// after another.
function sessionIn(shell: Shell, around: Surroundings, sent: string[]): Session {
  const folder = around.confined ?? around.cwd;
  return {
    call: async asked => {
      const before = snapshot(folder);
      const outside = testFolder();
      sent.length = 0;
      const piped = asked.stdin ?? null;
      const stdin = async () => (piped === null ? null : { text: piped });
      const tokens = tokensOf(asked.argv);
      const ran = await captured(() => call(shell, { ...around, tokens, tty: false, stdin }));
      return {
        ...asked,
        exit: ran.data.exit,
        out: `${ran.out}${ran.data.out}`,
        err: `${ran.err}${ran.data.err}`,
        changed: [
          ...changedIn(before, snapshot(folder)),
          ...changedIn(outside, testFolder()).map(
            name => `${name} in the working directory of the test`,
          ),
        ],
        sent: [...sent],
      };
    },
  };
}

/** @returns the path of each entry that is new, gone or different */
export const changedIn = (
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
) =>
  [...new Set([...before.keys(), ...after.keys()])].filter(
    rel => before.get(rel) !== after.get(rel),
  );
