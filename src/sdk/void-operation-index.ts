import { operations } from '@jooservices/vigor3912s-sdk/operations';
import { type AnyOperation, walkOperations } from './operation-index.js';

export type { AnyOperation };

/**
 * Index of SDK typed operations that accept `undefined` input and emit exactly
 * one fixed CLI frame. Used so MCP can prefer `invoke()` over raw `execute()`
 * for curated zero-arg tools without duplicating DrayOS command knowledge.
 */
export function buildVoidOperationIndex(
  root: unknown = operations,
): ReadonlyMap<string, AnyOperation> {
  const map = new Map<string, AnyOperation>();
  for (const op of walkOperations(root)) {
    try {
      const frames = op.buildFrames(undefined);
      if (frames.length !== 1) continue;
      const command = frames[0]?.command;
      if (typeof command !== 'string' || command.length === 0) continue;
      // First writer wins — avoid overwriting with duplicate frame strings.
      if (!map.has(command)) map.set(command, op);
    } catch {
      /* needs typed input */
    }
  }
  return map;
}

let cached: ReadonlyMap<string, AnyOperation> | undefined;

export function voidOperationForCommand(command: string): AnyOperation | undefined {
  cached ??= buildVoidOperationIndex();
  return cached.get(command);
}

/** Test helper: reset memoized index. */
export function resetVoidOperationIndexForTests(): void {
  cached = undefined;
}
