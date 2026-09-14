import { z } from 'zod';

/** IPv4 address (also used for dotted-quad netmasks in DrayOS CLI). */
export const ipv4 = z.string().ip({ version: 'v4' });

/** IPv6 address. */
export const ipv6 = z.string().ip({ version: 'v6' });

/**
 * LAN/WAN netmask as a dotted quad. Same wire shape as IPv4, but rejects
 * injection payloads that the old `/^255\./` regex accepted (newlines, `;`,
 * trailing CLI tokens).
 */
export const ipv4Mask = ipv4;

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
