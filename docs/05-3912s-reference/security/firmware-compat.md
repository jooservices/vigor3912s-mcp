# Firmware compatibility & verified commands

This project was built against a live **Vigor 3912S** router. The firmware on
the device differs from the documentation baseline, so all command mappings in
this project follow **Runtime Truth** (verified on the device), not the PDF.

## Baseline vs live firmware

| Source | Firmware | Notes |
| --- | --- | --- |
| User's Guide (`pdf/DrayTek_UG_Vigor3912_V1.01.pdf`) | `V4.3.5.1` | Command reference is from this version |
| Live device (this project) | `4.4.7_RC2` (`r5704_8709_281ffe2ee1`, Jun 5 2026) | All commands re-verified on the device |

Observed `sys version` on the live device:

```
Router Model: Vigor3912S    Version: 4.4.7_RC2 r5704_8709_281ffe2ee1 English
Profile version: 4.0.a    Status: 1 (0x14460da8)
Router IP: 192.168.1.1    Netmask: 255.255.255.0
Firmware Build Date/Time: Jun  5 2026 13:45:10
Router Name: DrayTek
Revision: 5704_8709_281ffe2ee1 drayos2015_RD3
```

## Verified behavior (DrayOS on this device)

- **SSH exec channel is NOT supported** — only an interactive shell. `ssh-copy-id`
  fails with `exec request failed on channel 0`. All automation must drive an
  interactive shell.
- **No SSH public-key auth** for the admin CLI — password auth only.
- **Prompt**: `DrayTek> ` (also `> ` / `# ` endings are handled generically).
- **Pager**: long output is paginated with
  `--- MORE --- ['q': Quit, 'Enter': New Lines, 'Space Bar': Next Page] ---`.
  The driver pages through with `Space` and bails with `q`.
- **Modern SSH algorithms work** (diffie-hellman-group14-sha256, rsa-sha2-256,
  aes128-ctr, hmac-sha2-256) — legacy cipher/KEX flags are not required on this
  firmware, unlike older DrayOS builds.
- **`sys mpage`** can disable/enable the pager, but it is a memory-only runtime
  flag (resets on reboot) and is NOT used by this project (it would be a write).

## Read commands verified on the device (108/108)

The 108 read tools in this project were executed one-by-one against the live
router (fw 4.4.7_RC2), each in a fresh SSH session, and all returned output.
Evidence is recorded in the repo's `recon-output/` (gitignored) and in
`docs/03-reference/commands.md` (the full registry, read + write).

## Bare read forms corrected on firmware 4.4.7_RC2

A read-only help probe (`<command> ?`) confirmed that several bare command
forms previously treated as successful output are incomplete or unsupported.
Router output was not retained in task logs or reports.

| Tool | Live evidence | Registry behavior |
| --- | --- | --- |
| `show_traffic` | The bare form was rejected for missing arguments. Help lists WAN, session and IP forms. | Requires the typed WAN and direction arguments; the existing session and IP tools remain available. |
| `show_clienttraffic` | The bare form was rejected for missing arguments. Help requires a device index, interface and direction. | Requires the SDK-validated device index, interface and direction arguments. |
| `sys_pollbuf` | The bare form was rejected for missing arguments. Help lists only `on` and `off`, which change state. | The bare read is marked unsupported. Separate on/off tools remain confirmation-gated writes. |
| `sys_time` | The bare form returned a help listing. Help lists explicit forms including `show`; `sys time show` returned output. | The bare form is marked unsupported; use `sys_time_show`. |
| `show_qryrdsl` | The bare form returned a help listing. Help documents `status`; `show qryrdsl status` returned output. | The bare form is marked unsupported; `show_qryrdsl_status` runs the documented read form. |

The SDK classifies its rejected exchanges as `command_rejected` with a
sanitized reason. The MCP driver preserves that classification as a tool
error, checks raw read output with the same rejection patterns, and does not
persist rejected router output.

## When firmware changes

- A firmware upgrade may change prompt, output format, or command syntax.
- Re-run verification before trusting a mapping: `?`, `<family> ?`, `<cmd> ?`,
  and the local read-only E2E suite (`npm run e2e`). Full write coverage runs
  only against the simulated DrayOS server in CI (`npm run e2e:testing`).
- Update `docs/03-reference/commands.md` (regenerate from the registry) after
  any registry change.
