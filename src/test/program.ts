/**
 * How conformance calls a tool as a real program, started from its command line.
 *
 * programCaller: the caller of a command line, such as ['node', 'bin/tracker.ts'].
 *
 * Each session is a fresh scratch folder with a home, a temp folder and a working directory.
 * Each root the tool names with a variable lies in the scratch folder too, with the seed copied
 * in, so the program never reaches the person's data. Each fake answers on a local port, and the
 * variable of its remote's address points the program there. ADX_FAKES_ONLY=1 closes the
 * program's network to the machine itself, so a remote without a fake reaches no server.
 * The roots come from `tool schema`, which the caller reads once in a bare session.
 *
 * @example const caller = await programCaller(t, ['node', 'bin/tracker.ts'], samples);
 */
import { $try, RefusalError } from '@honeyglass/utils/ts';
import type { Fake } from '../core/index.ts';
import { program, scratch, seeded, serve, snapshot } from '../node/index.ts';
import { FAKES_ONLY, fakeAnswer, heard, urlVariableOf } from '../remote/index.ts';
import { answerIn, Overview, resultOf } from './answer.schema.ts';
import { changedIn } from './caller.ts';
import type { Asked, Caller, Context, Session } from './caller.ts';
import type { Samples } from './run.ts';

type Program = { words: readonly string[]; env: Record<string, string>; seed?: string };

/**
 * @param t - the test, which closes the servers of the fakes when it ends
 * @param words - the command line that starts the tool
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a fix RefusalError for a fake whose remote has a fixed address
 */
export async function programCaller(
  t: Context,
  words: readonly string[],
  samples: Samples,
): Promise<Caller> {
  const sent: string[] = [];
  const fakes = (samples.fakes ?? []).map(made => ({ made, variable: variableOf(made) }));
  // One server after another, each closed when the test ends, so none is left listening.
  const addresses: [string, string][] = [];
  for (const { made, variable } of fakes) {
    const recorded = heard(made, route => sent.push(route));
    const server = await serve((method, path) => fakeAnswer(recorded, method, path));
    t.after(server.close);
    addresses.push([variable, server.url]);
  }
  const env = { ...samples.env, ...Object.fromEntries(addresses), [FAKES_ONLY]: '1' };
  const bare: Program = { words, env };
  const roots = await rootsOf(bare, sent);
  const run = { words, env, ...(samples.seed === undefined ? {} : { seed: samples.seed }) };
  return {
    session: work => inSession(run, roots, sent, work),
    watched:
      'the kit watches the scratch folder, which holds the home, temp and working folders of the program',
  };
}

// The address of the remote is the one value of its fake the program reads, from its variable.
// Every fake is checked before the first server starts.
function variableOf(made: Fake) {
  const variable = urlVariableOf(made.remote);
  if (variable !== undefined) return variable;
  throw new RefusalError({
    kind: 'fix',
    step: 'conformance',
    reason: 'a fake stands for a remote with a fixed address, so the program cannot reach it',
    next: 'give the remote its address with envUrl, so the kit points the program at the fake',
  });
}

// Each root with a variable, by that variable.
async function rootsOf(bare: Program, sent: string[]) {
  const called = await inSession(bare, [], sent, session => session.call({ argv: ['schema'] }));
  const overview = resultOf(answerIn(called.out).answer, Overview);
  return (overview?.roots ?? []).flatMap(({ root, variable }) =>
    variable === undefined ? [] : [{ root, variable }],
  );
}

async function inSession<T>(
  run: Program,
  roots: readonly { root: string; variable: string }[],
  sent: string[],
  work: (session: Session) => Promise<T>,
) {
  const made = scratch(undefined);
  const placed = roots.map(({ root, variable }) => ({
    variable,
    folder: `${made.folder}/roots/${root}`,
  }));
  if (placed.length > 0) made.disk.makeFolder(`${made.folder}/roots`, 0o700);
  for (const { folder } of placed) {
    if (run.seed === undefined) made.disk.makeFolder(folder, 0o700);
    else seeded(run.seed, folder);
  }
  const env = { ...run.env, ...Object.fromEntries(placed.map(p => [p.variable, p.folder])) };
  const session: Session = {
    call: async (asked: Asked) => {
      const before = snapshot(made.folder);
      sent.length = 0;
      const ran = await program(run.words, {
        argv: asked.argv,
        cwd: made.cwd,
        home: made.home,
        tmp: made.tmp,
        env,
        stdin: asked.stdin ?? null,
      });
      return {
        ...asked,
        ...ran,
        changed: changedIn(before, snapshot(made.folder)),
        sent: [...sent],
      };
    },
  };
  const { data, error } = await $try(() => work(session));
  made.remove();
  if (error !== null) throw error;
  return data;
}
