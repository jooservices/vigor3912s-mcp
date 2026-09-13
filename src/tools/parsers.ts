/** Lightweight parsers for verified DrayOS CLI outputs (fw 4.4.7_RC2).
 *  Parsing is best-effort: structured fields are filled when the format
 *  matches, and the raw output is always included so the AI can fall back. */

export interface WANEntry {
  bwan: string;
  offline: boolean;
  mode: string;
  upTime: string;
  ip: string;
  gwIp: string;
  txPackets: string;
  txRate: string;
  rxPackets: string;
  rxRate: string;
  primaryDns: string;
  secondaryDns: string;
}

export interface SystemInfo {
  routerModel: string;
  version: string;
  profileVersion: string;
  status: string;
  routerIp: string;
  netmask: string;
  buildDate: string;
  routerName: string;
  revision: string;
}

export interface SystemStatus {
  uptime: string;
  primaryDns: string;
  secondaryDns: string;
  ipAddress: string;
  wanLines: string[];
}

export interface RouteEntry {
  code: string;
  network: string;
  mask: string;
  via: string;
  interfaceName: string;
}

export interface ArpEntry {
  index: number;
  ip: string;
  mac: string;
  hostId: string;
  interfaceName: string;
  vlan: string;
  port: string;
}

export interface DhcpLease {
  lan: string;
  index: number;
  ip: string;
  mac: string;
  leasedTime: string;
  hostId: string;
}

export interface PingSummary {
  target: string;
  sent: number;
  received: number;
  lost: number;
  lossPercent: number;
  rtt: string;
}

export function parseSysVersion(raw: string): SystemInfo {
  const KEYS = [
    'Router Model',
    'Version',
    'Profile version',
    'Status',
    'Router IP',
    'Netmask',
    'Firmware Build Date/Time',
    'Router Name',
    'Revision',
  ];
  const get = (key: string): string => {
    const idx = raw.indexOf(`${key}:`);
    if (idx === -1) return '';
    const rest = raw.slice(idx + key.length + 1);
    let best = rest.length;
    for (const other of KEYS) {
      if (other === key) continue;
      const oi = rest.indexOf(`${other}:`);
      if (oi !== -1 && oi < best) best = oi;
    }
    return rest.slice(0, best).trim().replace(/\s{2,}/g, ' ');
  };
  return {
    routerModel: get('Router Model'),
    version: get('Version'),
    profileVersion: get('Profile version'),
    status: get('Status'),
    routerIp: get('Router IP'),
    netmask: get('Netmask'),
    buildDate: get('Firmware Build Date/Time'),
    routerName: get('Router Name'),
    revision: get('Revision'),
  };
}

export function parseShowStatus(raw: string): SystemStatus {
  const uptime = raw.match(/System Uptime:(.+)$/m)?.[1]?.trim() ?? '';
  const primaryDns =
    raw.match(/Primary DNS:(\S+)/)?.[1] ?? '';
  const secondaryDns =
    raw.match(/Secondary DNS:(\S+)/)?.[1] ?? '';
  const ipAddress = raw.match(/IP Address:(\S+)/)?.[1] ?? '';
  const wanLines = raw
    .split('\n')
    .filter((l) => /WAN \d+ Status:/.test(l))
    .map((l) => l.trim());
  return { uptime, primaryDns, secondaryDns, ipAddress, wanLines };
}

export function parseWanStatus(raw: string): WANEntry[] {
  const entries: WANEntry[] = [];
  let cur: WANEntry | null = null;
  const push = (): void => {
    if (cur) entries.push(cur);
  };
  for (const line of raw.split('\n')) {
    const bm = line.match(/^(BWAN\d+):\s*(\w+)/);
    if (bm) {
      push();
      cur = {
        bwan: bm[1]!,
        offline: bm[2]!.toLowerCase() === 'offline',
        mode: '',
        upTime: '',
        ip: '',
        gwIp: '',
        txPackets: '',
        txRate: '',
        rxPackets: '',
        rxRate: '',
        primaryDns: '',
        secondaryDns: '',
      };
      continue;
    }
    if (!cur) continue;
    const mode = line.match(/Mode:\s*([^,]+)/);
    if (mode) cur.mode = mode[1]!.trim();
    const up = line.match(/Up Time=([\d:]+)/);
    if (up) cur.upTime = up[1]!;
    const ipgw = line.match(/IP=([^,]+),\s*GW IP=([^,\s]+)/);
    if (ipgw) {
      cur.ip = ipgw[1]!.trim();
      cur.gwIp = ipgw[2]!;
    }
    const txp = line.match(/TX Packets=(\d+)/);
    if (txp) cur.txPackets = txp[1]!;
    const txr = line.match(/TX Rate\(bps\)=(\d+)/);
    if (txr) cur.txRate = txr[1]!;
    const rxp = line.match(/RX Packets=(\d+)/);
    if (rxp) cur.rxPackets = rxp[1]!;
    const rxr = line.match(/RX Rate\(bps\)=(\d+)/);
    if (rxr) cur.rxRate = rxr[1]!;
    const d1 = line.match(/Primary DNS=([\d.]+)/);
    if (d1) cur.primaryDns = d1[1]!;
    const d2 = line.match(/Secondary DNS=([\d.]+)/);
    if (d2) cur.secondaryDns = d2[1]!;
  }
  push();
  return entries;
}

export function parseRouteStatus(raw: string): RouteEntry[] {
  const entries: RouteEntry[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^([*CSRB~]+)\s+([0-9.]+)\/\s*([0-9.]+)?\s*(?:via\s+([0-9.]+)\s*,\s*(\S+)|\s+is\s+directly\s+connected,\s*(\S+))$/);
    if (m) {
      entries.push({
        code: m[1]!,
        network: m[2]!,
        mask: m[3] ?? '',
        via: m[4] ?? 'directly connected',
        interfaceName: m[5] ?? m[6] ?? '',
      });
    }
  }
  return entries;
}

export function parseArpStatus(raw: string): ArpEntry[] {
  const entries: ArpEntry[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+([0-9.]+)\s+([0-9A-F-]{14,17})\s+(\S*)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/);
    if (m) {
      entries.push({
        index: Number(m[1]!),
        ip: m[2]!,
        mac: m[3]!,
        hostId: m[4]!,
        interfaceName: m[5]!,
        vlan: m[6]!,
        port: m[7]!,
      });
    }
  }
  return entries;
}

export function parseDhcpStatus(raw: string): {
  serverStatus: Record<string, string>;
  leases: DhcpLease[];
} {
  const serverStatus: Record<string, string> = {};
  const leases: DhcpLease[] = [];
  const lines = raw.split('\n');
  let currentLan = '';
  for (const line of lines) {
    const st = line.match(/^(LAN\d+)\s*:\s*DHCP Server (On|Off)/);
    if (st) {
      currentLan = st[1]!;
      serverStatus[currentLan] = st[2]!;
      continue;
    }
    // Lease rows are tab-separated: index, ip, mac, leasedTime, hostId
    const fields = line.split('\t').map((f) => f.trim());
    if (fields.length >= 4 && /^\d+$/.test(fields[0] ?? '') && (fields[1] ?? '').includes('.')) {
      leases.push({
        lan: currentLan,
        index: Number(fields[0]),
        ip: fields[1]!,
        mac: fields[2]!,
        leasedTime: fields[3]!,
        hostId: fields[4] ?? '',
      });
    }
  }
  return { serverStatus, leases };
}

export function parsePing(raw: string, target: string): PingSummary {
  const sent = Number(raw.match(/Sent = (\d+)/)?.[1] ?? NaN);
  const received = Number(raw.match(/Received = (\d+)/)?.[1] ?? NaN);
  const lost = Number(raw.match(/Lost = (\d+)/)?.[1] ?? NaN);
  const lossPercent = Number(raw.match(/\((\d+)% loss\)/)?.[1] ?? NaN);
  const rtt = raw.match(/rtt min\/avg\/max\/mdev = ([\d./]+) ms/)?.[1] ?? '';
  return {
    target,
    sent: Number.isFinite(sent) ? sent : 0,
    received: Number.isFinite(received) ? received : 0,
    lost: Number.isFinite(lost) ? lost : 0,
    lossPercent: Number.isFinite(lossPercent) ? lossPercent : 0,
    rtt,
  };
}