// Prints a root as it lies on disk: every name (hidden ones too), its inode and size, and index.md.
import * as fs from 'node:fs';
import { join } from 'node:path';

export function show(root: string, title: string) {
  console.log(`--- ${title}`);
  const walk = (dir: string, prefix = '') => {
    for (const name of fs.readdirSync(dir).sort()) {
      const st = fs.lstatSync(join(dir, name));
      if (st.isDirectory()) {
        console.log(`  ${prefix}${name}/  mode ${(st.mode & 0o777).toString(8)}`);
        walk(join(dir, name), prefix + name + '/');
      } else console.log(`  ${prefix}${name}  ino ${st.ino}  ${st.size} B  links ${st.nlink}`);
    }
  };
  walk(root);
  const index = join(root, 'index.md');
  if (fs.existsSync(index))
    console.log('  index.md: ' + JSON.stringify(fs.readFileSync(index, 'utf8')));
  const journal = join(root, '.adx.journal');
  if (fs.existsSync(journal))
    console.log(
      '  .adx.journal:\n    ' + fs.readFileSync(journal, 'utf8').trim().split('\n').join('\n    '),
    );
}

export function fresh(base: string, name: string) {
  const root = join(base, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(join(root, 'notes'), { recursive: true, mode: 0o700 });
  fs.writeFileSync(join(root, 'index.md'), '# index\n- a\n', { mode: 0o600 });
  fs.writeFileSync(join(root, 'notes', 'a.md'), '# a\n', { mode: 0o600 });
  return root;
}
