#!/usr/bin/env node
/**
 * Generate docs/03-reference/commands.md from the command registry.
 * Keeps the documented command table in sync with the code.
 *
 * Usage: node tools/gen-commands.mjs   (writes docs/03-reference/commands.md)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allCommands, REGISTRY } from '../dist/commands/registry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../docs/03-reference/commands.md');

const flag = (v) => (v ? 'yes' : '');
const argsOf = (c) => Object.keys(c.args).join(', ') || '-';

const rows = allCommands()
  .map(
    (c) =>
      `| \`${c.id}\` | ${c.kind} | ${c.family} | ${flag(c.dangerous)} | ${flag(c.affectsNetwork)} | ${argsOf(c)} | ${c.snapshotRead ?? '-'} | ${c.secretArgs?.join(', ') ?? '-'} | ${c.skipCommit ? 'yes' : ''} |`,
  )
  .join('\n');

const families = REGISTRY.map((f) => `- **${f.family}** — ${f.desc}`).join('\n');

const md = `# Command registry

Every command in the registry becomes an MCP tool. Generated from
\`src/commands/registry.ts\` — do not edit by hand; run
\`node tools/gen-commands.mjs\`.

**Totals:** ${allCommands().length} commands · ${allCommands().filter((c) => c.kind === 'read').length} read · ${allCommands().filter((c) => c.kind === 'write').length} write · ${REGISTRY.length} families

## Families

${families}

## Commands

| Tool | Kind | Family | Dangerous | Affects network | Args | Snapshot read | Secret args | Skip commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

### Legend

- **Kind**: \`read\` runs freely (verified view/status/display command);
  \`write\` requires the two-step confirm gate.
- **Dangerous**: requires \`acknowledge: true\` on the confirm call (can drop
  connectivity, lock out management, or reboot).
- **Affects network**: extra warning shown in the preview.
- **Args**: tool argument names (validated by zod).
- **Snapshot read**: a read tool run before/after the write to capture the
  router state in the audit log.
- **Secret args**: values redacted to \`***\` in logs.
- **Skip commit**: no auto \`sys commit\` after this write.
`;
fs.writeFileSync(out, md);
console.log(`wrote ${out} (${allCommands().length} commands)`);