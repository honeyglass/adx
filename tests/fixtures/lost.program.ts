// A tool whose handlers leave an error that no await reaches, as a program. A line on stdin
// is the signal that the test has read the answer, so the late errors come after it.
import process from 'node:process';
import { read, tool } from '@honeyglass/adx';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const lost = tool({
  name: 'lost',
  version: '0.1.0',
  does: 'loses errors',
  commands: {
    // the rejection comes while the handler still waits, before the answer
    early: read({
      does: 'rejects before its answer',
      run: async () => {
        void Promise.reject(new Error('lost before the answer'));
        await pause(50);
        return { done: true };
      },
    }),
    late: read({
      does: 'rejects after its answer',
      run: () => {
        process.stdin.once('data', () => void Promise.reject(new Error('lost after the answer')));
        return { done: true };
      },
    }),
    // JSON.parse throws in a callback, so nothing catches it
    thrown: read({
      does: 'throws after its answer',
      run: () => {
        process.stdin.once('data', () => JSON.parse('{'));
        return { done: true };
      },
    }),
    // a timer that stays open keeps the process alive
    open: read({
      does: 'rejects beside an open timer',
      run: () => {
        setInterval(() => undefined, 1000);
        void Promise.reject(new Error('lost beside an open timer'));
        return { done: true };
      },
    }),
    // the same error again and again
    repeated: read({
      does: 'rejects every 10 ms',
      run: () => {
        setInterval(() => void Promise.reject(new Error('lost again')), 10);
        return { done: true };
      },
    }),
  },
});

await lost.main();
