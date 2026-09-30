import { z } from 'zod';
import { S } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const usbFamily: FamilyDef = {
  family: 'usb',
  desc: 'USB storage.',
  commands: [
    S('usb_devstat', 'usb', 'cli.usb.devstat', 'USB device status'),
    // Divergence D3: bare `usb temp` doesn't exist — the heading only
    // documents `usb temp show` / `usb temp all_data` (and a `set` write
    // sub-form the SDK deliberately narrows out). CLI reference:
    // docs/05-3912s-reference/cli-reference-raw.txt:9214-9216. SDK is
    // correct; `action` arg added to match.
    S('usb_temp', 'usb', 'cli.usb.temp', 'USB temperature', {
      args: { action: z.enum(['show', 'allData']) },
    }),
    S('usb_disk', 'usb', 'cli.usb.disk', 'USB disk info'),
  ],
};
