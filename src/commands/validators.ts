import { z } from 'zod';

/** IPv4 address (also used for dotted-quad netmasks in DrayOS CLI). */
export const ipv4 = z.string().ip({ version: 'v4' });

/** IPv6 address. */
export const ipv6 = z.string().ip({ version: 'v6' });

/**
 * LAN/WAN netmask as a dotted quad. Same wire shape as IPv4, rejects injection
 * payloads, and requires contiguous 1-bits (e.g. 255.255.255.0, not 255.0.255.0).
 */
export const ipv4Mask = ipv4.refine((value) => {
  const mask =
    value.split('.').reduce((result, octet) => ((result << 8) | Number(octet)) >>> 0, 0) >>> 0;
  // Contiguous 1-bits then 0-bits (unsigned 32-bit).
  return mask === 0 || ((mask | (mask - 1)) >>> 0) === 0xffffffff;
}, 'expected a contiguous IPv4 netmask');

export const wanIdx = z.number().int().min(1).max(12);
export const onOff = z.enum(['on', 'off']);
export const oneZero = z.union([z.literal(0), z.literal(1)]);

/** MAC with dash separators (DrayOS `ip bindmac`). */
export const macDash = z
  .string()
  .regex(/^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/, 'expected MAC as AA-BB-CC-DD-EE-FF');

/** MAC with colon separators (DrayOS `wol`). */
export const macColon = z
  .string()
  .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'expected MAC as AA:BB:CC:DD:EE:FF');

/**
 * Blocks control characters (incl. CR/LF/TAB) — prevents CLI line injection.
 * Allows shell metacharacters so passwords may contain `;|&\`$`.
 */
export const noControl = (max = 255) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !/[\x00-\x1f]/.test(v), {
      message: 'control characters are not allowed',
    });

/**
 * Blocks control characters AND shell metacharacters for free-form params.
 */
export const safeText = (max = 255) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((v) => !/[\x00-\x1f;|&`$]/.test(v), {
      message: 'control characters and shell metacharacters are not allowed',
    });
