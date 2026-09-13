# Backup and Restore the Configuration of Vigor Router

Source: https://www.draytek.com/support/knowledge-base/3789 (DrayTek Knowledge Base, System, DrayOS Linux)

## Configuration Backup

Go to **System Maintenance >> Configuration Backup** and click "Backup". A CFG file is downloaded; file name is the model name with today's date.

## Restore Configuration

Go to **System Maintenance >> Configuration Backup**, click "Choose File", then "Restore". After upload, click "Restart" to restart the router and apply the settings.

## Encryption

The configuration file can be protected with a password ("Protect with password"). Keep the password safe — there is no way to recover the CFG if the password is missing.

## Encryption types (newer firmware)

- **None**: not encrypted.
- **Encrypt Config File**: encrypted with password; you must fill the password on restore.
- **Encode Password In Config**: only encrypts password info in the file; password recovers on restore to a Vigor router.

## Backup types

- **Backup to Local File**: download to computer.
- **Backup to Remote TFTP Server**: requires Remote Server IP.
- **Backup Selected Config**: select which configuration types to save.

## Cross-version / cross-model CFG

- CFG works between different firmware versions, but features may vary; after a major firmware upgrade a factory reset + reconfiguration is recommended.
- Newer Vigor routers support CFG from a different (older) model with restrictions. The supported model list is shown at the bottom of the Configuration Backup page.

## Auto Backup to USB storage

Vigor routers support auto backup to USB storage by period or on any configuration change.

## Partial backup

Supported features (partial backup): Bind IP to MAC, Hotspot Web Portal Profile, Static Route, Port Redirection, Open Ports, Firewall Rule, Objects Setting, Remote Dial-in User Profile, Lan to Lan Profile, Certificate Backup, Wireless LAN Access Control.