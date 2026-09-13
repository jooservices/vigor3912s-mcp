import { describe, expect, it } from 'vitest';
import {
  parseArpStatus,
  parseDhcpStatus,
  parsePing,
  parseRouteStatus,
  parseShowStatus,
  parseSysVersion,
  parseWanStatus,
} from './parsers.js';

// Captured from the live device (fw 4.4.7_RC2), read-only recon.
const SYS_VERSION = `DrayTek> sys version
Router Model: Vigor3912S    Version: 4.4.7_RC2 r5704_8709_281ffe2ee1 English
Profile version: 4.0.a    Status: 1 (0x14460da8)
Router IP: 192.168.1.1    Netmask: 255.255.255.0
Firmware Build Date/Time: Jun  5 2026 13:45:10
Router Name: DrayTek
Revision: 5704_8709_281ffe2ee1 drayos2015_RD3
DrayTek> `;

const WAN_STATUS = `BWAN1: Offline, stall=N
 Mode: DHCP Client, Up Time=00:00:00
 IP=---, GW IP=---
 TX Packets=0, TX Rate(bps)=0, RX Packets=0, RX Rate(bps)=0
 Primary DNS=0.0.0.0, Secondary DNS=0.0.0.0
BWAN5: Connected, stall=N
 Mode: PPPoE, Up Time=438:27:04
 IP=115.79.25.9, GW IP=125.235.249.189
 TX Packets=1234, TX Rate(bps)=8400, RX Packets=5678, RX Rate(bps)=325272
 Primary DNS=8.8.8.8, Secondary DNS=8.8.4.4
`;

const SHOW_STATUS = `System Uptime:1724:18:16
LAN Status
Primary DNS:116.97.90.124     Secondary DNS:116.97.90.127
IP Address:192.168.1.1        Tx Rate:-1205118908    Rx Rate:-426579376
WAN 5 Status: Connected
WAN 6 Status: Connected
`;

const ROUTES = `Codes: C - connected, S - static, R - RIP, * - default, ~ - private, B - BGP
*             0.0.0.0/         0.0.0.0 via 125.235.249.189, WAN5
S          10.11.12.0/   255.255.255.0 via 206.189.211.205, VPN-1
C~       192.168.1.0/   255.255.255.0 is directly connected, LAN1
`;

const ARP = `[ARP Table]
 Index IP Address     MAC Address         HOST ID                 Interface  VLAN   Port
   1   192.168.10.200 00-0C-29-3F-4B-40                            LAN6        ---    --
   2   192.168.1.2    58-C1-7A-F1-73-01                            LAN1       VLAN0   P1
  10   192.168.1.10   74-4D-28-82-CF-CC   MikroTik                 LAN1       VLAN0   P2
`;

const DHCP = `LAN1       : DHCP Server On    IP Pool: 192.168.1.10 ~ 192.168.1.209
             Default Gateway: 192.168.1.1
---------------------------------------------------------------------------
Index	IP Address     	MAC Address      	Leased Time   	HOST ID
---------------------------------------------------------------------------
LAN1
1	192.168.1.10   	74-4D-28-82-CF-CC	FIXED IP      	MikroTik
2	192.168.1.11   	DC-A6-32-D6-27-8D	FIXED IP
LAN6
7	192.168.10.22  	00-0C-29-1E-A7-DE	40:55:14      	mcp
`;

const PING = `Pinging 8.8.8.8 with 64 bytes of Data through WAN5:
Receive reply from 8.8.8.8, time=56.0ms
Packets: Sent = 5, Received = 5, Lost = 0 (0% loss)
rtt min/avg/max/mdev = 50.5/57.3/60.1/4.6 ms
`;

describe('parseSysVersion', () => {
  it('parses fields that share physical lines', () => {
    const info = parseSysVersion(SYS_VERSION);
    expect(info.routerModel).toBe('Vigor3912S');
    expect(info.version).toBe('4.4.7_RC2 r5704_8709_281ffe2ee1 English');
    expect(info.profileVersion).toBe('4.0.a');
    expect(info.routerIp).toBe('192.168.1.1');
    expect(info.netmask).toBe('255.255.255.0');
    expect(info.buildDate).toBe('Jun 5 2026 13:45:10');
    expect(info.routerName).toBe('DrayTek');
    expect(info.revision).toContain('5704_8709_281ffe2ee1');
  });
});

describe('parseWanStatus', () => {
  it('parses multiple fields per line and offline flags', () => {
    const wan = parseWanStatus(WAN_STATUS);
    expect(wan).toHaveLength(2);
    const [offline, connected] = wan;
    expect(offline?.bwan).toBe('BWAN1');
    expect(offline?.offline).toBe(true);
    expect(offline?.mode).toBe('DHCP Client');
    expect(offline?.ip).toBe('---');
    expect(connected?.bwan).toBe('BWAN5');
    expect(connected?.offline).toBe(false);
    expect(connected?.mode).toBe('PPPoE');
    expect(connected?.ip).toBe('115.79.25.9');
    expect(connected?.gwIp).toBe('125.235.249.189');
    expect(connected?.txPackets).toBe('1234');
    expect(connected?.txRate).toBe('8400');
    expect(connected?.rxRate).toBe('325272');
    expect(connected?.primaryDns).toBe('8.8.8.8');
    expect(connected?.secondaryDns).toBe('8.8.4.4');
  });
});

describe('parseShowStatus', () => {
  it('extracts uptime, dns, ip and wan lines', () => {
    const s = parseShowStatus(SHOW_STATUS);
    expect(s.uptime).toBe('1724:18:16');
    expect(s.primaryDns).toBe('116.97.90.124');
    expect(s.secondaryDns).toBe('116.97.90.127');
    expect(s.ipAddress).toBe('192.168.1.1');
    expect(s.wanLines).toHaveLength(2);
  });
});

describe('parseRouteStatus', () => {
  it('parses default, static and connected routes', () => {
    const r = parseRouteStatus(ROUTES);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({
      code: '*',
      network: '0.0.0.0',
      via: '125.235.249.189',
      interfaceName: 'WAN5',
    });
    expect(r[1]?.code).toBe('S');
    expect(r[2]).toMatchObject({
      code: 'C~',
      network: '192.168.1.0',
      via: 'directly connected',
      interfaceName: 'LAN1',
    });
  });
});

describe('parseArpStatus', () => {
  it('parses ARP entries', () => {
    const arp = parseArpStatus(ARP);
    expect(arp).toHaveLength(3);
    expect(arp[0]).toMatchObject({ index: 1, ip: '192.168.10.200', mac: '00-0C-29-3F-4B-40' });
    expect(arp[2]).toMatchObject({ index: 10, ip: '192.168.1.10', hostId: 'MikroTik', interfaceName: 'LAN1' });
  });
});

describe('parseDhcpStatus', () => {
  it('parses server status and leases per LAN', () => {
    const d = parseDhcpStatus(DHCP);
    expect(d.serverStatus.LAN1).toBe('On');
    const leases = d.leases;
    expect(leases[0]).toMatchObject({ lan: 'LAN1', ip: '192.168.1.10', mac: '74-4D-28-82-CF-CC', leasedTime: 'FIXED IP', hostId: 'MikroTik' });
    expect(leases.some((l) => l.ip === '192.168.10.22' && l.hostId === 'mcp')).toBe(true);
  });
});

describe('parsePing', () => {
  it('parses loss summary', () => {
    const p = parsePing(PING, '8.8.8.8');
    expect(p.target).toBe('8.8.8.8');
    expect(p.sent).toBe(5);
    expect(p.received).toBe(5);
    expect(p.lost).toBe(0);
    expect(p.lossPercent).toBe(0);
    expect(p.rtt).toBe('50.5/57.3/60.1/4.6');
  });
});