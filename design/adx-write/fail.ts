// A two-file commit whose second move fails for real: just before it, the folder of the second file
// loses its write permission, so link(2) answers EACCES. Once with rollback (the recommendation),
// once without (design.md today: name what is written).
import * as fs from 'node:fs';
import { join } from 'node:path';
import { Plan, commit } from './write.ts';
import { show, fresh } from './show.ts';

const base = join(import.meta.dirname, 'runs', 'fail');

for (const rollback of [true, false]) {
  const root = fresh(base, rollback ? 'rollback' : 'no-rollback');
  console.log(`\n===== second move fails, rollback: ${rollback}`);
  const plan = new Plan(root);
  plan.update('index.md', 1 << 20, old => old + '- b\n');
  plan.write('notes/b.md', '# b\n');
  const answer = await commit(plan, {
    rollback,
    beforeRename: i => {
      if (i === 1) fs.chmodSync(join(root, 'notes'), 0o500);
    },
  });
  console.log('answer: ' + JSON.stringify(answer, null, 1).replace(/\n\s*/g, ' '));
  show(root, 'folder after the failed call (notes/ still read-only)');
  fs.chmodSync(join(root, 'notes'), 0o700);
  if (rollback) {
    const next = new Plan(root);
    next.update('index.md', 1 << 20, old => old + '- c\n');
    next.write('notes/c.md', '# c\n');
    console.log('next call: ' + JSON.stringify(await commit(next)));
    show(root, 'folder after the next call (notes/ writable again)');
  }
}
