/**
 * Fixtures for the SDK census gate (`sdk-census.test.ts`). Kept in a
 * standalone module so every raw escape hatch has an explicit review reason.
 */

/** Implemented SDK manifestIds intentionally replaced by argument-required variants. */
export const SDK_TOOL_EXCLUSIONS: Readonly<Record<string, string>> = {
  'cli.show.traffic': 'JOODT-35: the bare form is rejected; curated show_traffic uses the typed WAN/direction form',
  'cli.show.clienttraffic': 'JOODT-35: the bare form is rejected; curated show_clienttraffic uses the typed device/interface/direction form',
};

/** Valid MCP arguments used to verify rendering matches typed SDK frames. */
export const SDK_RENDER_FIXTURES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'cli.wan.disable': { wan: 1 },
  'cli.apm.apsyslog': { apIndex: 1 },
};

/**
 * The only remaining raw tools. These commands have no faithful typed SDK
 * operation in the supported contract and remain deliberately available for
 * compatibility until the next major release.
 */
export const RAW_EXECUTE_ALLOWLIST: Readonly<Record<string, string>> = {
  local8021x_show_local_cer: 'OD-1: no supported SDK operation; preserve legacy read tool',
  service_get: 'OD-1: no supported SDK operation; preserve legacy read tool',
  show_qryrdsl_status: 'JOODT-35: exact read form verified with the live command help; no SDK typed operation exists',
  swm_tr069: 'OD-1: no supported SDK operation; preserve legacy token tool',
};
