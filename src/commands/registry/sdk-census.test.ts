import { describe, expect, it } from 'vitest';
import { inputSchemaFor } from '@jooservices/vigor3912s-sdk/schemas';
import { allOperations } from '../../sdk/operation-index.js';
import { jsonSchemaToZod } from '../../sdk/schema-to-zod.js';
import { allCommands } from './index.js';
import { RAW_EXECUTE_ALLOWLIST, SDK_TOOL_EXCLUSIONS } from './sdk-fixtures.js';

describe('SDK census gates', () => {
  it('covers every implemented SDK operation with a tool (or a reviewed exclusion)', () => {
    const boundManifestIds = new Set(
      allCommands()
        .map((c) => c.sdk?.manifestId)
        .filter((id): id is string => id !== undefined),
    );
    const uncovered = allOperations()
      .map((op) => op.manifestId)
      .filter((id) => !boundManifestIds.has(id) && !(id in SDK_TOOL_EXCLUSIONS));
    expect(uncovered, uncovered.join(', ')).toEqual([]);
    expect(SDK_TOOL_EXCLUSIONS).toEqual({});
  });

  it('every SDK_TOOL_EXCLUSIONS entry is a real implemented manifestId (no stale reasons)', () => {
    const manifestIds = new Set(allOperations().map((op) => op.manifestId));
    for (const id of Object.keys(SDK_TOOL_EXCLUSIONS)) {
      expect(manifestIds.has(id)).toBe(true);
    }
  });

  it('every tool without cmd.sdk is exactly the reviewed RAW_EXECUTE_ALLOWLIST', () => {
    const rawIds = allCommands()
      .filter((c) => !c.sdk)
      .map((c) => c.id)
      .sort();
    expect(rawIds).toEqual(Object.keys(RAW_EXECUTE_ALLOWLIST).sort());
  });

  it('read tools only bind to SDK read-classified operations', () => {
    for (const cmd of allCommands()) {
      if (!cmd.sdk || cmd.kind !== 'read') continue;
      const op = allOperations().find((o) => o.manifestId === cmd.sdk!.manifestId);
      expect(op, `no operation for ${cmd.sdk.manifestId}`).toBeDefined();
      expect(op!.classification, `${cmd.id} -> ${cmd.sdk.manifestId}`).toBe('read');
    }
  });

  it('every tool bound to a destructive SDK operation is dual-confirm', () => {
    const destructive = new Set(
      allOperations()
        .filter((op) => op.classification === 'destructive')
        .map((op) => op.manifestId),
    );
    const applied = allCommands();
    for (const cmd of applied) {
      if (!cmd.sdk || !destructive.has(cmd.sdk.manifestId)) continue;
      expect(cmd.confirm, `${cmd.id} -> ${cmd.sdk.manifestId}`).toBe('dual');
    }
  });

  describe('generated tool full-schema validation (sample coverage)', () => {
    const objectSample = { id: 'cli.apm.apsyslog', valid: { apIndex: 1 }, invalid: { apIndex: 1, bogus: true } };
    const actionOneOfSample = {
      id: 'cli.csm.appe.prof',
      valid: { action: 'view', index: 1 },
      invalid: { action: 'view', index: 1, bogus: true },
    };
    const arrayFieldSample = {
      id: 'cli.apm.profile.apply',
      valid: { profileIndex: 1, clientIndexes: [1, 2, 3, 4, 5] },
      invalid: { profileIndex: 1, clientIndexes: [1, 2, 3], bogus: true },
    };
    const otherOneOfSamples = [
      { id: 'cli.ldap.set', valid: { option: 'enable', enabled: true }, invalid: { option: 'enable', enabled: true, bogus: 1 } },
      {
        id: 'cli.mngt.certimport',
        valid: { kind: 'trusted_ca', url: 'http://example/ca.pem' },
        invalid: { kind: 'trusted_ca', url: 'http://example/ca.pem', bogus: 1 },
      },
      {
        id: 'cli.port',
        valid: { kind: 'lan', port: '1', speed: 'AN' },
        invalid: { kind: 'lan', port: '1', speed: 'AN', bogus: 1 },
      },
      { id: 'cli.vlan.sysvid', valid: { mode: 'set', value: 5 }, invalid: { mode: 'set', value: 5, bogus: 1 } },
      {
        id: 'cli.vlan.tagged',
        valid: { target: 'unlimited', state: 'on' },
        invalid: { target: 'unlimited', state: 'on', bogus: 1 },
      },
      // No common const discriminator across branches — union, not discriminatedUnion.
      { id: 'cli.switch.clear', valid: { index: 1 }, invalid: { index: 1, all: true } },
      { id: 'cli.sys.board', valid: { target: 'buttonDef', enabled: true }, invalid: { target: 'buttonDef', enabled: true, bogus: 1 } },
      // Mixed literal/object oneOf — wrapped under `input`.
      { id: 'cli.sys.autoreboot', valid: 'on', invalid: { hours: 1, bogus: 1 } },
    ];

    const objectAndOneOfSamples = [objectSample, actionOneOfSample, arrayFieldSample, ...otherOneOfSamples];

    for (const sample of objectAndOneOfSamples) {
      it(`accepts a valid sample and rejects an invalid one for ${sample.id}`, () => {
        const schema = inputSchemaFor(sample.id);
        expect(schema, `no schema for ${sample.id}`).toBeDefined();
        const { full } = jsonSchemaToZod(schema ?? null);
        expect(full.safeParse(sample.valid).success, `valid sample rejected for ${sample.id}`).toBe(true);
        expect(full.safeParse(sample.invalid).success, `invalid sample accepted for ${sample.id}`).toBe(false);
      });
    }

    it('accepts undefined and rejects any input for a void operation', () => {
      const voidOp = allOperations().find((op) => inputSchemaFor(op.manifestId) === null);
      expect(voidOp, 'no void operation found').toBeDefined();
      const { full } = jsonSchemaToZod(null);
      expect(full.safeParse(undefined).success).toBe(true);
      expect(full.safeParse({ bogus: true }).success).toBe(false);
    });
  });
});
