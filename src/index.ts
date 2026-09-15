import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'node:path';
import { registerAllTools } from './commands/build.js';
import { loadConfig, type VigorConfig } from './config.js';
import { LogStore } from './db/log.js';
import type { VigorClient } from './ssh/client.js';
import { SdkVigorClient } from './ssh/sdk-vigor-client.js';
import { ConfirmGate } from './tools/confirm-gate.js';

export function buildServer(
  config: VigorConfig = loadConfig(),
  deps: { client?: VigorClient } = {},
): {
  server: McpServer;
  client: VigorClient;
  gate: ConfirmGate;
  store: LogStore;
} {
  const client: VigorClient = deps.client ?? new SdkVigorClient(config);
  const pendingFile = path.join(path.dirname(config.logDb), 'pending-confirms.json');
  const gate = new ConfirmGate(60000, 100, pendingFile, config.approvePublicKey);
  const store = new LogStore(config.logDb);
  const server = new McpServer({ name: 'vigor3912s-mcp', version: '0.6.0' });
  registerAllTools(server, client, {
    gate,
    store,
    readOnly: config.readOnly,
    autoCommit: config.autoCommit,
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
