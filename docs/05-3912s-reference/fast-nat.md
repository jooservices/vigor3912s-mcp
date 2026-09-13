# Fast NAT and Fast Routing on Vigor3912

Source: https://www.draytek.com/support/knowledge-base/11610 (DrayTek Knowledge Base, LAN)

Vigor3910/3912 support Fast NAT and Fast Routing to reduce CPU loading under heavy sessions. When enabled, specific LAN networks skip CPU inspection and go directly to the Fast NAT path.

Supported models:
- **Vigor3912S fw 4.3.5.1**
- Vigor3910 / Vigor2962 fw 4.4.3

## Setup

1. Go to **Routing >> Fast Routing / NAT**.
   - **Fast Routing**: for Routing between LAN→LAN or LAN→WAN.
   - **Fast NAT**: for NAT connections LAN→WAN. Two options:
     - **DNS packet acceleration** — DNS packets skip Firewall functions (LAN DNS Filter, URL Filter, WCF Filter).
     - **Fast Path check firewall IP Filter** — packets still checked by Firewall after acceleration, but only IP settings. Optionally log blocked DPDK packets to Syslog.
2. Fast NAT supports **White List** and **Black List**:
   - Black List: LAN subnets disallowed from Fast NAT.
   - White List: only listed LAN subnets allowed through Fast NAT.

Note: Fast NAT bypasses some firewall/content-filter inspection — consider security implications before enabling.
