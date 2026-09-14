import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './commands/build.js';
import { loadConfig, type VigorConfig } from './config.js';
import { LogStore } from './db/log.js';
import type { VigorClient } from './ssh/client.js';
import { SshVigorClient } from './ssh/driver.js';
import { ConfirmGate } from './tools/confirm-gate.js';
import path from 'node:path';

export function buildServer(config: VigorConfig = loadConfig()): {
  server: McpServer;
  client: VigorClient;
  gate: ConfirmGate;
  store: LogStore;
} {
  // Swap SshVigorClient for an SDK-backed implementation of VigorClient here.
  const client: VigorClient = new SshVigorClient(config);
  const pendingFile = config.humanConfirm
    ? path.join(path.dirname(config.logDb), 'pending-confirms.json')
    : undefined;
  const gate = new ConfirmGate(60000, 100, pendingFile);
  const store = new LogStore(config.logDb);
  const server = new McpServer({ name: 'vigor3912s-mcp', version: '0.5.0' });
  registerAllTools(server, client, {
    gate,
    store,
    readOnly: config.readOnly,
    autoCommit: config.autoCommit,
    humanConfirm: config.humanConfirm,
    confirmPassphrase: config.confirmPassphrase,
    exposeTools: config.exposeTools,
    disabledTools: config.disabledTools,
    toolOutputLimit: config.toolOutputLimit,
  });
  return { server, client, gate, store };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const { server, client, store } = buildServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async (): Promise<void> => {
    try {
      await client.disconnect();
    } catch {
      /* ignore */
    }
    store.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

const invokedDirectly =
  process.argv[1] !== undefined && process.argv[1].endsWith('dist/index.js');

if (invokedDirectly) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`vigor3912s-mcp fatal: ${msg}\n`);
    process.exit(1);
  });
}