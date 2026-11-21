// One `notes add indexed` call that can stop at a chosen point of its commit.
// node child.ts <root> <line> <stopAt> <signals: handle|default>
//   stopAt: none | before-rename-0 | after-rename-0 | after-rename-1 | sleep-after-rename-0
import { Plan, commit } from './write.ts';

const [root, line, stopAt, signals] = process.argv.slice(2) as [string, string, string, string];
const block = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const stop = (point: string) => {
  if (stopAt === point) {
    process.stderr.write(`STOPPED ${point}\n`);
    block(600_000); // hold still until the parent kills us
  }
  if (stopAt === `sleep-${point}`) {
    process.stderr.write(`SLEEPING ${point}\n`);
    block(1500); // a slow commit; a signal arrives meanwhile
  }
};

let signalled = '';
if (signals === 'handle')
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const)
    process.on(s, () => {
      // Runs only when the event loop is free again: never inside the synchronous commit.
      signalled = s;
      process.stderr.write(`handler: ${s} arrived, the commit had already returned\n`);
      process.exit(128 + ({ SIGINT: 2, SIGTERM: 15, SIGHUP: 1 } as const)[s]);
    });

const plan = new Plan(root);
plan.update('index.md', 1 << 20, old => old + `- ${line}\n`);
plan.write(`notes/${line}.md`, `# ${line}\n`);
const answer = await commit(plan, {
  beforeRename: i => stop(`before-rename-${i}`),
  afterRename: i => stop(`after-rename-${i}`),
});
process.stdout.write(JSON.stringify(answer) + '\n');
await new Promise(r => setTimeout(r, 50)); // let a pending signal handler run
if (signalled) process.stderr.write(`exit after ${signalled}\n`);
