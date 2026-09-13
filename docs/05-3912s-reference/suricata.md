# Running Suricata on your Vigor3912S

Source: https://www.draytek.com/support/knowledge-base/11609 (DrayTek Knowledge Base, Security)

Suricata is an open-source threat detection software (60000+ rules, 6000+ CVE rules). Vigor3912S supports Linux Applications with Docker, so Suricata can be installed on the router itself.

## Configuration

1. Router must have Internet access.
2. **Linux Applications >> General Setup**: enter the Linux IP address, Gateway IP address, select the LAN interface, tick **Enable the Linux SSH service**. The Linux IP must be in the same LAN subnet as the router.
3. **Linux Applications >> Suricata**: tick Enable. The router downloads the Docker image; status changes `unavailable` → `running` when installed.
   - Core Base: `v3912-r1` uses Suricata 6.0.x; `v3912-r2` uses Suricata 7.0.x.
   - Suricata Core Auto Update + Rule Auto Update: daily checks (~6:30 am local time).
4. Rule setup: 4 priority levels; select by priority or classtype.
5. When a rule changes, the service reloads (stopped → loading → running, may take minutes).

## Logs

- **Linux Applications >> Log Collector**, Facility = `SURICATA`.
- Web notification: **Applications >> Smart Action** (Event Category System, Event Type Log Keyword Match, Keyword Content `.*`, Facility SURICATA, Level INFO(6), Action Web Notification).

## Blocking

7. Enable **Firewall >> DoS Defense**.
8. Enable **Diagnostics >> Data Flow Monitor**.
9. Smart Action profile to block IPs automatically:
   - Example 1: Keyword `(MALWARE | Exploit | Phishing | WORM | DOS)`, Keyword Type REGEX, Facility SURICATA, Action Block IP.
   - Example 2: `.*\[Classification:.*\]\s*\[Priority: 1\].*`.
   - First IP / Private IP → source block; Second IP / Public IP → destination block.
10. Manual block via Web Notification; check BFP table.

## Block logs

11. Log Collector, Facility `OTHERS`, keyword "block": log `smart action[7] ... result: succ` = block OK.
12. **System Maintenance >> Management >> Blocked IP List** to view/unblock.
13. Permanent block: **Firewall >> Defense Setup** IP Blacklist.