/**
 * Fixtures for the SDK census gate (`sdk-census.test.ts`). Kept in a
 * standalone module so every raw escape hatch has an explicit review reason.
 */

/** Implemented SDK manifestIds with no MCP tool binding. */
export const SDK_TOOL_EXCLUSIONS: Readonly<Record<string, string>> = {};

/**
 * The only remaining raw tools. These commands have no faithful typed SDK
 * operation in the supported contract and remain deliberately available for
 * compatibility until the next major release.
 */
export const RAW_EXECUTE_ALLOWLIST: Readonly<Record<string, string>> = {
  local8021x_show_local_cer: 'OD-1: no supported SDK operation; preserve legacy read tool',
  service_get: 'OD-1: no supported SDK operation; preserve legacy read tool',
  swm_tr069: 'OD-1: no supported SDK operation; preserve legacy token tool',
};
