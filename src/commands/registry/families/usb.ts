import { R } from '../builders.js';
import type { FamilyDef } from '../types.js';

export const usbFamily: FamilyDef = {
    family: 'usb',
    desc: 'USB storage.',
    commands: [
      R('usb_devstat', 'usb', 'usb devstat', 'USB device status'),
      R('usb_disk', 'usb', 'usb disk', 'USB disk info'),
      R('usb_temp', 'usb', 'usb temp', 'USB temperature'),
    ],
  };
