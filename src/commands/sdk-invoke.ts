import type { CommandSdkBinding } from './registry/types.js';

/** Default `sdk.toInput`: no-arg tool calls invoke with `undefined`, others pass args through. */
export function defaultToInput(args: Record<string, unknown>): unknown {
  return Object.keys(args).length === 0 ? undefined : args;
}

/**
 * Resolve MCP tool args into the exact typed input passed to `sdk.invoke()`:
 * `toInput` (default: `defaultToInput`) then optional `validate`.
 */
export function resolveSdkInput(sdk: CommandSdkBinding, args: Record<string, unknown>): unknown {
  const toInput = sdk.toInput ?? defaultToInput;
  const input = toInput(args);
  return sdk.validate ? sdk.validate(input) : input;
}
