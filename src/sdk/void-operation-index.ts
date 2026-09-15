import { operations } from '@jooservices/vigor3912s-sdk/operations';

type AnyOperation = {
  readonly manifestId: string;
  readonly classification: string;
  readonly buildFrames: (input: unknown) => readonly { readonly command: string }[];
  readonly parse: (exchanges: unknown) => unknown;
};

function isOperation(value: unknown): value is AnyOperation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'manifestId' in value &&
    typeof (value as AnyOperation).buildFrames === 'function' &&
    typeof (value as AnyOperation).parse === 'function'
  );
}

function* walkOperations(node: unknown): Generator<AnyOperation> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* walkOperations(item);
    return;
  }
  if (isOperation(node)) {
    yield node;
    return;
  }
  for (const value of Object.values(node)) {
    yield* walkOperations(value);
  }
}

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
