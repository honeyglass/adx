// A tool whose handler logs with console and writes to stdout itself, as a program called twice
// in one process, so the test sees where each write of each call lands.
import process from 'node:process';
import { read, tool } from '@honeyglass/adx';

const say = read({
  does: 'talks while it answers',
  run: () => {
    console.log('a line of console.log');
    process.stdout.write('a write to stdout\n');
    return { said: true };
  },
});

const chatty = tool({ name: 'chatty', version: '0.1.0', does: 'x', commands: { say } });
await chatty.main();
await chatty.main();
