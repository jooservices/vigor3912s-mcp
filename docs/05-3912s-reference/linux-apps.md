# Vigor3912S Linux Application Feature Q&A

Source: https://www.draytek.com/support/knowledge-base/11698 (DrayTek Knowledge Base, LAN)

Vigor3912S, with 256GB M.2 SSD, supports the Linux Application function — use the router as an additional Linux computer / server.

- **Linux OS**: Ubuntu 22.04.
- **Updates**: Ubuntu native "unattended upgrade" auto-installs security patches.
- **Disabled by default**; to disable, delete the Linux IP.
- **Safety**: just setting a Linux IP without enabling services is safe. Opening telnet/ssh/web ports on the router can expose it to the Internet if credentials leak. Without gateway settings, only LAN subnet users can reach the Linux IP.
- **Missing "Application Configuration Tool" menu**: caused by `no_menu` env var. In v3912 Linux prompt:
  ```
  root@Vigor3912:~# sudo fw_printenv no_menu
  no_menu=1
  root@Vigor3912:~# sudo fw_setenv no_menu
  ```
  Then `ssh admin@<linux-ip>` shows the purple menu.
- **Root access**: full access with `sudo -i` (password = the DrayOS admin password configured in WUI).
- **Capabilities**: anything a Linux PC can do. Limit: 256GB SSD + 8GB RAM; architecture is **armv8** (some apps are x86-only).
- **Recommended app types**: Ubuntu native apps (easiest), Docker apps (good isolation, won't destroy the router), VM apps (install another linux/openwrt as VM).
- **Docker UI**: not built-in; install **Portainer** — runs well.
- **Danger**: running `sudo` commands can destroy the DrayOS router system. Recover by:
  - Reboot with "Clean Linux Application" option (if web access still available),
  - Factory reset button > 10 seconds,
  - Upgrade with `.rst` firmware.
- **Backup**: only DrayOS config is saved to the router backup file; Linux apps/data are NOT in the CFG.
- **Fresh Linux + DrayOS**: (1) reboot with "Clean Linux Application" or "Wipe Out All Data"; or (2) hold Factory Reset > 10s (2nd LED blinks) = wipe out all data. Factory reset 5–10s = default configuration only (DrayOS fresh, Linux OS kept).
- **SSD failure**: primary Linux OS runs on 8GB eMMC, separate from SSD (SSD is an overlay). If SSD fails, router + primary system keep working; only SSD-installed apps/data are lost.