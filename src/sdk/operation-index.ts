import { operations } from '@jooservices/vigor3912s-sdk/operations';

export type AnyOperation = {
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

/** Walks a nested SDK operations tree, yielding every typed operation leaf. */
export function* walkOperations(node: unknown): Generator<AnyOperation> {
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
 * Index of every SDK typed operation, keyed by `manifestId`. Used so MCP can
 * resolve a TypedOperation for any curated/generated tool without duplicating
 * DrayOS command knowledge.
 *
 * Each SDK domain module re-exports its operations both individually and via
 * an aggregated `operations` array, so the same operation object is reached
 * through more than one path in the tree — that is not a collision. Throws
 * only when two *different* operation objects share a `manifestId`, which
 * indicates a genuine SDK manifest bug.
 */
export function buildOperationIndex(root: unknown = operations): ReadonlyMap<string, AnyOperation> {
  const map = new Map<string, AnyOperation>();
  for (const op of walkOperations(root)) {
    const existing = map.get(op.manifestId);
    if (existing !== undefined && existing !== op) {
      throw new Error(`operation-index: duplicate manifestId "${op.manifestId}"`);
    }
    map.set(op.manifestId, op);
  }
  return map;
}

let cached: ReadonlyMap<string, AnyOperation> | undefined;

function index(): ReadonlyMap<string, AnyOperation> {
  cached ??= buildOperationIndex();
  return cached;
}

/** Look up a typed SDK operation by manifest id. */
export function operationFor(manifestId: string): AnyOperation | undefined {
  return index().get(manifestId);
}

/** All indexed SDK typed operations. */
export function allOperations(): readonly AnyOperation[] {
  return [...index().values()];
}

/** Test helper: reset memoized index. */
export function resetOperationIndexForTests(): void {
  cached = undefined;
}
