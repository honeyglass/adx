// What one fsync costs here: a small file, and a folder. Node's fsync on macOS is fcntl(F_FULLFSYNC).
import * as fs from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, 'runs', 'fsync');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const time = (label: string, n: number, f: (i: number) => void) => {
  const ms: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    f(i);
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  console.log(`${label}: median ${ms[n >> 1]!.toFixed(2)} ms, max ${ms[n - 1]!.toFixed(2)} ms (${n} runs)`);
};
time('write 16 B, no fsync', 100, i => {
  const fd = fs.openSync(join(dir, `a${i}`), 'wx');
  fs.writeSync(fd, '# index\n- a\n- b\n');
  fs.closeSync(fd);
});
time('write 16 B + fsync of the file', 100, i => {
  const fd = fs.openSync(join(dir, `b${i}`), 'wx');
  fs.writeSync(fd, '# index\n- a\n- b\n');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
});
time('fsync of the folder', 100, () => {
  const fd = fs.openSync(dir, 'r');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
});
