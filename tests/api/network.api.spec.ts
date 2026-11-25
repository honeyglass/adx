import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
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

test('an answer in gzip, deflate or br is decoded, and the limit counts the decoded bytes', async t => {
  const encoders = new Map([
    ['gzip', gzipSync],
    ['deflate', deflateSync],
    ['br', brotliCompressSync],
  ]);
  const asked: (string | undefined)[] = [];
  const url = await listen(t, (request, response) => {
    asked.push(request.headers['accept-encoding']);
    const encoding = (request.url ?? '').slice(1);
    const encode = encoders.get(encoding) ?? gzipSync;
    response.writeHead(200, { 'content-encoding': encoding });
    response.end(encode(Buffer.from(encoding === 'gzip' ? '0'.repeat(10_000) : '{"a":1}')));
  });
  for (const encoding of ['deflate', 'br']) {
    const answer = await lastValueFrom(network.send(request(`${url}/${encoding}`, 1_000, 100)));
    assert.deepEqual('body' in answer ? answer.body : answer, { text: '{"a":1}' }, encoding);
  }
  // ten thousand bytes once decoded, far fewer as sent
  const bomb = await lastValueFrom(network.send(request(`${url}/gzip`, 1_000, 100)));
  assert.deepEqual('body' in bomb ? bomb.body : bomb, { tooLarge: true });
  assert.deepEqual(asked, ['gzip, deflate, br', 'gzip, deflate, br', 'gzip, deflate, br']);
});

test('a certificate is checked even when NODE_TLS_REJECT_UNAUTHORIZED turns it off', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'adx-tls-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const [key, cert] = [join(folder, 'key.pem'), join(folder, 'cert.pem')];
  const made = spawnSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-subj',
    '/CN=127.0.0.1',
    '-keyout',
    key,
    '-out',
    cert,
  ]);
  assert.equal(made.status, 0, 'openssl made no certificate');
  let requests = 0;
  const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (_, res) => {
    requests += 1;
    res.end('{}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  const before = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  t.after(() => {
    if (before === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = before;
  });
  const answer = await lastValueFrom(
    network.send(request(`https://127.0.0.1:${port}`, 2_000, 100)),
  );
  assert.deepEqual(['unreached' in answer, requests], [true, 0]);
});
