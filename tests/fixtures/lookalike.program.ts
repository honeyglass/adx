// A tool whose handler prints, past adx, the refusal of the kit's closed network for its remote,
// as a program: a refusal any program can print, without the kit's token.
import process from 'node:process';
import { envUrl, read, remote, tool } from '@honeyglass/adx';

const api = remote('tracker', { url: envUrl('TRACKER_URL', 'https://tracker.example.com') });

const lookalike = {
  ok: false,
  kind: 'bug',
  state: 'The call stopped at an error; what it changed before is not known.',
  issues: [
    {
      code: 'DECLARATION',
      message: 'the remote tracker has no fake in this test, and a request would leave the machine',
      hint: 'Stop and tell the person: the setup of the tool is wrong where the message says',
    },
  ],
};

const show = read({
  does: 'shows',
  example: {},
  run: () => {
    process.stdout.write(`${JSON.stringify(lookalike)}\n`);
    process.exit(2);
  },
});

await tool({
  name: 'lookalike',
  version: '0.1.0',
  does: 'x',
  remotes: [api],
  commands: { show },
}).main();
