# Vigor 3912S — Reference

Self-contained reference material for the DrayTek **Vigor 3912S** router
(DrayOS). Content is copied into this project so users do not need to consult
the workspace knowledge store.

## Original documents (PDF)

| File | What it is |
| --- | --- |
| `pdf/DrayTek_UG_Vigor3912_V1.01.pdf` | Official User's Guide (V1.01, fw V4.3.5.1, ~560 pages). Part VIII = Telnet Commands (CLI reference). |
| `pdf/Vigor3912_datasheet.pdf` | Official datasheet / specifications. |

## Knowledge articles (cleaned from DrayTek)

| File | Topic |
| --- | --- |
| `overview.md` | Product page summary — specifications, management, Linux apps |
| `drayos-cli.md` | CLI / operations: SSH connect flags, safety rules, backup, `sys commit` |
| `command-map.md` | CLI command map (~327 commands, fw V4.3.5.1) |
| `cli-telnet-kb.md` | Access the CLI via SSH / Web Console / Telnet (`?` command listing, `admin`/`admin` defaults) |
| `config-backup-kb.md` | Backup / restore configuration (CFG, encryption, partial backup) |
| `manage-from-internet-kb.md` | Manage the router from the Internet (remote management) |
| `linux-apps.md` | 3912S Linux Application Q&A — Ubuntu 22.04, armv8, Docker, `sudo -i` |
| `fast-nat.md` | Fast NAT / Fast Routing |
| `suricata.md` | Running Suricata on Vigor 3912S |

## Security

| File | Topic |
| --- | --- |
| `security/cve-2025-10547.md` | CVE-2025-10547 — HTTP CGI remote code execution |
| `security/cve-2024-41339.md` | CVE-2024-41339 — config-upload kernel module RCE |
| `security/firmware-compat.md` | Docs baseline (4.3.5.1) vs live firmware (4.4.7_RC2) and verified commands |

## Raw reference

| File | What it is |
| --- | --- |
| `cli-reference-raw.txt` | Raw extracted CLI reference (327 command headings, fw V4.3.5.1) |

> Runtime Truth: the command set is firmware-specific. Always verify a command
> against the live device (`<cmd> ?`) before scripting it.