// A program not built on adx whose schema names a root that climbs out of any folder, so the kit
// that places the root must refuse the name before it copies a seed there.
import process from 'node:process';

const overview = {
  commands: [],
  shapes: [],
  roots: [{ root: '../../adx-escaped', variable: 'ESCAPED_HOME' }],
};

process.stdout.write(`${JSON.stringify({ ok: true, result: overview })}\n`);
