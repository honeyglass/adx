import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastValueFrom } from 'rxjs';
import { network } from '@honeyglass/adx/node';
import { listen } from '../utils/server.ts';

const request = (url: string, timeout: number, limit: number) => ({
  url,
  method: 'GET',
  headers: { accept: 'application/json' },
  timeout,
  limit,
});

test('a body that stalls after its headers ends at the timeout, unreached', async t => {
  const url = await listen(t, (_, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.write('[');
  });
  const answer = await lastValueFrom(network.send(request(url, 200, 1_000)));
  assert.ok('unreached' in answer && answer.unreached instanceof Error);
  assert.equal(answer.unreached.name, 'TimeoutError');
});

test('a body past the limit of the request is not read on', async t => {
  const url = await listen(t, (_, response) => response.end('12345678901'));
  const past = await lastValueFrom(network.send(request(url, 1_000, 10)));
  const within = await lastValueFrom(network.send(request(url, 1_000, 11)));
  assert.deepEqual('body' in past ? past.body : past, { tooLarge: true });
  assert.deepEqual('body' in within ? within.body : within, { text: '12345678901' });
});

test('an answer that is no HTTP is unreached, whatever its error is named', async t => {
  const url = await listen(t, request => void request.socket.end('no http at all\r\n\r\n'));
  const answer = await lastValueFrom(network.send(request(url, 1_000, 1_000)));
  assert.ok('unreached' in answer);
});
