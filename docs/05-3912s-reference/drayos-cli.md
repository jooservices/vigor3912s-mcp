# Vigor3912S Operations

Procedures for operating the DrayTek Vigor 3912S (DrayOS) safely. Command details: `command-map.md`. Raw reference: `cli-reference-raw.txt`.

## 0. Safety rules (mandatory)

1. **Backup CFG first** — before ANY write, download a config backup via WebUI
   (`System Maintenance >> Configuration Backup >> Backup`). CFG is **encrypted** — it cannot be edited as text; it only restores as a whole.
2. **Read-only by default.** Writes require explicit user confirm.
3. **Run `sys commit` after CLI changes** — otherwise settings may only live in SRAM and be lost on reboot.
4. **Never run**: `sys cfg default` (factory reset), `sys reboot` (unconfirmed), `mngt rmtcfg enable` (Internet exposure), `linux clean -w/-o`.
5. **Update firmware to latest stable (4.4.x)** — CVE-2025-10547 and CVE-2024-41339 are remote RCE. Keep SSH/WebUI LAN-only; do not enable "management from the Internet".
6. Some CLI writes need a reboot (e.g. `srv dhcp on`), which drops traffic — warn the user first.

## 1. Connect (SSH)

From this Mac:

```bash
ssh -c 3des-cbc admin@<LAN_IP>          # DrayTek KB syntax; legacy cipher may be needed
```

- Modern OpenSSH disables legacy algorithms by default. If the connection fails with `no matching cipher/kex`, retry with:
  `ssh -oKexAlgorithms=+diffie-hellman-group1-sha1,diffie-hellman-group14-sha1 -oHostKeyAlgorithms=+ssh-rsa -c 3des-cbc admin@<LAN_IP>`
  (verify exact flags during recon; do not trust from memory alone.)
- Default login: `admin` / `admin`. Change immediately with `sys passwd`.
- Enable the SSH server via WebUI first: `System Maintenance >> Management >> Local Services` → tick **SSH**. LAN-only.

## 2. First-time recon (read-only)

```
?                      # full command list for THIS firmware
sys version            # model + firmware version + router IP/netmask
show status            # WAN/LAN status
wan status             # per-WAN status
```

Compare the `?` output against `command-map.md` (built from V4.3.5.1). Mark verified/updated differences — never script unverified commands.

## 3. Backup & restore (WebUI)

- **Backup**: `System Maintenance >> Configuration Backup >> Backup`. Optional password protection / "Encode Password In Config".
- **Restore**: same page → `Restore`. Requires a router restart to apply.
- CFG restores **all** settings including the management password.
- Auto-backup to USB by period or on change is supported.

## 4. Common writes (with confirm)

| Task | Command sequence |
|---|---|
| Change admin password | `sys passwd <old> <new>` |
| Add port redirection | `srv nat portmap add <idx> <name> <tcp/udp> <pub_port> 0 0 <pri_ip> <pri_port> <wan_idx> 0` → `srv nat portmap view` → `sys commit` |
| Delete port redirection | `srv nat portmap del <idx>` → `sys commit` |
| Open port | `srv nat openport ...` |
| Enable DHCP server | `srv dhcp on` → `sys reboot` (drops traffic briefly) |
| WAN up/down | `wan enable WAN<n>` / `wan disable` |
| SSH port | `mngt sshport <port>` |
| Router name | `sys name <name>` |

Always verify after: `show status` / `show portmap` / `show nat`, then `sys commit`.

## 5. Linux application (Ubuntu 22.04, armv8, Docker) — on-device MCP path

- Enable: `linux setlinuxip -i <lan_ip> -c 24 -g <router_lan_ip> -p <admin_pw>` → reboot → `linux service ssh enable`.
- `linux status` to confirm.
- Recovery if Linux breaks the router: `linux clean -o` (reboot, remove apps, keep config) or factory reset / `.rst` firmware.
- Linux OS runs on 8GB eMMC; SSD is an overlay — SSD failure does not kill the router.
- Docker UI: install Portainer inside Linux.

## 6. Troubleshooting

- CLI not reachable over SSH → check SSH server enabled (WebUI), port (`mngt sshport`), LAN access (`mngt lanaccess`), brute-force protection (`mngt bfp`) may have blocked the IP.
- WAN issues → `show status`, `wan status`, `ip ping 8.8.8.8`, `wan detect`.
- Logs → `sys syslog`, `log` commands (note: verbose `log -wt` is not supported over Web Console; SSH is fine).
- Command not found / differs from map → firmware version differs; use `?` + `<cmd> ?` and update `command-map.md`.