#!/usr/bin/env node
/**
 * Fake DrayOS SSH server for CI E2E.
 *
 * Emulates the Vigor 3912S DrayOS interactive shell over SSH so the full tool
 * set (including writes) can be E2E-tested in GitHub Actions without a real
 * router. This is a SERVER that responds to canned data — it never talks to a
 * real router.
 *
 * Responses are generated from the built command registry; every received
 * command is recorded so tests can assert what was sent.
 *
 * Usage (library):
 *   const { startFakeDrayos } = await import('./fake-drayos.mjs');
 *   const fake = await startFakeDrayos({ password: 'admin' });
 *   fake.port; fake.received(); fake.close();
 *
 * Usage (standalone): VIGOR_PASSWORD=admin node tools/fake-drayos.mjs
 */
import { generateKeyPairSync } from 'node:crypto';
import ssh2 from 'ssh2';
import { readCommands, writeCommands } from '../dist/commands/registry.js';

const { Server } = ssh2;

const PROMPT = 'DrayTek> ';
const BANNER = '\r\n\r\nType ? for command help\r\n\r\n' + PROMPT;

export function buildResponseMap() {
  const map = new Map();
  for (const c of readCommands()) {
    const cli = c.render({});
    map.set(cli, `${c.id}: fake read output\nMore fake detail for ${cli}`);
  }
  for (const c of writeCommands()) {
    map.set(c.render({}), '% ok');
  }
  map.set('sys commit', '% committed');
  map.set('', BANNER);
  return map;
}

const PING_RE = /^ip ping ([0-9.]+)$/;
const TRACERT_RE = /^ip tracert ([0-9.]+)$/;
const IP6_PING_RE = /^ip6 (?:ping|tracert) ([0-9a-fA-F:]+)$/;

function respondFor(command) {
  let m;
  if ((m = command.match(PING_RE))) {
    return `Pinging ${m[1]} with 64 bytes of Data through WAN5:\nPackets: Sent = 5, Received = 5, Lost = 0 (0% loss)`;
  }
  if ((m = command.match(TRACERT_RE))) {
    return `Tracing route to ${m[1]}:\n 1 1 ms 1 ms 1 ms 192.168.1.1`;
  }
  if ((m = command.match(IP6_PING_RE))) {
    return `Pinging ${m[1]}:\nPackets: Sent = 5, Received = 5, Lost = 0 (0% loss)`;
  }
  return undefined;
}

/**
 * Start the fake server. Resolves once listening.
 * @returns {{ port: number, received: () => string[], close: () => void }}
 */
export async function startFakeDrayos(opts = {}) {
  const host = opts.host ?? '127.0.0.1';
  const port = opts.port ?? 0;
  const user = opts.user ?? 'admin';
  const password = opts.password ?? 'admin';
  const responses = opts.responses ?? buildResponseMap();
  const received = [];
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });

  const server = new Server({ hostKeys: [privateKey] }, (client) => {
    client.on('error', () => { /* connection resets are expected */ });
    client.on('authentication', (ctx) => {
      if (ctx.method === 'password' && ctx.username === user && ctx.password === password) {
        ctx.accept();
      } else {
        ctx.reject(['password']);
      }
    });
    client.on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();
        session.on('pty', (acceptPty) => acceptPty && acceptPty());
        session.on('shell', (acceptShell) => {
          const stream = acceptShell();
          let buf = '';
          stream.write(BANNER);
          stream.on('data', (data) => {
            buf += data.toString('utf8');
            // split on any CR or LF (the driver sends CR-only line endings)
            let nl;
            while ((nl = buf.search(/[\r\n]/)) !== -1) {
              const line = buf.slice(0, nl);
              buf = buf.slice(nl + 1);
              if (line === '' || line === '\x03') {
                // keep the session alive for blank / control input
                stream.write('\r\n' + PROMPT);
                continue;
              }
              received.push(line);
              const output = respondFor(line) ?? responses.get(line);
              const body = output ?? `% no fake response for: ${line}`;
              stream.write(`\r\n${line}\r\n${body}\r\n${PROMPT}`);
            }
          });
          stream.on('close', () => {});
        });
        session.on('exec', (acceptExec) => {
          // DrayOS does not support exec; reject it so drivers must use shell.
          const stream = acceptExec();
          stream.exit(1);
          stream.end();
        });
      });
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  server.on('error', () => { /* tolerate dropped sockets */ });

  return {
    port: server.address().port,
    received: () => [...received],
    close: () => new Promise((r) => server.close(() => r())),
  };
}

// Standalone mode
if (process.argv[1] && process.argv[1].endsWith('fake-drayos.mjs')) {
  const fake = await startFakeDrayos({ password: process.env.VIGOR_PASSWORD ?? 'admin' });
  console.log(`fake DrayOS listening on 127.0.0.1:${fake.port}`);
  const shutdown = async () => {
    await fake.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}